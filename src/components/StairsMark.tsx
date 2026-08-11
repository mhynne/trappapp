/** Enkelt trappesymbol brukt som logo. */
export function StairsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 21h4v-4h4v-4h4V9h4V5h2" />
      <path d="M3 21v-4h4" opacity={0.45} />
    </svg>
  );
}
