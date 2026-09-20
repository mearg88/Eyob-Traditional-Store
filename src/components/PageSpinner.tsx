export default function PageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div className="tibeb-band tibeb-band-sm w-24 animate-pulse" aria-hidden />
        <span className="text-sm text-ink-400">Loading…</span>
      </div>
    </div>
  );
}
