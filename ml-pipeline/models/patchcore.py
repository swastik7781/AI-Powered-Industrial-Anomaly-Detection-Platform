import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import ResNet50
from tensorflow.keras.models import Model
from sklearn.neighbors import NearestNeighbors
import cv2

class PatchCoreModel:
    """Feature-based Anomaly Detection approach utilizing a Pretrained ResNet Backbone."""
    
    def __init__(self, input_shape=(256, 256, 3), n_neighbors=1):
        self.input_shape = input_shape
        base_model = ResNet50(include_top=False, weights='imagenet', input_shape=input_shape)
        # Extract features from intermediate layers
        layer_names = ['conv2_block3_out', 'conv3_block4_out']
        outputs = [base_model.get_layer(name).output for name in layer_names]
        self.feature_extractor = Model(inputs=base_model.input, outputs=outputs)
        
        self.nn_model = NearestNeighbors(n_neighbors=n_neighbors, algorithm='ball_tree', n_jobs=-1)
        self.memory_bank = None
        self.is_fitted = False
        
    def _extract_features(self, images):
        if len(images.shape) == 3:
            images = np.expand_dims(images, axis=0)
            
        features = self.feature_extractor.predict(images, verbose=0)
        
        # Upsample smaller feature map to match larger feature map's spatial dimensions
        feature_1 = features[0] # (N, H1, W1, C1)
        feature_2 = features[1] # (N, H2, W2, C2)
        
        N, H1, W1, C1 = feature_1.shape
        feature_2_resized = tf.image.resize(feature_2, (H1, W1)).numpy()
        
        # Concatenate features along channel axis
        combined_features = np.concatenate([feature_1, feature_2_resized], axis=-1) # (N, H1, W1, C1+C2)
        
        return combined_features

    def fit(self, train_images, sample_ratio=0.1):
        print(f"Extracting features for {len(train_images)} training images...")
        all_features = self._extract_features(train_images) # (N, H, W, C)
        
        N, H, W, C = all_features.shape
        flat_features = all_features.reshape(N * H * W, C)
        
        print("Subsampling memory bank...")
        num_samples = int(flat_features.shape[0] * sample_ratio)
        indices = np.random.choice(flat_features.shape[0], num_samples, replace=False)
        self.memory_bank = flat_features[indices]
        
        print("Fitting Nearest Neighbors index. This may take a moment...")
        self.nn_model.fit(self.memory_bank)
        self.is_fitted = True
        print(f"PatchCore fitted successfully with {num_samples} nominal features.")
        
    def predict(self, test_images):
        if not self.is_fitted:
            raise ValueError("Model is not fitted yet!")
            
        features = self._extract_features(test_images)
        N, H, W, C = features.shape
        flat_features = features.reshape(N * H * W, C)
        
        distances, indices = self.nn_model.kneighbors(flat_features)
        
        # Reshape back to spatial dimensions
        anomaly_maps = distances.reshape(N, H, W)
        
        # Resize anomaly maps to original image size
        full_size_maps = np.zeros((N, self.input_shape[0], self.input_shape[1]))
        for i in range(N):
            full_size_maps[i] = cv2.resize(anomaly_maps[i], (self.input_shape[1], self.input_shape[0]), interpolation=cv2.INTER_LANCZOS4)
            
        # Optional: apply gaussian blur to smooth heatmap
        smoothed_maps = np.zeros_like(full_size_maps)
        for i in range(N):
            smoothed_maps[i] = cv2.GaussianBlur(full_size_maps[i], (15, 15), 4)
            
        # Return image-level anomaly scores (max pixel value) and pixel-level anomaly maps
        image_scores = np.max(smoothed_maps, axis=(1, 2))
        return image_scores, smoothed_maps
