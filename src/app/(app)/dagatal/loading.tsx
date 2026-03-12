export default function Loading() {
  return (
    <div>
      <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <div className="h-6 w-24 animate-pulse rounded bg-stone-100" />
        </div>
      </div>
      <div className="divide-y divide-stone-100">
        {Array.from({ length: 8 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-4 w-8 animate-pulse rounded bg-stone-100" />
            <div className="h-4 flex-1 animate-pulse rounded bg-stone-100" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-stone-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
