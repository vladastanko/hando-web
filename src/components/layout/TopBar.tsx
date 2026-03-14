import { useState, useRef, useEffect } from 'react';
import type { Profile } from '../../types';
import { getInitials } from '../../utils/format';

type Mode = 'find' | 'post';

interface Props {
  profile: Profile | null;
  email?: string;
  creditBalance: number;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  onCreditsClick: () => void;
  onProfileClick: () => void;
  onLogout: () => void;
}

export function TopBar({ profile, email, creditBalance, mode, onModeChange, onCreditsClick, onProfileClick, onLogout }: Props) {
  const [ddOpen, setDdOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setDdOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const displayName = profile?.full_name || email?.split('@')[0] || 'Account';
  const firstName = displayName.split(' ')[0];

  return (
    <header className="topbar">
      <div className="topbar-in">
        <div className="tb-brand" onClick={() => {}}>
          <div className="tb-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="#fff"/>
            </svg>
          </div>
          <span className="tb-name">Hando</span>
        </div>

        <div className="mode-toggle">
          <button className={`mode-btn${mode === 'find' ? ' active' : ''}`} onClick={() => onModeChange('find')}>
            Find work
          </button>
          <button className={`mode-btn${mode === 'post' ? ' active' : ''}`} onClick={() => onModeChange('post')}>
            Post work
          </button>
        </div>

        <div className="tb-right">
          <button className="cred-chip" onClick={onCreditsClick}>
            🪙 <span>{creditBalance}</span>
          </button>

          <div ref={ref} style={{ position: 'relative' }}>
            <div className="prof-chip" onClick={() => setDdOpen(v => !v)}>
              <span className="prof-name">{firstName}</span>
              <div className="prof-av">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt={displayName} />
                  : getInitials(displayName)
                }
              </div>
            </div>

            {ddOpen && (
              <div className="dd">
                <div className="dd-head">
                  <div className="dd-name">{displayName}</div>
                  <div className="dd-email">{email}</div>
                </div>
                <button className="dd-item" onClick={() => { setDdOpen(false); onProfileClick(); }}>
                  <span>👤</span> My Profile
                </button>
                <button className="dd-item" onClick={() => { setDdOpen(false); onCreditsClick(); }}>
                  <span>🪙</span> Credits & Billing
                </button>
                <div className="dd-div" />
                <button className="dd-item danger" onClick={() => { setDdOpen(false); onLogout(); }}>
                  <span>↩</span> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
