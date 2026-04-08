import { Home, Plus, Briefcase, User } from 'lucide-react';

type TabKey = 'home' | 'post' | 'my-jobs' | 'profile';

type Props = {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
};

const items: Array<{ key: TabKey; label: string; Icon: typeof Home }> = [
  { key: 'home',    label: 'Home',    Icon: Home },
  { key: 'post',    label: 'Post',    Icon: Plus },
  { key: 'my-jobs', label: 'Jobs',    Icon: Briefcase },
  { key: 'profile', label: 'Profile', Icon: User },
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
          <span className="nav-icon"><item.Icon size={20} strokeWidth={1.75} /></span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
