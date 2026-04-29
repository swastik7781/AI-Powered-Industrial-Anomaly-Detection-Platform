import os
import numpy as np
import tensorflow as tf
from dataset import MVTecDatasetLoader
from models.baseline import get_unet_autoencoder, mse_ssim_loss
from models.patchcore import PatchCoreModel
from evaluate import evaluate_model
import pickle
import json

def train_baseline(X_train, X_test, y_test):
    print("--- Training Baseline Deep UNet Autoencoder ---")
    model = get_unet_autoencoder((256, 256, 3))
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4), loss=mse_ssim_loss)
    
    os.makedirs('checkpoints', exist_ok=True)
    early_stopping = tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=2, restore_best_weights=True)
    
    print("Fitting authentic UNet Model...")
    model.fit(X_train, X_train, batch_size=8, epochs=5, validation_split=0.15, callbacks=[early_stopping], verbose=1)
    
    reconstructions = model.predict(X_test)
    mse = np.mean(np.square(X_test - reconstructions), axis=(1, 2, 3))
    stats = evaluate_model(y_test, mse, 'results', 'Baseline_UNet')
    return model, stats, mse

def train_patchcore(X_train, X_test, y_test):
    print("--- Training Advanced PatchCore ResNet Model ---")
    model = PatchCoreModel(input_shape=(256, 256, 3), n_neighbors=1)
    model.fit(X_train, sample_ratio=0.1)
    
    image_scores, _ = model.predict(X_test)
    stats = evaluate_model(y_test, image_scores, 'results', 'PatchCore_ResNet')
    return model, stats

def export_models(baseline, patchcore_model, winner, unet_thresh, patch_thresh):
    os.makedirs('../backend/models', exist_ok=True)
    try:
        baseline.save('../backend/models/baseline_unet.keras')
        with open('../backend/models/patchcore_memory.pkl', 'wb') as f:
            pickle.dump(patchcore_model.memory_bank, f)
            
        config = {
            "model_type": winner.lower(),
            "baseline_threshold": float(unet_thresh),
            "patchcore_threshold": float(patch_thresh)
        }
        with open('../backend/models/config.json', 'w') as f:
            json.dump(config, f, indent=4)
        print("Authentic TensorFlow Models securely exported!")
    except Exception as e:
        print(f"Failed model export: {e}")

def main():
    data_dir = './data'
    print("Initializing Native TensorFlow Deep Learning Pipeline...")
    
    loader = MVTecDatasetLoader(data_dir, target_size=(256, 256), use_cache=True)
    X_train = loader.get_train_data()
    X_test, y_test = loader.get_test_data()
    
    baseline_model, baseline_stats, _ = train_baseline(X_train, X_test, y_test)
    patchcore_model, patchcore_stats = train_patchcore(X_train, X_test, y_test)
    
    print("\n=== BENCHMARKING RESULTS ===")
    winner = "PatchCore" if patchcore_stats['best_f1'] >= baseline_stats['best_f1'] else "Baseline"
    print(f"\nWinning Architecture Selected: {winner}")
    
    export_models(baseline_model, patchcore_model, winner, baseline_stats['best_threshold'], patchcore_stats['best_threshold'])
        
if __name__ == '__main__':
    main()
