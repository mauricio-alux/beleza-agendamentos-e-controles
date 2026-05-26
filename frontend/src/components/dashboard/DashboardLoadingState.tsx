export function DashboardLoadingState() {
  return (
    <div className="grid gap-5">
      <div className="h-44 animate-pulse rounded-[1.75rem] border border-white/80 bg-white/70 shadow-soft" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-[1.35rem] border border-white/80 bg-white/75 shadow-sm" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="h-72 animate-pulse rounded-[1.5rem] border border-white/80 bg-white/75 shadow-soft" />
        <div className="h-72 animate-pulse rounded-[1.5rem] border border-white/80 bg-white/75 shadow-soft" />
      </div>
    </div>
  );
}
