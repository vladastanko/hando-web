import { Check, X, Info } from 'lucide-react';
import type { Toast } from '../../hooks/useToast';

const icons = {
  success: <Check size={16} strokeWidth={1.75} />,
  error:   <X size={16} strokeWidth={1.75} />,
  info:    <Info size={16} strokeWidth={1.75} />,
} as const;

export function ToastArea({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-area">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type === 'success' ? 'ok' : t.type === 'error' ? 'err' : ''}`}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icons[t.type as keyof typeof icons] ?? icons.info}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
