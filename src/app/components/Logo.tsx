export function LogoMark({ className, stroke = '#0071E3' }: { className?: string; stroke?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path
        d="M8,54 L24,54 L33,30 L45,74 L54,50 C56,40 65,33 74,37 C83,41 85,51 78,58 C73,63 66,61 63,55"
        fill="none"
        stroke={stroke}
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
