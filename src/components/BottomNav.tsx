type TabKey = 'home' | 'post' | 'my-jobs' | 'profile';

type Props = {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
};

export default function BottomNav({ activeTab, onChange }: Props) {
  return (
    <div className="bottom-nav">
      <button
        className={activeTab === 'home' ? 'active' : ''}
        onClick={() => onChange('home')}
      >
        Home
      </button>
      <button
        className={activeTab === 'post' ? 'active' : ''}
        onClick={() => onChange('post')}
      >
        Post Job
      </button>
      <button
        className={activeTab === 'my-jobs' ? 'active' : ''}
        onClick={() => onChange('my-jobs')}
      >
        My Jobs
      </button>
      <button
        className={activeTab === 'profile' ? 'active' : ''}
        onClick={() => onChange('profile')}
      >
        Profile
      </button>
    </div>
  );
}