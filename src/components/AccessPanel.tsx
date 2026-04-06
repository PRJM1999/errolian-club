type AccessState = 'loading' | 'signed_out' | 'checking' | 'approved' | 'denied' | 'error'

type Member = {
  first_name: string | null
  last_name: string | null
  role: string | null
}

type AccessPanelProps = {
  accessState: AccessState
  member: Member | null
  email: string
  onSignIn: () => Promise<void>
  onSignOut: () => Promise<void>
}

const panelTone: Record<AccessState, string> = {
  loading: 'border-stone-900/10',
  signed_out: 'border-stone-900/10',
  checking: 'border-stone-900/10',
  approved: 'border-emerald-950/15',
  denied: 'border-amber-950/20',
  error: 'border-amber-950/20',
}

export function AccessPanel({
  accessState,
  member,
  email,
  onSignIn,
  onSignOut,
}: AccessPanelProps) {
  const memberName = [member?.first_name, member?.last_name].filter(Boolean).join(' ') || 'Member'

  return (
    <section className="w-full max-w-xl rounded-[2rem] border border-stone-900/10 bg-[rgba(251,247,239,0.88)] p-6 shadow-[0_30px_80px_rgba(12,18,15,0.16)] backdrop-blur md:p-8">
      <div className="grid gap-8">
        <div className="grid gap-4">
          <p className="text-[0.72rem] uppercase tracking-[0.3em] text-[#8a6a2f]">
            Members Access
          </p>
          <h1 className="max-w-[10ch] text-5xl leading-none tracking-[-0.06em] text-[#13211b] md:text-7xl">
            A quieter way in.
          </h1>
          <p className="max-w-lg text-base leading-7 text-stone-700">
            Sign in with Google. Entry is granted only to active members already listed in
            the Supabase `users` table.
          </p>
        </div>

        <div
          className={`grid gap-3 rounded-[1.5rem] border ${panelTone[accessState]} bg-white/70 p-5 text-stone-700`}
        >
          {(accessState === 'loading' || accessState === 'checking') && (
            <>
              <p className="text-lg text-[#13211b]">Checking access</p>
              <p>Confirming your account against the club register.</p>
            </>
          )}

          {accessState === 'signed_out' && (
            <>
              <p className="text-lg text-[#13211b]">Sign in</p>
              <p>Use your approved Google account to continue.</p>
              <button
                className="mt-2 w-full rounded-full bg-[#13211b] px-5 py-3 text-base text-stone-50 transition hover:bg-[#1a2c24] sm:w-fit"
                onClick={onSignIn}
              >
                Continue with Google
              </button>
            </>
          )}

          {accessState === 'approved' && (
            <>
              <p className="text-lg text-[#13211b]">Welcome</p>
              <p>
                Welcome to the club portal, {memberName}
                {member?.role ? `, ${member.role}` : ''}.
              </p>
              <p>
                You are now signed in and ready to view member information as it is added to
                the site.
              </p>
              <p className="text-sm text-stone-500">{email}</p>
              <button
                className="mt-2 w-full rounded-full border border-stone-300 bg-stone-100 px-5 py-3 text-base text-[#13211b] transition hover:bg-stone-200 sm:w-fit"
                onClick={onSignOut}
              >
                Sign out
              </button>
            </>
          )}

          {accessState === 'denied' && (
            <>
              <p className="text-lg text-[#13211b]">Access denied</p>
              <p>This Google account is not an active member in the `users` table.</p>
              <button
                className="mt-2 w-full rounded-full bg-[#13211b] px-5 py-3 text-base text-stone-50 transition hover:bg-[#1a2c24] sm:w-fit"
                onClick={onSignOut}
              >
                Try another account
              </button>
            </>
          )}

          {accessState === 'error' && (
            <>
              <p className="text-lg text-[#13211b]">Configuration needed</p>
              <p>Add your Supabase URL and anon key in `.env`.</p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
