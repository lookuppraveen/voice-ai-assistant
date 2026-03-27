interface LogoProps {
  /** dark = white text (for dark backgrounds), light = dark text (for light backgrounds) */
  theme?: 'dark' | 'light';
  className?: string;
}

export function Logo({ theme = 'light', className = '' }: LogoProps) {
  const textColor = theme === 'dark' ? '#ffffff' : '#1a1a1a';

  return (
    <svg
      viewBox="0 0 210 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* "UP" orange bold */}
      <text
        x="0" y="36"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900"
        fontSize="32"
        fill="#F47920"
        letterSpacing="-1"
      >UP</text>

      {/* "n" */}
      <text
        x="52" y="36"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900"
        fontSize="32"
        fill={textColor}
        letterSpacing="-1"
      >n</text>

      {/* Stick figure (the "R") — orange */}
      <circle cx="88" cy="5" r="4.5" fill="#F47920" />
      <line x1="88" y1="12" x2="78" y2="5" stroke="#F47920" strokeWidth="3" strokeLinecap="round" />
      <line x1="88" y1="12" x2="98" y2="5" stroke="#F47920" strokeWidth="3" strokeLinecap="round" />
      <line x1="88" y1="12" x2="88" y2="26" stroke="#F47920" strokeWidth="3" strokeLinecap="round" />
      <line x1="88" y1="26" x2="81" y2="36" stroke="#F47920" strokeWidth="3" strokeLinecap="round" />
      <line x1="88" y1="26" x2="95" y2="36" stroke="#F47920" strokeWidth="3" strokeLinecap="round" />

      {/* "ise" */}
      <text
        x="100" y="36"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900"
        fontSize="32"
        fill={textColor}
        letterSpacing="-1"
      >ise</text>

      {/* Tagline */}
      <text
        x="1" y="49"
        fontFamily="Arial, sans-serif"
        fontWeight="500"
        fontSize="10.5"
        fill="#F47920"
        letterSpacing="0.4"
      >Unlock your potential</text>
    </svg>
  );
}
