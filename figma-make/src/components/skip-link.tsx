export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] px-4 py-2 rounded-lg"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--fg-default)',
        border: '2px solid var(--border-focus)',
      }}
    >
      Skip to main content
    </a>
  );
}
