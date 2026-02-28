import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function AnalyticsModal({ isOpen, onClose, title, children }: AnalyticsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-[90vw] h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-blue-400 uppercase">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
