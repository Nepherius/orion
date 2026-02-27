import { X, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

type AlertVariant = 'warning' | 'error' | 'info' | 'success';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  detail?: string;
  variant?: AlertVariant;
  confirmText?: string;
}

const variantConfig = {
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-yellow-500',
    bgClass: 'bg-yellow-500/10',
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-red-500',
    bgClass: 'bg-red-500/10',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
  },
  success: {
    icon: CheckCircle,
    iconClass: 'text-green-500',
    bgClass: 'bg-green-500/10',
  },
};

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  detail,
  variant = 'info',
  confirmText = 'Got it',
}: AlertModalProps) {
  if (!isOpen) return null;

  const config = variantConfig[variant];
  const IconComponent = config.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`${config.bgClass} p-2 rounded-lg`}>
              <IconComponent className={`w-6 h-6 ${config.iconClass}`} />
            </div>
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-300 mb-4">{message}</p>

        {detail && <p className="text-sm text-gray-400 mb-6">{detail}</p>}

        <button onClick={onClose} className="btn-primary w-full">
          {confirmText}
        </button>
      </div>
    </div>
  );
}
