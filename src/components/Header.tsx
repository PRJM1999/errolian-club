'use client'

import { useState } from 'react'

type NavKey = 'home' | 'calendar' | 'events' | 'treasury'

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
  { key: 'events', label: 'Events' },
  { key: 'treasury', label: 'Treasury' },
]

export function Header({
  isSignedIn,
  activePage = 'home',
  memberName,
  role,
  onNavigate,
  onSignOut,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleNavigate = (page: NavKey) => {
    onNavigate?.(page)
    setMenuOpen(false)
  }

  return (
    <header className="border-b border-white/10 bg-[#101b16]/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-5 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              alt=""
              className="size-12 shrink-0 rounded-full opacity-90 sm:size-14"
              src="/brand/icon-192.png"
            />
            <div className="flex flex-col">
              <span className="text-[0.68rem] uppercase tracking-[0.28em] text-[#d6bd77]">
                Est. 2025
              </span>
              <span className="text-2xl tracking-[-0.04em] text-stone-50 sm:text-3xl">
                Errolian Club
              </span>
            </div>
          </div>

          {isSignedIn ? (
            <button
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-200 transition hover:bg-white/10 lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <span className="flex flex-col gap-1.5">
                <span className="h-0.5 w-5 rounded-full bg-current" />
                <span className="h-0.5 w-5 rounded-full bg-current" />
                <span className="h-0.5 w-5 rounded-full bg-current" />
              </span>
            </button>
          ) : null}
        </div>

        {isSignedIn ? (
          <>
            <div className="hidden items-center justify-between gap-4 lg:flex">
              <nav className="flex gap-2">
                {links.map((link) => {
                  const isActive = activePage === link.key

                  return (
                    <button
                      key={link.key}
                      className={`rounded-full px-4 py-2 text-sm tracking-[0.08em] transition ${
                        isActive
                          ? 'bg-[#d6bd77] text-[#101b16]'
                          : 'border border-white/10 bg-white/5 text-stone-200 hover:bg-white/10'
                      }`}
                      onClick={() => handleNavigate(link.key)}
                      type="button"
                    >
                      {link.label}
                    </button>
                  )
                })}
              </nav>

              <AccountPill memberName={memberName} role={role} onSignOut={onSignOut} />
            </div>

            {menuOpen ? (
              <div className="flex flex-col gap-3 lg:hidden">
                <nav className="grid gap-2">
                  {links.map((link) => {
                    const isActive = activePage === link.key

                    return (
                      <button
                        key={link.key}
                        className={`w-full rounded-2xl px-4 py-3 text-left text-sm tracking-[0.08em] transition ${
                          isActive
                            ? 'bg-[#d6bd77] text-[#101b16]'
                            : 'border border-white/10 bg-white/5 text-stone-200 hover:bg-white/10'
                        }`}
                        onClick={() => handleNavigate(link.key)}
                        type="button"
                      >
                        {link.label}
                      </button>
                    )
                  })}
                </nav>

                <AccountPill memberName={memberName} role={role} onSignOut={onSignOut} />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </header>
  )
}

function AccountPill({
  memberName,
  role,
  onSignOut,
}: {
  memberName?: string
  role?: string | null
  onSignOut?: () => Promise<void>
}) {
  return (
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
  )
}
