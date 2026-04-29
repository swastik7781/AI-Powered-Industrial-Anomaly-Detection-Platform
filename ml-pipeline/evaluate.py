import numpy as np
from sklearn.metrics import roc_auc_score, precision_recall_curve, f1_score, roc_curve, auc
import matplotlib.pyplot as plt
import os

def evaluate_model(y_true, y_scores, save_dir, model_name):
    """
    Evaluates anomaly detection performance.
    y_true: 1D array of ground truth labels (0 for normal, 1 for anomalous)
    y_scores: 1D array of predicted anomaly scores
    """
    os.makedirs(save_dir, exist_ok=True)
    
    # Handle edge case where there is only one class in y_true during testing with dummy data
    if len(np.unique(y_true)) < 2:
        print(f"[Warning] Only one class present in y_true. Evaluation metrics will be skipped for {model_name}.")
        return {'roc_auc': 0.0, 'best_f1': 0.0, 'best_threshold': 0.1}
        
    # ROC Curve & AUC
    fpr, tpr, roc_thresholds = roc_curve(y_true, y_scores)
    roc_auc = auc(fpr, tpr)
    
    # Precision-Recall Curve & F1
    precision, recall, pr_thresholds = precision_recall_curve(y_true, y_scores)
    
    # Calculate F1 scores across thresholds to find optimal
    epsilon = 1e-10
    f1_scores = 2 * (precision * recall) / (precision + recall + epsilon)
    best_idx = np.argmax(f1_scores)
    best_threshold = pr_thresholds[best_idx] if best_idx < len(pr_thresholds) else pr_thresholds[-1]
    best_f1 = f1_scores[best_idx]
    
    print(f"--- Evaluation: {model_name} ---")
    print(f"ROC-AUC: {roc_auc:.4f}")
    print(f"Best F1 Score: {best_f1:.4f} (at threshold {best_threshold:.4f})")
    
    # Plot ROC
    plt.figure(figsize=(10, 4))
    plt.subplot(1, 2, 1)
    plt.plot(fpr, tpr, label=f'ROC curve (area = {roc_auc:.4f})', color='darkorange')
    plt.plot([0, 1], [0, 1], 'k--')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title(f'ROC - {model_name}')
    plt.legend(loc="lower right")
    
    # Plot PR Curve
    plt.subplot(1, 2, 2)
    plt.plot(recall, precision, label=f'PR curve (Best F1 = {best_f1:.4f})', color='blue')
    plt.xlabel('Recall')
    plt.ylabel('Precision')
    plt.title(f'Precision-Recall - {model_name}')
    plt.legend(loc="lower left")
    
    plt.tight_layout()
    plt.savefig(os.path.join(save_dir, f'{model_name}_evaluation.png'))
    plt.close()
    
    return {
        'roc_auc': roc_auc,
        'best_f1': best_f1,
        'best_threshold': best_threshold
    }

def perform_ablation_study(model_train_fn, X_train, X_test, y_test, latent_sizes):
    results = {}
    for latent_size in latent_sizes:
        print(f"\nAblation mapping: Latent Size = {latent_size}")
        scores = model_train_fn(X_train, X_test, latent_size)
        metrics = evaluate_model(y_test, scores, 'results', f'Ablation_Latent_{latent_size}')
        results[latent_size] = metrics
    return results
