export default function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12">
      <div className="relative h-8 w-8">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-surface-4 border-t-accent" />
      </div>
      <span className="animate-pulse-soft text-xs text-text-tertiary">Loading pull requests...</span>
    </div>
  );
}
