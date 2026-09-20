export const triggerRulesModal = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firebase-rules-error'));
  }
};

export const handleFirestoreError = (error: unknown, context?: string) => {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes('Missing or insufficient permissions') || errMsg.includes('permission-denied')) {
    triggerRulesModal();
  }
  console.warn(`Firestore Error [${context || 'General'}]:`, error);
};
