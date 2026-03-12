export default function Loading() {
  return (
    <div>
      <div className="border-b border-stone-100 px-4 py-3">
        <div className="h-6 w-24 animate-pulse rounded bg-stone-100" />
      </div>
      <div className="divide-y divide-stone-100">
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <div key={i} className="flex items-center justify-between px-4 py-4">
            <div className="h-4 w-40 animate-pulse rounded bg-stone-100" />
            <div className="h-4 w-4 animate-pulse rounded bg-stone-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
