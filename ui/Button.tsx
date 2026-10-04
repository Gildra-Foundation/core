import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md';

/** Классы кнопки — чтобы одинаково оформлять <button> и ссылки <Link>. */
export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', extra?: string) {
  return [styles.button, styles[variant], styles[size], extra].filter(Boolean).join(' ');
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}
