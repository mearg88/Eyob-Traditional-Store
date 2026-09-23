export default function PageSpinner() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center" role="status" aria-live="polite">
      <div className="tibeb-rule w-24 animate-pulse" aria-hidden />
      <span className="sr-only">Loading</span>
    </div>
  );
}
