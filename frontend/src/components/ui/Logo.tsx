interface LogoProps {
  /** dark = white text SVG (dark backgrounds), light = actual PNG image (light backgrounds) */
  theme?: 'dark' | 'light';
  className?: string;
}

export function Logo({ theme = 'light', className = '' }: LogoProps) {
  // Light mode — use the actual transparent-background PNG brand asset
  if (theme === 'light') {
    return (
      <img
        src="/logo.png"
        alt="UPnRise — Unlock your potential"
        className={className}
        style={{ objectFit: 'contain' }}
      />
    );
  }

  // Dark mode — SVG recreation with white "n" / "ise" text so it reads on dark backgrounds
  // (orange parts stay orange, only the originally-black text switches to white)
  return (
    <svg
      viewBox="0 0 210 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* "UP" dark in PNG → keep orange here so it pops on dark bg */}
      <text x="0" y="36"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900" fontSize="32" fill="#F47920" letterSpacing="-1"
      >UP</text>

      {/* "n" — was black in PNG, now white */}
      <text x="52" y="36"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900" fontSize="32" fill="#ffffff" letterSpacing="-1"
      >n</text>

      {/* Stick-figure "R" — orange */}
      <circle cx="88" cy="5" r="4.5" fill="#F47920" />
      <line x1="88" y1="12" x2="78" y2="5"  stroke="#F47920" strokeWidth="3" strokeLinecap="round" />
      <line x1="88" y1="12" x2="98" y2="5"  stroke="#F47920" strokeWidth="3" strokeLinecap="round" />
      <line x1="88" y1="12" x2="88" y2="26" stroke="#F47920" strokeWidth="3" strokeLinecap="round" />
      <line x1="88" y1="26" x2="81" y2="36" stroke="#F47920" strokeWidth="3" strokeLinecap="round" />
      <line x1="88" y1="26" x2="95" y2="36" stroke="#F47920" strokeWidth="3" strokeLinecap="round" />

      {/* "ise" — was black in PNG, now white */}
      <text x="100" y="36"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900" fontSize="32" fill="#ffffff" letterSpacing="-1"
      >ise</text>

      {/* Tagline — stays orange */}
      <text x="1" y="49"
        fontFamily="Arial, sans-serif"
        fontWeight="500" fontSize="10.5" fill="#F47920" letterSpacing="0.4"
      >Unlock your potential</text>
    </svg>
  );
}
