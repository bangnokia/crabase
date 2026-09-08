export function Crab({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path d="M12 27V17h16v10H12Z" fill="currentColor" />
      <path
        d="M8 11v9l5 4m19-13v9l-5 4M8 10l-3 3m3-3 3 3m21-3-3 3m3-3 3 3M15 27v5m10-5v5M16 13v4m8-4v4M12 26l-5 4m21-4 5 4"
        stroke="currentColor"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="17" cy="21" r="1" fill="var(--surface)" />
      <circle cx="23" cy="21" r="1" fill="var(--surface)" />
    </svg>
  );
}
