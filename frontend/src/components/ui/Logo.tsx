interface LogoProps {
  /** dark = white text (dark backgrounds), light = dark text (light backgrounds) */
  theme?: 'dark' | 'light';
  className?: string;
}

export function Logo({ theme = 'light', className = '' }: LogoProps) {
  const dark = theme === 'dark';
  const textColor   = dark ? '#ffffff' : '#1a1a1a';  // "UP" + "ise"
  const orangeColor = '#F47920';                      // stick figure + tagline

  return (
    <svg
      viewBox="0 0 220 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* ── "U" dark/white ── */}
      <text
        x="0" y="38"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900"
        fontSize="34"
        fill={textColor}
        letterSpacing="-1"
      >U</text>

      {/* ── "P" dark/white ── */}
      <text
        x="23" y="38"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900"
        fontSize="34"
        fill={textColor}
        letterSpacing="-1"
      >P</text>

      {/* ── "n" dark/white ── */}
      <text
        x="46" y="38"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900"
        fontSize="34"
        fill={textColor}
        letterSpacing="-1"
      >n</text>

      {/* ── Stick figure "R" — orange ── */}
      {/* Head */}
      <circle cx="90" cy="4" r="5" fill={orangeColor} />
      {/* Left arm raised */}
      <line x1="90" y1="12" x2="79" y2="4"  stroke={orangeColor} strokeWidth="3.2" strokeLinecap="round" />
      {/* Right arm raised */}
      <line x1="90" y1="12" x2="101" y2="4" stroke={orangeColor} strokeWidth="3.2" strokeLinecap="round" />
      {/* Body */}
      <line x1="90" y1="12" x2="90" y2="28" stroke={orangeColor} strokeWidth="3.2" strokeLinecap="round" />
      {/* Left leg */}
      <line x1="90" y1="28" x2="82" y2="38" stroke={orangeColor} strokeWidth="3.2" strokeLinecap="round" />
      {/* Right leg */}
      <line x1="90" y1="28" x2="98" y2="38" stroke={orangeColor} strokeWidth="3.2" strokeLinecap="round" />

      {/* ── "ise" dark/white ── */}
      <text
        x="103" y="38"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900"
        fontSize="34"
        fill={textColor}
        letterSpacing="-1"
      >ise</text>

      {/* ── Tagline — always orange ── */}
      <text
        x="1" y="51"
        fontFamily="'Arial', sans-serif"
        fontStyle="italic"
        fontWeight="500"
        fontSize="11"
        fill={orangeColor}
        letterSpacing="0.3"
      >Unlock your potential</text>
    </svg>
  );
}
