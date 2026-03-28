interface LogoProps {
  /** dark = white text (dark backgrounds), light = dark text (light backgrounds) */
  theme?: 'dark' | 'light';
  className?: string;
}

export function Logo({ theme = 'light', className = '' }: LogoProps) {
  const dark = theme === 'dark';

  return (
    <img
      src="/logo.png"
      alt="UPnRise – Unlock your potential"
      className={className}
      style={dark ? {
        background: '#ffffff',
        borderRadius: '6px',
        padding: '3px 6px',
      } : undefined}
    />
  );
}
