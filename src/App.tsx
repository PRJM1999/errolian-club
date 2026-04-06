import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AccessPanel } from './components/AccessPanel'
import { CalendarPage } from './components/CalendarPage'
import { ExpensesPage } from './components/ExpensesPage'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { HomePage } from './components/HomePage'
import { LoadingScreen } from './components/LoadingScreen'
import { supabase } from './lib/supabase'

type AccessState = 'loading' | 'signed_out' | 'checking' | 'approved' | 'denied' | 'error'
type NavKey = 'home' | 'calendar' | 'expenses'

type Member = {
  id: number | string
  first_name: string | null
  last_name: string | null
  role: string | null
}

const pathToPage = (pathname: string): NavKey => {
  if (pathname === '/calendar') return 'calendar'
  if (pathname === '/expenses') return 'expenses'
  return 'home'
}

const pageToPath = (page: NavKey) => {
  if (page === 'calendar') return '/calendar'
  if (page === 'expenses') return '/expenses'
  return '/'
}

export default function App() {
  const [accessState, setAccessState] = useState<AccessState>('loading')
  const [member, setMember] = useState<Member | null>(null)
  const [email, setEmail] = useState('')
  const [activePage, setActivePage] = useState<NavKey>(() => pathToPage(window.location.pathname))

  useEffect(() => {
    const onPopState = () => {
      setActivePage(pathToPage(window.location.pathname))
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!supabase) {
      setAccessState('error')
      return
    }

    const client = supabase

    const syncAccess = async (session: Session | null) => {
      if (!session?.user.email) {
        setMember(null)
        setEmail('')
        setActivePage(pathToPage(window.location.pathname))
        setAccessState('signed_out')
        return
      }

      const userEmail = session.user.email.toLowerCase()
      setEmail(userEmail)
      setAccessState('checking')

      const { data, error } = await client
        .from('users')
        .select('id, first_name, last_name, role')
        .eq('email', userEmail)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        setAccessState('error')
        return
      }

      if (!data) {
        setMember(null)
        setAccessState('denied')
        return
      }

      setMember(data)
      setAccessState('approved')
    }

    void client.auth.getSession().then(({ data }) => syncAccess(data.session))

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      void syncAccess(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const memberName =
    useMemo(
      () => [member?.first_name, member?.last_name].filter(Boolean).join(' ') || 'Member',
      [member],
    )

  const signIn = async () => {
    if (!supabase) return

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    window.history.replaceState(null, '', '/')
  }

  const navigate = (page: NavKey) => {
    setActivePage(page)
    window.history.pushState(null, '', pageToPath(page))
  }

  const renderPage = () => {
    if (activePage === 'calendar') {
      return <CalendarPage memberId={member?.id ? String(member.id) : ''} memberName={memberName} />
    }
    if (activePage === 'expenses') return <ExpensesPage />
    return <HomePage member={member} />
  }

  const isSignedIn = accessState === 'approved'
  const isAuthLoading = accessState === 'loading' || accessState === 'checking'

  return (
    <div className="min-h-screen bg-[#0f1714] text-stone-100">
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(154,117,46,0.22),transparent_28%),linear-gradient(180deg,#13201a_0%,#0f1714_55%,#efe6d7_55%,#f4ecdf_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/50 to-transparent" />

        <div className="relative flex min-h-screen flex-col">
          <Header
            activePage={activePage}
            isSignedIn={isSignedIn}
            memberName={memberName}
            onNavigate={navigate}
            onSignOut={signOut}
            role={member?.role}
          />

          <main className="mx-auto flex w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
            {isAuthLoading ? (
              <LoadingScreen label="Checking access" />
            ) : isSignedIn ? (
              <div className="w-full">{renderPage()}</div>
            ) : (
              <div className="grid w-full items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
                <section className="grid content-start gap-6 pt-2">
                  <div className="inline-flex w-fit rounded-full border border-amber-200/15 bg-white/5 px-4 py-2 text-[0.72rem] uppercase tracking-[0.2em] text-amber-100/80">
                    Established Standard
                  </div>
                  <div className="grid gap-5">
                    <h2 className="max-w-[11ch] text-5xl leading-none tracking-[-0.06em] text-stone-50 md:text-7xl">
                      A proper front door for the club.
                    </h2>
                    <p className="max-w-xl text-base leading-8 text-stone-300">
                      Quiet, formal, and deliberate. Members sign in with Google, and only
                      approved accounts in your existing Supabase `users` table are admitted.
                    </p>
                  </div>
                  <div className="grid gap-3 text-sm leading-7 text-stone-300/90">
                    <p>Google authentication through Supabase.</p>
                    <p>Access controlled by your existing members table.</p>
                    <p>Responsive layout for desktop and mobile.</p>
                  </div>
                </section>

                <AccessPanel
                  accessState={accessState}
                  email={email}
                  member={member}
                  onSignIn={signIn}
                  onSignOut={signOut}
                />
              </div>
            )}
          </main>

          <Footer />
        </div>
      </div>
    </div>
  )
}
