export default function Loading() {
  return (
    <div>
      <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-stone-100" />
          <div className="h-5 w-32 animate-pulse rounded bg-stone-100" />
        </div>
        <div className="h-2 w-full animate-pulse bg-stone-100" />
      </div>
      <div className="divide-y divide-stone-100">
        {Array.from({ length: 7 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <div key={i} className="flex items-center gap-3 px-4 py-4">
            <div className="h-4 w-10 animate-pulse rounded bg-stone-100" />
            <div className="h-4 flex-1 animate-pulse rounded bg-stone-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
