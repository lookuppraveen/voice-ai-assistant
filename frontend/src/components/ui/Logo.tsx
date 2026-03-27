interface LogoProps {
  /** dark = white text for "n" + "ise" (dark backgrounds), light = black text (white backgrounds) */
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
      {/* ── "UP" orange bold ── */}
      <text
        x="0" y="36"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900"
        fontSize="32"
        fill="#F47920"
        letterSpacing="-1"
      >UP</text>

      {/* ── "n" dark ── */}
      <text
        x="52" y="36"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900"
        fontSize="32"
        fill={textColor}
        letterSpacing="-1"
      >n</text>

      {/* ── Stick figure (the "R") — orange ── */}
      {/* Head */}
      <circle cx="88" cy="5" r="4.5" fill="#F47920" />
      {/* Left arm raised */}
      <line x1="88" y1="12" x2="78" y2="5" stroke="#F47920" strokeWidth="3" strokeLinecap="round" />
      {/* Right arm raised */}
      <line x1="88" y1="12" x2="98" y2="5" stroke="#F47920" strokeWidth="3" strokeLinecap="round" />
      {/* Body */}
      <line x1="88" y1="12" x2="88" y2="26" stroke="#F47920" strokeWidth="3" strokeLinecap="round" />
      {/* Left leg */}
      <line x1="88" y1="26" x2="81" y2="36" stroke="#F47920" strokeWidth="3" strokeLinecap="round" />
      {/* Right leg */}
      <line x1="88" y1="26" x2="95" y2="36" stroke="#F47920" strokeWidth="3" strokeLinecap="round" />

      {/* ── "ise" dark ── */}
      <text
        x="100" y="36"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900"
        fontSize="32"
        fill={textColor}
        letterSpacing="-1"
      >ise</text>

      {/* ── Tagline ── */}
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
