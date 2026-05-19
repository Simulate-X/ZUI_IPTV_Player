export function Spinner() {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="w-16 h-16 border-4 border-bg-surface border-t-accent rounded-full animate-spin" />
    </div>
  );
}
