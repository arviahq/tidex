export function TideLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.5 5.75c1.3-1.6 2.6-1.6 3.9 0s2.6 1.6 3.9 0 2.6-1.6 3.9 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.5 10.25c1.3-1.6 2.6-1.6 3.9 0s2.6 1.6 3.9 0 2.6-1.6 3.9 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
