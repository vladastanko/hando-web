interface Props {
  value: number;
  max?: number;
  clickable?: boolean;
  onChange?: (v: number) => void;
  size?: string;
}

export function Stars({ value, max = 5, clickable, onChange, size }: Props) {
  return (
    <div className="stars" style={size ? { fontSize: size } : undefined}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`star${i < Math.round(value) ? ' on' : ''}${clickable ? ' click' : ''}`}
          onClick={() => clickable && onChange?.(i + 1)}
        >★</span>
      ))}
    </div>
  );
}
