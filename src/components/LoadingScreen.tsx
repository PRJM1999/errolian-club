type LoadingScreenProps = {
  label?: string
  compact?: boolean
}

export function LoadingScreen({ label = 'Loading', compact = false }: LoadingScreenProps) {
  return (
    <div className={`flex w-full items-center justify-center ${compact ? 'min-h-0' : 'min-h-[50vh]'}`}>
      <div
        className={`flex flex-col items-center gap-4 rounded-[1.75rem] border border-white/10 bg-[rgba(19,33,27,0.92)] px-8 py-7 text-stone-100 shadow-[0_24px_60px_rgba(4,9,8,0.22)] ${
          compact ? 'min-w-[15rem]' : 'min-w-[18rem]'
        }`}
      >
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-amber-200" />
        <p className="text-sm uppercase tracking-[0.2em] text-stone-300">{label}</p>
      </div>
    </div>
  )
}
