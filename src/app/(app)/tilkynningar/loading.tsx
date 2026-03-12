export default function Loading() {
  return (
    <div>
      <div className="border-b border-stone-100 px-4 py-3">
        <div className="h-6 w-28 animate-pulse rounded bg-stone-100" />
      </div>
      <div className="divide-y divide-stone-100">
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <div key={i} className="flex items-start gap-3 px-4 py-4">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-stone-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-stone-100" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-stone-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
