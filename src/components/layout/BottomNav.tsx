export type TabKey = 'home' | 'applications' | 'inbox' | 'profile';

interface Props {
  active: TabKey;
  onChange: (t: TabKey) => void;
  badges?: Partial<Record<TabKey, number>>;
}

const items = [
  { key: 'home'         as TabKey, icon: '⌂',  label: 'Discover'  },
  { key: 'applications' as TabKey, icon: '📋', label: 'My Jobs'   },
  { key: 'inbox'        as TabKey, icon: '💬', label: 'Inbox'     },
  { key: 'profile'      as TabKey, icon: '◎',  label: 'Profile'   },
];

export function BottomNav({ active, onChange, badges = {} }: Props) {
  return (
    <nav className="bnav">
      {items.map(item => {
        const count = badges[item.key] ?? 0;
        return (
          <button
            key={item.key}
            className={`nb${active === item.key ? ' active' : ''}`}
            onClick={() => onChange(item.key)}
          >
            <span className="nb-ic" style={{ position: 'relative', display: 'inline-block' }}>
              {item.icon}
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
