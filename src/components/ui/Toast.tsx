import type { Toast } from '../../hooks/useToast';

const icons: Record<string, string> = { success: '✓', error: '✕', info: 'ℹ' };

export function ToastArea({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-area">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type === 'success' ? 'ok' : t.type === 'error' ? 'err' : ''}`}>
          <span>{icons[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
