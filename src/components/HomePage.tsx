type Member = {
  first_name: string | null
  last_name: string | null
  role: string | null
}

type HomePageProps = {
  member: Member | null
}

export function HomePage({ member }: HomePageProps) {
  const firstName = member?.first_name || 'Member'

  return (
    <section className="grid gap-8">
      <div className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(4,9,8,0.18)] md:p-8">
        <p className="text-[0.72rem] uppercase tracking-[0.28em] text-amber-100/70">
          Welcome
        </p>
        <h1 className="max-w-[12ch] text-4xl leading-none tracking-[-0.06em] text-stone-50 md:text-6xl">
          Good to see you, {firstName}.
        </h1>
        <p className="max-w-2xl text-base leading-8 text-stone-300">
          This is the members area. From here, members can keep track of the club calendar,
          review updates, and submit expenses without wading through unnecessary clutter.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <article className="rounded-[1.75rem] border border-stone-900/10 bg-[rgba(251,247,239,0.94)] p-6 text-stone-700 shadow-[0_24px_50px_rgba(12,18,15,0.10)]">
          <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[#8a6a2f]">Today</p>
          <h2 className="mt-3 text-2xl tracking-[-0.04em] text-[#13211b]">Club notices</h2>
          <p className="mt-3 leading-7">
            Use this area for announcements. Connect to WhatsApp Api. 
          </p>
        </article>

        <article className="rounded-[1.75rem] border border-stone-900/10 bg-[rgba(251,247,239,0.94)] p-6 text-stone-700 shadow-[0_24px_50px_rgba(12,18,15,0.10)]">
          <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[#8a6a2f]">Next</p>
          <h2 className="mt-3 text-2xl tracking-[-0.04em] text-[#13211b]">Upcoming dates</h2>
          <p className="mt-3 leading-7">
            The calendar section can hold formal dinners, committee meetings, rehearsals, or
            any other key club engagements.
          </p>
        </article>

        <article className="rounded-[1.75rem] border border-stone-900/10 bg-[rgba(251,247,239,0.94)] p-6 text-stone-700 shadow-[0_24px_50px_rgba(12,18,15,0.10)]">
          <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[#8a6a2f]">Practical</p>
          <h2 className="mt-3 text-2xl tracking-[-0.04em] text-[#13211b]">Expenses</h2>
          <p className="mt-3 leading-7">
            Members can submit expenses cleanly and keep the finance side straightforward and
            well-documented.
          </p>
        </article>
      </div>
    </section>
  )
}
