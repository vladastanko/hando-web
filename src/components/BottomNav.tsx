type TabKey = 'home' | 'post' | 'my-jobs' | 'profile';

type Props = {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
};

const items: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'post', label: 'Post', icon: '+' },
  { key: 'my-jobs', label: 'Jobs', icon: '◫' },
  { key: 'profile', label: 'Profile', icon: '◉' },
];

export default function BottomNav({ activeTab, onChange }: Props) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {items.map((item) => (
        <button
          key={item.key}
          className={activeTab === item.key ? 'active' : ''}
          onClick={() => onChange(item.key)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
