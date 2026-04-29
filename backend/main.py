from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import cv2
import numpy as np
import uuid
import sqlite3
from datetime import datetime
from inference import ModelSingleton
from logger import logger, log_latency
from pydantic import BaseModel

app = FastAPI(title="Anomaly Detection API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_service = None

def init_db():
    conn = sqlite3.connect('history.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS inspection_logs 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  record_id TEXT, 
                  timestamp TEXT, 
                  object_class TEXT, 
                  status TEXT, 
                  confidence REAL, 
                  latency_ms REAL)''')
    conn.commit()
    conn.close()

@app.on_event("startup")
async def startup_event():
    global model_service
    logger.info_json("System_Startup")
    init_db()
    model_service = ModelSingleton() # Mandates trained model, crashes strictly otherwise.

@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "service": "anomaly_inference", "model_type": model_service.model_type}

@app.get("/api/v1/config")
async def get_config():
    return {
        "model_type": model_service.model_type,
        "threshold": model_service.threshold
    }

class ConfigUpdate(BaseModel):
    threshold: float
    model_type: str

@app.post("/api/v1/config")
async def update_config(config: ConfigUpdate):
    try:
        model_service.threshold = config.threshold
        if config.model_type != model_service.model_type:
            logger.error("Hot-swapping full model weights currently requires restart. Threshold updated.")
        return {"status": "success", "threshold": model_service.threshold}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/history")
async def get_history():
    try:
        conn = sqlite3.connect('history.db')
        c = conn.cursor()
        c.execute("SELECT record_id, timestamp, object_class, status, confidence, latency_ms FROM inspection_logs ORDER BY id DESC LIMIT 100")
        rows = c.fetchall()
        conn.close()
        results = []
        for r in rows:
            try:
                dt = datetime.fromisoformat(r[1])
                date_str = dt.strftime("%Y-%m-%d")
                time_str = dt.strftime("%H:%M:%S")
            except:
                date_str, time_str = "Unknown", "Unknown"
            
            results.append({
                "id": r[0],
                "date": date_str,
                "time": time_str,
                "type": r[2],
                "status": r[3],
                "conf": r[4],
                "lat": r[5]
            })
        return results
    except Exception as e:
        logger.error(str(e))
        return []

@app.post("/api/v1/inspect")
@log_latency
async def inspect_frame(file: UploadFile = File(...), object_class: str = 'industrial_surface', dynamic_threshold: float = None):
    if not file.content_type.startswith("image/"):
        logger.error("Invalid file type submitted.")
        raise HTTPException(status_code=400, detail="Invalid file type. Must be an image.")
        
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise ValueError("Corrupted image data")
            
        result = model_service.predict(frame, dynamic_threshold)
        logger.info_json("Inference_Success", **result)
        
        if result['anomaly']:
            record_id = '#INSP-' + str(uuid.uuid4())[:8].upper()
            conn = sqlite3.connect('history.db')
            c = conn.cursor()
            c.execute("INSERT INTO inspection_logs (record_id, timestamp, object_class, status, confidence, latency_ms) VALUES (?, ?, ?, ?, ?, ?)",
                      (record_id, datetime.now().isoformat(), object_class, "Anomaly", result['confidence'], result['latency_ms']))
            conn.commit()
            conn.close()
            
        return result
        
    except Exception as e:
        logger.error(f"Inference pipeline failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
