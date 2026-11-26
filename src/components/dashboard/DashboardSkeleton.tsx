export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading workspace">
      <div className="space-y-2.5">
        <div className="h-3 w-40 rounded-md bg-slate-200" />
        <div className="h-8 w-72 max-w-full rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded-md bg-slate-200/80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
          >
            <div className="h-10 w-10 rounded-xl bg-slate-200" />
            <div className="h-3 w-28 rounded bg-slate-200" />
            <div className="h-7 w-20 rounded-md bg-slate-200" />
            <div className="h-3 w-36 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="h-5 w-44 rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
            >
              <div className="h-9 w-9 rounded-lg bg-slate-200" />
              <div className="h-4 w-32 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="h-5 w-56 rounded bg-slate-200" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-10 w-full rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
