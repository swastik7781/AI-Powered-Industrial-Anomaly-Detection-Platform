import os
import time
import pickle
import numpy as np
import cv2
import json
import tensorflow as tf
from tensorflow.keras.models import load_model, Model
from tensorflow.keras.applications import ResNet50
from sklearn.neighbors import NearestNeighbors
from logger import logger

class ModelSingleton:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
        
    def _initialize(self):
        logger.info_json("Model_Initialization_Start")
        config_path = os.path.join(os.path.dirname(__file__), 'models/config.json')
        if not os.path.exists(config_path):
            raise RuntimeError("CRITICAL ERROR: models/config.json not found. System cannot start without authentic TensorFlow weights.")
            
        with open(config_path, 'r') as f:
            config = json.load(f)
            self.model_type = config.get("model_type", "patchcore")
            self.threshold = float(config.get(f"{self.model_type}_threshold", 0.5))
            
        self.extractor = None
        self.nn = None
        self.model = None

        if self.model_type == "patchcore":
            base_model = ResNet50(include_top=False, weights='imagenet', input_shape=(256, 256, 3))
            outputs = [base_model.get_layer(name).output for name in ['conv2_block3_out', 'conv3_block4_out']]
            self.extractor = Model(inputs=base_model.input, outputs=outputs)
            
            memory_path = os.path.join(os.path.dirname(__file__), 'models/patchcore_memory.pkl')
            if not os.path.exists(memory_path):
                raise RuntimeError("CRITICAL ERROR: patchcore_memory.pkl missing. System MUST have trained weights.")
                
            with open(memory_path, 'rb') as f:
                memory_bank = pickle.load(f)
                
            self.nn = NearestNeighbors(n_neighbors=1, algorithm='ball_tree', n_jobs=-1)
            self.nn.fit(memory_bank)
        else:
            model_path = os.path.join(os.path.dirname(__file__), 'models/baseline_unet.keras')
            if not os.path.exists(model_path):
                raise RuntimeError("CRITICAL ERROR: baseline_unet.keras missing. System MUST have trained weights.")
            self.model = load_model(model_path, compile=False)
                
        logger.info_json("Model_Initialization_Complete", type=self.model_type, threshold=self.threshold)

    def extract_patchcore_features(self, images):
        features = self.extractor.predict(images, verbose=0)
        feature_1, feature_2 = features[0], features[1]
        N, H1, W1, C1 = feature_1.shape
        feature_2_resized = tf.image.resize(feature_2, (H1, W1)).numpy()
        return np.concatenate([feature_1, feature_2_resized], axis=-1)

    def predict(self, frame: np.ndarray, dynamic_threshold: float = None):
        if self.model_type == "patchcore" and self.nn is None:
            raise RuntimeError("PatchCore backend activated but weights not found in memory.")
        if self.model_type == "baseline" and self.model is None:
            raise RuntimeError("Baseline Backend activated but UNet weights missing from memory.")

        start = time.perf_counter()
        
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(rgb, (256, 256), interpolation=cv2.INTER_AREA)
        tensor = np.expand_dims(resized.astype(np.float32) / 255.0, axis=0)
        
        anomaly_score = 0.0
        heatmap = np.zeros((256, 256))
        bbox = []
        
        if self.model_type == "patchcore":
            features = self.extract_patchcore_features(tensor)
            N, H, W, C = features.shape
            flat_features = features.reshape(N * H * W, C)
            distances, _ = self.nn.kneighbors(flat_features)
            heatmap_raw = distances.reshape(H, W)
            heatmap = cv2.resize(heatmap_raw, (256, 256), interpolation=cv2.INTER_CUBIC)
            anomaly_score = float(np.max(heatmap))
            
        elif self.model_type == "baseline":
            reconstruction = self.model.predict(tensor, verbose=0)
            mse = np.square(tensor - reconstruction)[0]
            heatmap = np.mean(mse, axis=-1)
            anomaly_score = float(np.mean(heatmap))
            
        eval_thresh = dynamic_threshold if dynamic_threshold else self.threshold
        is_anomaly = anomaly_score > eval_thresh
        
        if is_anomaly:
            heat_norm = (heatmap / (np.max(heatmap) + 1e-10) * 255).astype(np.uint8)
            _, binary = cv2.threshold(heat_norm, int(np.percentile(heat_norm, 80)), 255, cv2.THRESH_BINARY)
            contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                c = max(contours, key=cv2.contourArea)
                x, y, w, h = cv2.boundingRect(c)
                orig_h, orig_w = frame.shape[:2]
                scale_x, scale_y = orig_w / 256.0, orig_h / 256.0
                bbox = [int(x * scale_x), int(y * scale_y), int(w * scale_x), int(h * scale_y)]
                
        duration = (time.perf_counter() - start) * 1000
        import math
        if is_anomaly:
            conf_val = 0.85 + 0.14 * (1.0 - math.exp(-max(0, anomaly_score - eval_thresh)))
        else:
            conf_val = 0.85 + 0.14 * (1.0 - math.exp(-max(0, eval_thresh - anomaly_score)))
        
        conf_val = min(0.995, max(0.85, conf_val))
        
        return {
            "anomaly": is_anomaly,
            "confidence": conf_val,
            "score": anomaly_score,
            "latency_ms": round(duration, 2),
            "bbox": bbox
        }
