import sys
import os
import tensorflow as tf
tf.compat.v1.logging.set_verbosity(tf.compat.v1.logging.ERROR)

sys.path.append(os.path.join(os.path.dirname(__file__), 'ml-pipeline'))

from dataset import MVTecDatasetLoader
from models.patchcore import PatchCoreModel
from evaluate import evaluate_model
import pickle

def main():
    data_dir = os.path.join(os.path.dirname(__file__), 'ml-pipeline', 'data')
    loader = MVTecDatasetLoader(data_dir, target_size=(256, 256), use_cache=True)
    X_test, y_test = loader.get_test_data()

    print("Loading PatchCore Model...")
    try:
        patchcore_model = PatchCoreModel(input_shape=(256, 256, 3), n_neighbors=1)
        with open('backend/models/patchcore_memory.pkl', 'rb') as f:
            patchcore_model.memory_bank = pickle.load(f)
        
        # Fit NN Model
        patchcore_model.nn_model.fit(patchcore_model.memory_bank)
        patchcore_model.is_fitted = True
        
        image_scores, _ = patchcore_model.predict(X_test)
        print("\nEvaluating PatchCore ResNet:")
        patchcore_stats = evaluate_model(y_test, image_scores, 'ml-pipeline/results', 'PatchCore_ResNet_rerun')
    except Exception as e:
        print("Error evaluating PatchCore:", e)

if __name__ == "__main__":
    main()
