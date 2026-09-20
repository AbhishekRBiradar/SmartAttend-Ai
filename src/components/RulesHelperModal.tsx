import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, X, ExternalLink, Key, Check } from 'lucide-react';

interface RulesHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesHelperModal: React.FC<RulesHelperModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyRules = () => {
    const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;
    navigator.clipboard.writeText(rules);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 relative overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Firestore Permission Notice
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Firebase security rules need to allow authenticated user operations
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              If you encounter permission issues when reading or writing records, ensure your Firebase Firestore Security Rules are deployed and allow authenticated access.
            </p>

            <div className="p-3 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono mb-4 overflow-x-auto relative">
              <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}</pre>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCopyRules}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Key className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard' : 'Copy Sample Rules'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
