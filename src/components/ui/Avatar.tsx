import { getInitials } from '../../utils/format';

interface Props {
  name: string;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({ name, url, size = 'md' }: Props) {
  return (
    <div className={`av av-${size}`}>
      {url ? <img src={url} alt={name} /> : getInitials(name)}
    </div>
  );
}
