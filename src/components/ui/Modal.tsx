import { type ReactNode, useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  center?: boolean;
}

export function Modal({ open, onClose, title, children, footer, center }: Props) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={`ov${center ? ' center' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`sheet${center ? ' ctr' : ''}`}>
        {!center && <div className="sh-drag" />}
        {title && (
          <div className="sh-hdr">
            <span className="sh-ttl">{title}</span>
            <button className="sh-close" onClick={onClose}>✕</button>
          </div>
        )}
        <div className="sh-body">{children}</div>
        {footer && <div className="sh-foot">{footer}</div>}
      </div>
    </div>
  );
}
