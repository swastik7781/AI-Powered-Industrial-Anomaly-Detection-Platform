import os
import cv2
import numpy as np
import tensorflow as tf
from glob import glob
from tqdm import tqdm

class MVTecDatasetLoader:
    def __init__(self, data_path, category='all', target_size=(256, 256), use_cache=True):
        self.data_path = data_path
        self.target_size = target_size
        self.category = category
        self.use_cache = use_cache

    def _load_images_from_list(self, directories):
        images = []
        for directory in directories:
            if not os.path.exists(directory):
                continue
            img_paths = glob(os.path.join(directory, '*.png'))
            for path in tqdm(img_paths, desc=f"Loading {os.path.basename(os.path.dirname(os.path.dirname(directory)))} images"):
                img = cv2.imread(path)
                if img is not None:
                    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    if self.target_size:
                        img = cv2.resize(img, self.target_size, interpolation=cv2.INTER_LANCZOS4)
                    images.append(img)
        return np.array(images, dtype=np.float32) / 255.0

    def get_train_data(self):
        train_dirs = []
        if self.category == 'all':
            for cat in os.listdir(self.data_path):
                td = os.path.join(self.data_path, cat, 'train', 'good')
                if os.path.isdir(td): train_dirs.append(td)
        else:
            train_dirs = [os.path.join(self.data_path, self.category, 'train', 'good')]
            
        if not train_dirs:
            raise FileNotFoundError("CRITICAL: Authentic MVTecAD datasets missing.")
            
        return self._load_images_from_list(train_dirs)
        
    def get_test_data(self):
        X_test, y_test = [], []
        test_base_dirs = []
        if self.category == 'all':
            for cat in os.listdir(self.data_path):
                td = os.path.join(self.data_path, cat, 'test')
                if os.path.isdir(td): test_base_dirs.append(td)
        else:
            td = os.path.join(self.data_path, self.category, 'test')
            if os.path.isdir(td): test_base_dirs.append(td)
            
        for test_dir in test_base_dirs:
            if not os.path.exists(test_dir): continue
            subdirs = [d for d in os.listdir(test_dir) if os.path.isdir(os.path.join(test_dir, d))]
            for subdir in subdirs:
                subdir_path = os.path.join(test_dir, subdir)
                is_anomaly = 1 if subdir != 'good' else 0
                img_paths = glob(os.path.join(subdir_path, '*.png'))
                for path in img_paths:
                    img = cv2.imread(path)
                    if img is not None:
                        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                        if self.target_size:
                            img = cv2.resize(img, self.target_size, interpolation=cv2.INTER_LANCZOS4)
                        X_test.append(img)
                        y_test.append(is_anomaly)
                        
        return np.array(X_test, dtype=np.float32) / 255.0, np.array(y_test, dtype=np.int32)
