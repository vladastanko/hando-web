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

// Handoo icon — H shape with gradient
function HandooIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.85)" stopOpacity="1" />
        </linearGradient>
      </defs>
      <g fill="url(#hg)">
        <rect x="96" y="96" width="96" height="320" rx="24"/>
        <rect x="320" y="96" width="96" height="320" rx="24"/>
        <rect x="192" y="208" width="128" height="96" rx="24"/>
      </g>
    </svg>
  );
}

export function TopBar({ profile, email, creditBalance, mode, onModeChange, onCreditsClick, onProfileClick, onLogout }: Props) {
  const [ddOpen, setDdOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setDdOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const displayName = profile?.full_name || email?.split('@')[0] || 'Account';
  const firstName = displayName.split(' ')[0];

  return (
    <header className="topbar">
      <div className="topbar-in">

        {/* Brand */}
        <a className="tb-brand" href="#" onClick={e => e.preventDefault()}>
          <div className="tb-logo">
            <HandooIcon size={20} />
          </div>
          <span className="tb-name">Handoo</span>
        </a>

        {/* Mode toggle */}
        <div className="mode-toggle">
          <button className={`mode-btn${mode === 'find' ? ' active' : ''}`} onClick={() => onModeChange('find')}>
            Find work
          </button>
          <button className={`mode-btn${mode === 'post' ? ' active' : ''}`} onClick={() => onModeChange('post')}>
            Post work
          </button>
        </div>

        {/* Right actions */}
        <div className="tb-right">
          <button className="cred-chip" onClick={onCreditsClick} title="Buy credits">
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
