import { cva, type VariantProps } from 'class-variance-authority';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';

const buttonVariants = cva(
  'inline-flex items-center justify-center transition-all rounded focus:outline-none',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-text',
        secondary: 'bg-bg-surface text-text-primary',
        ghost: 'bg-transparent text-text-primary',
      },
      size: {
        sm: 'h-10 px-4 text-small',
        md: 'h-14 px-6 text-body',
        lg: 'h-16 px-8 text-h2',
      },
      focused: {
        true: 'outline outline-3 outline-accent outline-offset-2',
        false: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md', focused: false },
  }
);

type Props = VariantProps<typeof buttonVariants> & {
  focusKey?: string;
  onEnterPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function FocusableButton({ focusKey, onEnterPress, disabled, children, className, variant, size }: Props) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: disabled ? undefined : onEnterPress,
  });

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      disabled={disabled}
      className={buttonVariants({ variant, size, focused, className })}
      onClick={disabled ? undefined : onEnterPress}
    >
      {children}
    </button>
  );
}
