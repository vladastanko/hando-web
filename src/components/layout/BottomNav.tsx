import { Home, ClipboardList, MessageCircle, User } from 'lucide-react';

export type TabKey = 'home' | 'applications' | 'inbox' | 'profile';

interface Props {
  active: TabKey;
  onChange: (t: TabKey) => void;
  badges?: Partial<Record<TabKey, number>>;
}

const items: { key: TabKey; Icon: typeof Home; label: string }[] = [
  { key: 'home',         Icon: Home,          label: 'Discover'  },
  { key: 'applications', Icon: ClipboardList, label: 'My Jobs'   },
  { key: 'inbox',        Icon: MessageCircle, label: 'Inbox'     },
  { key: 'profile',      Icon: User,          label: 'Profile'   },
];

export function BottomNav({ active, onChange, badges = {} }: Props) {
  return (
    <nav className="bnav">
      {items.map(item => {
        const count = badges[item.key] ?? 0;
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            className={`nb${isActive ? ' active' : ''}`}
            onClick={() => onChange(item.key)}
          >
            <span className="nb-ic" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <item.Icon
                size={20}
                strokeWidth={1.75}
                color={isActive ? 'var(--brand)' : undefined}
              />
              {count > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -8,
                  background: '#ef4444', color: '#fff',
                  borderRadius: 99, fontSize: '.5rem', fontWeight: 900,
                  padding: '1px 4px', minWidth: 14, textAlign: 'center',
                  lineHeight: '14px', border: '1.5px solid var(--bg)',
                  pointerEvents: 'none',
                }}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </span>
            <span className="nb-lb">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
