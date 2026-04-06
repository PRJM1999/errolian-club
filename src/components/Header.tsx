type NavKey = 'home' | 'calendar' | 'expenses'

type HeaderProps = {
  isSignedIn: boolean
  activePage?: NavKey
  memberName?: string
  role?: string | null
  onNavigate?: (page: NavKey) => void
  onSignOut?: () => Promise<void>
}

const links: Array<{ key: NavKey; label: string }> = [
  { key: 'home', label: 'Home' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'expenses', label: 'Expenses' },
]

export function Header({
  isSignedIn,
  activePage = 'home',
  memberName,
  role,
  onNavigate,
  onSignOut,
}: HeaderProps) {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col">
          <span className="text-[0.7rem] uppercase tracking-[0.28em] text-amber-200/70">
            Private Members Club
          </span>
          <span className="text-2xl tracking-[-0.04em] text-stone-50 sm:text-3xl">
            Errolian Club
          </span>
        </div>

        {isSignedIn ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <nav className="flex flex-wrap gap-2">
              {links.map((link) => {
                const isActive = activePage === link.key

                return (
                  <button
                    key={link.key}
                    className={`rounded-full px-4 py-2 text-sm tracking-[0.08em] transition ${
                      isActive
                        ? 'bg-amber-200 text-[#13211b]'
                        : 'border border-white/10 bg-white/5 text-stone-200 hover:bg-white/10'
                    }`}
                    onClick={() => onNavigate?.(link.key)}
                    type="button"
                  >
                    {link.label}
                  </button>
                )
              })}
            </nav>

            <div className="flex items-center justify-between gap-4 rounded-full border border-white/10 bg-white/5 px-4 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-stone-100">{memberName || 'Member'}</p>
                <p className="truncate text-[0.68rem] uppercase tracking-[0.18em] text-stone-400">
                  {role || 'Member'}
                </p>
              </div>
              <button
                className="rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-stone-300 transition hover:bg-white/10"
                onClick={onSignOut}
                type="button"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  )
}
