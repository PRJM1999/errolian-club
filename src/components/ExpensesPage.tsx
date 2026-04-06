export function ExpensesPage() {
  return (
    <section className="grid gap-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(4,9,8,0.18)] md:p-8">
        <p className="text-[0.72rem] uppercase tracking-[0.28em] text-amber-100/70">Expenses</p>
        <h1 className="mt-4 text-4xl leading-none tracking-[-0.06em] text-stone-50 md:text-6xl">
          Submit expenses properly.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-stone-300">
          A simple form to keep reimbursements tidy, consistent, and easy to review.
        </p>
      </div>

      <form className="grid gap-4 rounded-[1.75rem] border border-stone-900/10 bg-[rgba(251,247,239,0.94)] p-6 text-stone-700 shadow-[0_24px_50px_rgba(12,18,15,0.10)] md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm uppercase tracking-[0.14em] text-stone-500">Date</span>
          <input
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#8a6a2f]"
            type="date"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm uppercase tracking-[0.14em] text-stone-500">Amount</span>
          <input
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#8a6a2f]"
            type="text"
            placeholder="£0.00"
          />
        </label>

        <label className="grid gap-2 md:col-span-2">
          <span className="text-sm uppercase tracking-[0.14em] text-stone-500">Description</span>
          <input
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#8a6a2f]"
            type="text"
            placeholder="Travel, supplies, hosting, or other approved expense"
          />
        </label>

        <label className="grid gap-2 md:col-span-2">
          <span className="text-sm uppercase tracking-[0.14em] text-stone-500">Notes</span>
          <textarea
            className="min-h-32 rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#8a6a2f]"
            placeholder="Add any supporting context here"
          />
        </label>

        <div className="md:col-span-2">
          <button
            className="w-full rounded-full bg-[#13211b] px-5 py-3 text-base text-stone-50 transition hover:bg-[#1a2c24] sm:w-fit"
            type="button"
          >
            Submit expense
          </button>
        </div>
      </form>
    </section>
  )
}
