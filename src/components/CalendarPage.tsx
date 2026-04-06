import { useEffect, useMemo, useState } from 'react'
import { createLeave, deleteLeave, listLeave, type LeaveEntry } from '../lib/leave'

type CalendarPageProps = {
  memberId: string
  memberName: string
}

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const monthLabels = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const parseLeaveDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

const formatDisplayDate = (value: string) =>
  parseLeaveDate(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const formatLongDate = (date: Date) =>
  date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

const sameMonth = (date: Date, currentMonth: Date) =>
  date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear()

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

const overlaps = (entry: LeaveEntry, date: Date) => {
  const start = parseLeaveDate(entry.start)
  const end = parseLeaveDate(entry.end)
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  return current >= start && current <= end
}

const sortLeave = (entries: LeaveEntry[]) =>
  [...entries].sort(
    (left, right) => parseLeaveDate(left.start).getTime() - parseLeaveDate(right.start).getTime(),
  )

const ownsLeave = (entry: LeaveEntry, memberId: string) => entry.memberId === memberId

export function CalendarPage({ memberId, memberName }: CalendarPageProps) {
  const [entries, setEntries] = useState<LeaveEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [busyMessage, setBusyMessage] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0)
  })
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const loadLeave = async (message = 'Loading leave') => {
    try {
      setBusyMessage(message)
      setLoading(true)
      setError('')
      setEntries(sortLeave(await listLeave()))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load leave right now.')
    } finally {
      setLoading(false)
      setBusyMessage('')
    }
  }

  useEffect(() => {
    void loadLeave()
  }, [])

  const today = useMemo(() => new Date(), [])

  const memberEntries = useMemo(
    () => entries.filter((entry) => ownsLeave(entry, memberId)),
    [entries, memberId],
  )

  const upcomingEntries = useMemo(
    () => entries.filter((entry) => parseLeaveDate(entry.end) >= today),
    [entries, today],
  )

  const pastEntries = useMemo(
    () => entries.filter((entry) => parseLeaveDate(entry.end) < today),
    [entries, today],
  )

  const upcomingMemberEntries = useMemo(
    () => memberEntries.filter((entry) => parseLeaveDate(entry.end) >= today),
    [memberEntries, today],
  )

  const visibleEntries = useMemo(
    () =>
      entries.filter((entry) => {
        const start = parseLeaveDate(entry.start)
        const end = parseLeaveDate(entry.end)
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1, 12, 0, 0)
        const monthEnd = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          0,
          12,
          0,
          0,
        )
        return end >= monthStart && start <= monthEnd
      }),
    [currentMonth, entries],
  )

  const selectedEntries = useMemo(
    () => (selectedDate ? visibleEntries.filter((entry) => overlaps(entry, selectedDate)) : []),
    [selectedDate, visibleEntries],
  )

  const days = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1, 12, 0, 0)
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 12, 0, 0)
    const startOffset = (start.getDay() + 6) % 7
    const totalCells = Math.ceil((startOffset + end.getDate()) / 7) * 7

    return Array.from({ length: totalCells }, (_, index) => {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        index - startOffset + 1,
        12,
        0,
        0,
      )

      const dayEntries = visibleEntries.filter((entry) => overlaps(entry, date))
      const mine = dayEntries.some((entry) => ownsLeave(entry, memberId))

      return {
        key: `${date.toISOString()}-${index}`,
        date,
        label: date.getDate(),
        isCurrentMonth: sameMonth(date, currentMonth),
        isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
        leaveCount: dayEntries.length,
        isMine: mine,
      }
    })
  }, [currentMonth, memberId, selectedDate, visibleEntries])

  const addEntry = async () => {
    if (!startDate || !endDate) {
      setError('Choose both a start and end date.')
      return
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be on or after start date.')
      return
    }

    try {
      setBusyMessage('Adding leave')
      setSaving(true)
      setError('')
      await createLeave(memberId, memberName, startDate, endDate)
      setStartDate('')
      setEndDate('')
      await loadLeave('Refreshing leave')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to add leave right now.')
    } finally {
      setSaving(false)
      setBusyMessage('')
    }
  }

  const removeEntry = async (entry: LeaveEntry) => {
    const previousEntries = entries

    try {
      setBusyMessage('Deleting leave')
      setSaving(true)
      setError('')
      setEntries((currentEntries) => currentEntries.filter((current) => current.id !== entry.id))
      await deleteLeave(entry.id)
      await loadLeave('Refreshing leave')
    } catch (deleteError) {
      setEntries(previousEntries)
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete leave right now.')
    } finally {
      setSaving(false)
      setBusyMessage('')
    }
  }

  return (
    <section className="relative grid gap-6">
      {busyMessage ? (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
          <div className="flex min-w-[15rem] flex-col items-center gap-4 rounded-[1.5rem] border border-white/10 bg-[rgba(19,33,27,0.94)] px-8 py-7 text-stone-100 shadow-[0_24px_60px_rgba(4,9,8,0.24)]">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-amber-200" />
            <p className="text-sm uppercase tracking-[0.18em] text-stone-300">{busyMessage}</p>
          </div>
        </div>
      ) : null}

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(4,9,8,0.18)] md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.28em] text-amber-100/70">Calendar</p>
            <h1 className="mt-4 text-4xl leading-none tracking-[-0.06em] text-stone-50 md:text-6xl">
              Who is on leave.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-stone-300">
              The calendar keeps the month view quiet. Click any day with leave to see exactly who
              is away, while the register below keeps the wider picture visible.
            </p>
          </div>

          <button
            className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm uppercase tracking-[0.16em] text-stone-200 transition hover:bg-white/10 sm:w-auto"
            disabled={loading || saving}
            onClick={() => void loadLeave('Refreshing leave')}
            type="button"
          >
            Refresh Leave
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-6">
          <section className="rounded-[1.75rem] border border-stone-900/10 bg-[rgba(251,247,239,0.94)] p-6 text-stone-700 shadow-[0_24px_50px_rgba(12,18,15,0.10)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[#8a6a2f]">Month</p>
                <h2 className="mt-2 text-3xl tracking-[-0.04em] text-[#13211b]">
                  {monthLabels[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 transition hover:bg-stone-100"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1, 12, 0, 0),
                    )
                  }
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 transition hover:bg-stone-100"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1, 12, 0, 0),
                    )
                  }
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-7 gap-2">
              {weekdayLabels.map((label) => (
                <div
                  key={label}
                  className="pb-2 text-center text-[0.72rem] uppercase tracking-[0.2em] text-stone-500"
                >
                  {label}
                </div>
              ))}

              {days.map((day) => (
                <button
                  key={day.key}
                  className={`min-h-24 rounded-2xl border p-3 text-left transition ${
                    day.isCurrentMonth
                      ? day.isSelected
                        ? 'border-[#8a6a2f] bg-[#13211b] text-stone-50'
                        : day.isMine
                          ? 'border-[#8a6a2f] bg-[#f0e2c4] text-[#13211b]'
                          : day.leaveCount
                            ? 'border-[#d8c39a] bg-[#f8efdf] text-[#13211b]'
                            : 'border-stone-200 bg-white text-[#13211b]'
                      : 'border-stone-200/70 bg-stone-100/70 text-stone-400'
                  }`}
                  onClick={() =>
                    setSelectedDate((current) =>
                      current && isSameDay(current, day.date) ? null : day.date,
                    )
                  }
                  type="button"
                >
                  <div className="flex h-full flex-col justify-between gap-3">
                    <span className="text-sm">{day.label}</span>
                    {day.leaveCount ? (
                      <span className="text-xs leading-5">{day.leaveCount} away</span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {selectedDate ? (
            <section className="rounded-[1.75rem] border border-stone-900/10 bg-[rgba(251,247,239,0.94)] p-6 text-stone-700 shadow-[0_24px_50px_rgba(12,18,15,0.10)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[#8a6a2f]">Selected day</p>
                  <h2 className="mt-3 text-2xl tracking-[-0.04em] text-[#13211b]">
                    {formatLongDate(selectedDate)}
                  </h2>
                </div>
                {!loading ? <p className="text-sm text-stone-500">{selectedEntries.length} away</p> : null}
              </div>
              {error ? <p className="mt-4 text-[#8f3f2b]">{error}</p> : null}

              {!loading && !selectedEntries.length ? (
                <p className="mt-4 leading-7">Nobody is currently recorded as away on this date.</p>
              ) : null}

              <div className="mt-4 grid gap-3">
                {selectedEntries.map((entry) => (
                  <article
                    key={`selected-${entry.id}`}
                    className="rounded-[1.25rem] border border-stone-200 bg-white/80 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg text-[#13211b]">{entry.memberName}</p>
                        <p className="mt-2 text-sm text-stone-500">
                          {formatDisplayDate(entry.start)} to {formatDisplayDate(entry.end)}
                        </p>
                      </div>
                      {ownsLeave(entry, memberId) ? (
                        <span className="rounded-full border border-[#d8c39a] bg-[#f8efdf] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[#8a6a2f]">
                          You
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-[1.75rem] border border-stone-900/10 bg-[rgba(251,247,239,0.94)] p-6 text-stone-700 shadow-[0_24px_50px_rgba(12,18,15,0.10)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[#8a6a2f]">Upcoming club leave</p>
                <h2 className="mt-3 text-2xl tracking-[-0.04em] text-[#13211b]">
                  Current and future leave
                </h2>
              </div>
              {!loading ? (
                <p className="text-sm text-stone-500">{upcomingEntries.length} upcoming entries</p>
              ) : null}
            </div>

            {!loading && !upcomingEntries.length ? (
              <p className="mt-4 leading-7">No upcoming leave is currently recorded.</p>
            ) : null}

            <div className="mt-4 grid gap-3">
              {upcomingEntries.map((entry) => (
                <article
                  key={`upcoming-${entry.id}`}
                  className="rounded-[1.25rem] border border-stone-200 bg-white/80 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg text-[#13211b]">{entry.memberName}</p>
                      <p className="mt-2 text-sm text-stone-500">
                        {formatDisplayDate(entry.start)} to {formatDisplayDate(entry.end)}
                      </p>
                    </div>
                    {ownsLeave(entry, memberId) ? (
                      <span className="rounded-full border border-[#d8c39a] bg-[#f8efdf] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[#8a6a2f]">
                        You
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="grid content-start gap-6">
          <section className="rounded-[1.75rem] border border-stone-900/10 bg-[rgba(251,247,239,0.94)] p-6 text-stone-700 shadow-[0_24px_50px_rgba(12,18,15,0.10)]">
            <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[#8a6a2f]">Add leave</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <label className="grid gap-2">
                <span className="text-sm uppercase tracking-[0.14em] text-stone-500">Start</span>
                <input
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#8a6a2f]"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm uppercase tracking-[0.14em] text-stone-500">End</span>
                <input
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#8a6a2f]"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>

              <button
                className="w-full rounded-full bg-[#13211b] px-5 py-3 text-base text-stone-50 transition hover:bg-[#1a2c24] lg:mb-[1px] lg:w-auto lg:min-w-40"
                disabled={saving}
                onClick={addEntry}
                type="button"
              >
                {saving ? 'Saving...' : 'Add leave'}
              </button>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-stone-900/10 bg-[rgba(251,247,239,0.94)] p-6 text-stone-700 shadow-[0_24px_50px_rgba(12,18,15,0.10)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[#8a6a2f]">Current leave</p>
                <h2 className="mt-3 text-2xl tracking-[-0.04em] text-[#13211b]">Your upcoming dates</h2>
              </div>
              {!loading ? (
                <p className="text-sm text-stone-500">{upcomingMemberEntries.length} entries</p>
              ) : null}
            </div>

            {!loading && !upcomingMemberEntries.length ? (
              <p className="mt-4 leading-7">No upcoming leave has been recorded for you yet.</p>
            ) : null}

            <div className="mt-4 grid max-h-[22rem] gap-3 overflow-y-auto pr-1">
              {upcomingMemberEntries.map((entry) => (
                <article key={entry.id} className="rounded-[1.25rem] border border-stone-200 bg-white/80 p-4">
                  <p className="text-lg text-[#13211b]">
                    {formatDisplayDate(entry.start)} to {formatDisplayDate(entry.end)}
                  </p>
                  <button
                    className="mt-4 rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 transition hover:bg-stone-100"
                    disabled={saving}
                    onClick={() => removeEntry(entry)}
                    type="button"
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-stone-900/10 bg-[rgba(251,247,239,0.9)] p-5 text-stone-700 shadow-[0_18px_40px_rgba(12,18,15,0.08)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[#8a6a2f]">Leave history</p>
                <h2 className="mt-2 text-xl tracking-[-0.04em] text-[#13211b]">Past dates</h2>
              </div>
              {!loading ? <p className="text-sm text-stone-500">{pastEntries.length} entries</p> : null}
            </div>

            <div className="mt-4 grid max-h-[18rem] gap-3 overflow-y-auto pr-1">
              {pastEntries.length ? (
                pastEntries.slice(-8).reverse().map((entry) => (
                  <article
                    key={`history-${entry.id}`}
                    className="rounded-[1.15rem] border border-stone-200 bg-white/80 p-4"
                  >
                    <p className="text-base text-[#13211b]">{entry.memberName}</p>
                    <p className="mt-2 text-sm text-stone-500">
                      {formatDisplayDate(entry.start)} to {formatDisplayDate(entry.end)}
                    </p>
                  </article>
                ))
              ) : (
                <p>No past leave is currently recorded.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}
