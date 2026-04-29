import sqlite3
import uuid
from datetime import datetime, timedelta
import random
import os

def seed_db():
    db_path = os.path.join(os.path.dirname(__file__), 'history.db')
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS inspection_logs 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  record_id TEXT, 
                  timestamp TEXT, 
                  object_class TEXT, 
                  status TEXT, 
                  confidence REAL, 
                  latency_ms REAL)''')
    
    # Clear existing data so we populate fresh realistic data
    c.execute("DELETE FROM inspection_logs")
    count = 0
    
    if count < 10:
        print("Seeding database with random realistic initial data...")
        classes = ['bottle', 'cable', 'leather', 'metal_nut', 'transistor', 'wood']
        statuses = ['Nominal', 'Anomaly']
        
        now = datetime.now()
        
        for i in range(25):
            record_id = '#INSP-' + str(uuid.uuid4())[:8].upper()
            time_offset = timedelta(minutes=random.randint(1, 300))
            record_time = (now - time_offset).isoformat()
            
            obj_class = random.choice(classes)
            status = random.choices(statuses, weights=[0.8, 0.2])[0]
            
            # Realistic confidences between 0.85 and 0.99
            conf = random.uniform(0.85, 0.995)
            
            # Realistic latencies
            latency = random.uniform(25.0, 150.0)
            
            c.execute("INSERT INTO inspection_logs (record_id, timestamp, object_class, status, confidence, latency_ms) VALUES (?, ?, ?, ?, ?, ?)",
                      (record_id, record_time, obj_class, status, conf, latency))
            
        conn.commit()
        print("Database seeded!")
    else:
        print("Database already has data.")
        
    conn.close()

if __name__ == '__main__':
    seed_db()
