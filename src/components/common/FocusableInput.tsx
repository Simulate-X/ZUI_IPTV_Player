import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';

type Props = {
  focusKey?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  type?: 'url' | 'text' | 'password' | 'number';
};

export function FocusableInput({ focusKey, value, onChange, placeholder, className, disabled, type = 'url' }: Props) {
  const { ref, focused } = useFocusable({ focusKey });

  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={[
        'w-full bg-bg-elevated text-text-primary text-body px-6 py-4 rounded',
        'border border-border-DEFAULT placeholder:text-text-tertiary',
        focused ? 'outline outline-3 outline-accent outline-offset-2' : 'outline-none',
        className ?? '',
      ].join(' ')}
    />
  );
}
