export type TabKey = 'home' | 'applications' | 'inbox' | 'profile';

interface Props {
  active: TabKey;
  onChange: (t: TabKey) => void;
}

const items = [
  { key: 'home' as TabKey,         icon: '⌂',  label: 'Discover' },
  { key: 'applications' as TabKey, icon: '📋', label: 'My Jobs' },
  { key: 'inbox' as TabKey,        icon: '💬', label: 'Inbox' },
  { key: 'profile' as TabKey,      icon: '◎',  label: 'Profile' },
];

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bnav">
      {items.map(item => (
        <button
          key={item.key}
          className={`nb${active === item.key ? ' active' : ''}`}
          onClick={() => onChange(item.key)}
        >
          <span className="nb-ic">{item.icon}</span>
          <span className="nb-lb">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
