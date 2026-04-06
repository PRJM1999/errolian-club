const events = [
  { title: 'Committee Meeting', date: 'Tuesday, 14 April', note: 'Main dining room, 18:30' },
  { title: 'Guest Dinner', date: 'Friday, 17 April', note: 'Black tie, arrivals from 19:00' },
  { title: 'Quarterly Review', date: 'Monday, 20 April', note: 'Board room, 08:30' },
]

export function CalendarPage() {
  return (
    <section className="grid gap-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(4,9,8,0.18)] md:p-8">
        <p className="text-[0.72rem] uppercase tracking-[0.28em] text-amber-100/70">Calendar</p>
        <h1 className="mt-4 text-4xl leading-none tracking-[-0.06em] text-stone-50 md:text-6xl">
          Club dates at a glance.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-stone-300">
          A straightforward place for official meetings, dinners, and member events.
        </p>
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <article
            key={event.title}
            className="rounded-[1.5rem] border border-stone-900/10 bg-[rgba(251,247,239,0.94)] p-6 text-stone-700 shadow-[0_20px_44px_rgba(12,18,15,0.10)]"
          >
            <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[#8a6a2f]">{event.date}</p>
            <h2 className="mt-3 text-2xl tracking-[-0.04em] text-[#13211b]">{event.title}</h2>
            <p className="mt-2 leading-7">{event.note}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
