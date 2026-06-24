import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  createLocationComment,
  createEvent,
  listEvents,
  listLocations,
  updateEvent,
  type EventEntry,
  type EventLocation,
} from '../lib/events'

type EventsPageProps = {
  memberId: string
}

type LocationSummary = EventLocation & {
  events: EventEntry[]
  comments: EventEntry['comments']
}

const SCOTLAND_VIEW: L.LatLngTuple = [56.5, -4.2]
const COMMENT_TYPES = ['General', 'Point of interest', 'Safety', 'Positive', 'Negative']
const CHART_COLORS = ['#d6bd77', '#8fa68f', '#d9d0c2', '#b48b5d', '#6f8d78']

const formatDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

export function EventsPage({ memberId }: EventsPageProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const [events, setEvents] = useState<EventEntry[]>([])
  const [locations, setLocations] = useState<EventLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventEntry | null>(null)
  const [detailForm, setDetailForm] = useState({
    title: '',
    eventType: '',
    startDate: '',
    endDate: '',
  })
  const [commentForm, setCommentForm] = useState({
    commentType: 'General',
    commentText: '',
  })
  const [form, setForm] = useState({
    title: '',
    eventType: 'City',
    locationId: '',
    locationName: '',
    country: '',
    startDate: '',
    endDate: '',
    latitude: '',
    longitude: '',
    commentType: 'General',
    commentText: '',
  })
  const selectedLocation = locations.find((location) => location.id === form.locationId) ?? null
  const locationSummaries = useMemo(() => {
    const byLocation = new Map<string, LocationSummary>()

    for (const event of events) {
      const current = byLocation.get(event.locationId)

      if (current) {
        current.events.push(event)
        continue
      }

      byLocation.set(event.locationId, {
        id: event.locationId,
        locationName: event.locationName,
        country: event.country,
        latitude: event.latitude,
        longitude: event.longitude,
        events: [event],
        comments: event.comments,
      })
    }

    return [...byLocation.values()].sort((left, right) => left.locationName.localeCompare(right.locationName))
  }, [events])
  const mappedLocations = useMemo(
    () => locationSummaries.filter((location) => location.latitude !== null && location.longitude !== null),
    [locationSummaries],
  )
  const selectedLocationSummary =
    locationSummaries.find((location) => location.id === selectedLocationId) ?? null
  const activeEvent = selectedEvent ?? selectedLocationSummary?.events[0] ?? null
  const canEditSelected = Boolean(activeEvent?.createdBy && activeEvent.createdBy === memberId)

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError('')
      const [eventRows, locationRows] = await Promise.all([listEvents(), listLocations()])
      setEvents(eventRows)
      setLocations(locationRows)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load events right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [])

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return

    const map = L.map(mapElementRef.current, {
      attributionControl: false,
      zoomControl: false,
      worldCopyJump: true,
    }).setView(SCOTLAND_VIEW, 6)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map)

    const markers = L.layerGroup().addTo(map)
    mapRef.current = map
    markersRef.current = markers

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const markers = markersRef.current
    if (!map || !markers) return

    markers.clearLayers()
    for (const location of mappedLocations) {
      if (location.latitude === null || location.longitude === null) continue

      const latLng: L.LatLngTuple = [location.latitude, location.longitude]
      L.circleMarker(latLng, {
        radius: Math.min(15, 7 + location.events.length * 2),
        color: '#f7e7b0',
        fillColor: '#d6bd77',
        fillOpacity: 0.92,
        weight: 2,
      })
        .bindTooltip(
          `${location.locationName} · ${location.events.length} event${location.events.length === 1 ? '' : 's'}`,
        )
        .on('click', () => openLocation(location.id))
        .addTo(markers)
    }
  }, [mappedLocations])

  const metrics = useMemo(() => {
    const attendees = events.reduce((total, event) => total + event.attendeeCount, 0)
    const averageAttendance = events.length ? Math.round(attendees / events.length) : 0

    return { averageAttendance }
  }, [events])

  const countryData = useMemo(
    () =>
      Object.entries(
        events.reduce<Record<string, number>>((totals, event) => {
          const country = event.country || 'Unspecified'
          totals[country] = (totals[country] ?? 0) + 1
          return totals
        }, {}),
      )
        .map(([country, value]) => ({ country, value }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 6),
    [events],
  )

  const proposerData = useMemo(
    () =>
      Object.entries(
        events.reduce<Record<string, number>>((totals, event) => {
          totals[event.createdByName] = (totals[event.createdByName] ?? 0) + 1
          return totals
        }, {}),
      )
        .map(([name, value]) => ({ name, value }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 5),
    [events],
  )

  const maxAttendance = useMemo(
    () => Math.max(1, ...events.map((event) => event.attendeeCount)),
    [events],
  )
  const attendanceDialValue = Math.min(
    100,
    Math.round((metrics.averageAttendance / maxAttendance) * 100),
  )

  const eventTypeData = useMemo(
    () =>
      Object.entries(
        events.reduce<Record<string, number>>((totals, event) => {
          totals[event.eventType] = (totals[event.eventType] ?? 0) + 1
          return totals
        }, {}),
      ).map(([name, value]) => ({ name, value })),
    [events],
  )

  const yearData = useMemo(
    () =>
      Object.entries(
        events.reduce<Record<string, number>>((totals, event) => {
          const year = new Date(`${event.startDate}T12:00:00`).getFullYear().toString()
          totals[year] = (totals[year] ?? 0) + 1
          return totals
        }, {}),
      )
        .map(([year, value]) => ({ year, value }))
        .sort((left, right) => left.year.localeCompare(right.year)),
    [events],
  )

  const timelineEvents = useMemo(
    () =>
      [...events].sort(
        (left, right) =>
          new Date(`${left.startDate}T12:00:00`).getTime() -
          new Date(`${right.startDate}T12:00:00`).getTime(),
      ),
    [events],
  )

  const submit = async () => {
    if (!form.title || !form.startDate || (!form.locationId && !form.locationName)) {
      setError('Add a title, location, and start date.')
      return
    }

    const latitude = form.latitude ? Number(form.latitude) : null
    const longitude = form.longitude ? Number(form.longitude) : null

    if ((form.latitude && !Number.isFinite(latitude)) || (form.longitude && !Number.isFinite(longitude))) {
      setError('Latitude and longitude must be numbers.')
      return
    }

    try {
      setSaving(true)
      setError('')
      await createEvent({
        ...form,
        createdBy: memberId,
        latitude,
        longitude,
      })
      setForm({
        title: '',
        eventType: 'City',
        locationId: '',
        locationName: '',
        country: '',
        startDate: '',
        endDate: '',
        latitude: '',
        longitude: '',
        commentType: 'General',
        commentText: '',
      })
      setIsCreating(false)
      await loadEvents()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create event right now.')
    } finally {
      setSaving(false)
    }
  }

  const syncDetailForm = (event: EventEntry) => {
    setDetailForm({
      title: event.title,
      eventType: event.eventType,
      startDate: event.startDate,
      endDate: event.endDate || '',
    })
  }

  const openEvent = (event: EventEntry) => {
    setSelectedLocationId(event.locationId)
    setSelectedEvent(event)
    syncDetailForm(event)
    setCommentForm({ commentType: 'General', commentText: '' })
  }

  const openLocation = (locationId: string) => {
    const location = locationSummaries.find((current) => current.id === locationId)
    const event = location?.events[0] ?? null

    setSelectedLocationId(locationId)
    setSelectedEvent(event)
    if (event) syncDetailForm(event)
    setCommentForm({ commentType: 'General', commentText: '' })
  }

  const selectEventInDrawer = (event: EventEntry) => {
    setSelectedEvent(event)
    syncDetailForm(event)
  }

  const saveSelectedEvent = async () => {
    if (!activeEvent) return

    try {
      setSaving(true)
      setError('')
      await updateEvent({
        id: activeEvent.id,
        ...detailForm,
      })
      await loadEvents()
      setSelectedLocationId(null)
      setSelectedEvent(null)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update event right now.')
    } finally {
      setSaving(false)
    }
  }

  const saveComment = async () => {
    if (!selectedLocationSummary || !commentForm.commentText.trim()) return

    try {
      setSaving(true)
      setError('')
      await createLocationComment(
        selectedLocationSummary.id,
        commentForm.commentType,
        commentForm.commentText,
        memberId,
      )
      const eventRows = await listEvents()
      setEvents(eventRows)
      setSelectedEvent((current) => {
        const updated = eventRows.find((event) => event.id === current?.id)
        return updated ?? current
      })
      setCommentForm({ commentType: 'General', commentText: '' })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to add comment right now.')
    } finally {
      setSaving(false)
    }
  }

  const futureEvents = useMemo(
    () =>
      [...events]
        .filter((event) => new Date(`${event.startDate}T12:00:00`) >= new Date())
        .sort(
          (left, right) =>
            new Date(`${left.startDate}T12:00:00`).getTime() -
            new Date(`${right.startDate}T12:00:00`).getTime(),
        )
        .slice(0, 4),
    [events],
  )

  return (
    <section className="grid gap-5">
      <div className="rounded-[1rem] border border-white/10 bg-[#17231d] px-5 py-4 shadow-[0_18px_42px_rgba(4,9,8,0.16)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.28em] text-[#d6bd77]">Events</p>
            <h1 className="mt-1 text-2xl tracking-[-0.04em] text-stone-50 md:text-3xl">Locations</h1>
          </div>
          <button
            aria-label="Add event"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-[#d6bd77] text-3xl leading-none text-[#101b16] transition hover:bg-[#e3cc88]"
            onClick={() => setIsCreating(true)}
            title="Add event"
            type="button"
          >
            +
          </button>
        </div>

        {error ? <p className="rounded-sm border border-[#d6bd77]/30 bg-black/20 p-3 text-stone-200">{error}</p> : null}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_0.95fr]">
        <section className="relative h-[26rem] overflow-hidden rounded-[1rem] border border-white/10 bg-[#07100d] shadow-[0_24px_60px_rgba(4,9,8,0.22)] sm:h-[30rem] xl:sticky xl:top-5 xl:h-[34rem]">
          <div ref={mapElementRef} className="events-map absolute inset-0" />
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-[1rem] border border-white/10 bg-[#17231d] p-4 shadow-[0_18px_42px_rgba(4,9,8,0.14)]">
            <div className="grid gap-2">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#d6bd77]">Avg attendance</p>
              <div className="relative h-36">
                <ResponsiveContainer height="100%" width="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="70%"
                    data={[{ name: 'Attendance', value: attendanceDialValue }]}
                    endAngle={0}
                    innerRadius="72%"
                    outerRadius="100%"
                    startAngle={180}
                  >
                    <PolarAngleAxis angleAxisId={0} domain={[0, 100]} tick={false} type="number" />
                    <RadialBar background cornerRadius={12} dataKey="value" fill="#d6bd77" />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-x-0 bottom-3 text-center">
                  <p className="text-4xl tracking-[-0.05em] text-stone-50">{metrics.averageAttendance}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-stone-400">members</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[1rem] border border-white/10 bg-[#17231d] p-4 shadow-[0_18px_42px_rgba(4,9,8,0.14)]">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#d6bd77]">Visits by country</p>
            <div className="mt-3 h-40">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={countryData} layout="vertical" margin={{ bottom: 0, left: 8, right: 16, top: 4 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                  <XAxis allowDecimals={false} stroke="#a8a29e" tick={{ fontSize: 11 }} tickLine={false} type="number" />
                  <YAxis dataKey="country" stroke="#a8a29e" tick={{ fontSize: 11 }} tickLine={false} type="category" width={78} />
                  <Tooltip
                    contentStyle={{
                      background: '#f4eee4',
                      border: '1px solid #d6c8ad',
                      borderRadius: 8,
                      color: '#13211b',
                    }}
                    cursor={{ fill: 'rgba(214,189,119,0.08)' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {countryData.map((entry, index) => (
                      <Cell key={entry.country} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-[1rem] border border-white/10 bg-[#17231d] p-4 shadow-[0_18px_42px_rgba(4,9,8,0.14)]">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#d6bd77]">Event mix</p>
            <div className="mt-3 h-40">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={eventTypeData} margin={{ left: -28, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="#a8a29e" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis allowDecimals={false} stroke="#a8a29e" tick={{ fontSize: 11 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#f4eee4',
                      border: '1px solid #d6c8ad',
                      borderRadius: 8,
                      color: '#13211b',
                    }}
                    cursor={{ fill: 'rgba(214,189,119,0.08)' }}
                  />
                  <Bar dataKey="value" fill="#d6bd77" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-[1rem] border border-white/10 bg-[#17231d] p-4 shadow-[0_18px_42px_rgba(4,9,8,0.14)]">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#d6bd77]">Proposals by member</p>
            <div className="mt-3 h-36">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={proposerData} margin={{ left: -28, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="#a8a29e" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis allowDecimals={false} stroke="#a8a29e" tick={{ fontSize: 11 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#f4eee4',
                      border: '1px solid #d6c8ad',
                      borderRadius: 8,
                      color: '#13211b',
                    }}
                    cursor={{ fill: 'rgba(214,189,119,0.08)' }}
                  />
                  <Bar dataKey="value" fill="#d9d0c2" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-[1rem] border border-white/10 bg-[#17231d] p-4 shadow-[0_18px_42px_rgba(4,9,8,0.14)] md:col-span-2">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#d6bd77]">Events by year</p>
            <div className="mt-3 h-36">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={yearData} margin={{ left: -28, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="year" stroke="#a8a29e" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis allowDecimals={false} stroke="#a8a29e" tick={{ fontSize: 11 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#f4eee4',
                      border: '1px solid #d6c8ad',
                      borderRadius: 8,
                      color: '#13211b',
                    }}
                    cursor={{ fill: 'rgba(214,189,119,0.08)' }}
                  />
                  <Bar dataKey="value" fill="#7d9a86" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

        </div>
      </div>

      <section className="rounded-[1rem] border border-white/10 bg-[#17231d] p-5 shadow-[0_18px_42px_rgba(4,9,8,0.14)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#d6bd77]">Next</p>
            <h2 className="mt-1 text-2xl tracking-[-0.04em] text-stone-50">Future events</h2>
          </div>
          {loading ? <p className="text-sm text-stone-400">Loading</p> : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {!loading && !futureEvents.length ? (
            <p className="text-sm text-stone-400">No future events are recorded yet.</p>
          ) : null}
          {futureEvents.map((event) => (
            <button
              key={event.id}
              className="rounded-[0.9rem] border border-white/10 bg-[#101b16] p-4 text-left transition hover:border-[#d6bd77]/40 hover:bg-[#18251f]"
              onClick={() => openEvent(event)}
              type="button"
            >
              <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[#d6bd77]">
                {formatDate(event.startDate)}
              </span>
              <span className="mt-2 block truncate text-lg text-stone-50">{event.title}</span>
              <span className="mt-1 block truncate text-sm text-stone-400">
                {event.locationName}
                {event.country ? `, ${event.country}` : ''}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[1rem] border border-white/10 bg-[#17231d] p-5 shadow-[0_18px_42px_rgba(4,9,8,0.14)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#d6bd77]">Timeline</p>
            <h2 className="mt-1 text-2xl tracking-[-0.04em] text-stone-50">Club history</h2>
          </div>
          {loading ? <p className="text-sm text-stone-400">Loading</p> : null}
        </div>

        <div className="event-timeline-scroll mt-5 overflow-x-auto pb-3">
          <div className="relative flex min-w-max gap-3 px-1 pt-5">
            <div className="absolute left-3 right-3 top-8 h-px bg-[#d6bd77]/30" />
            {timelineEvents.map((event) => (
              <button
                key={event.id}
                className="group relative grid w-56 shrink-0 gap-3 rounded-[1rem] border border-white/10 bg-[#101b16] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#d6bd77]/40 hover:bg-[#18251f]"
                onClick={() => openEvent(event)}
                type="button"
              >
                <span className="absolute left-5 top-[-0.72rem] size-4 rounded-full border-2 border-[#17231d] bg-[#d6bd77] shadow-[0_0_0_4px_rgba(214,189,119,0.12)]" />
                <span className="text-xs uppercase tracking-[0.16em] text-[#d6bd77]">{formatDate(event.startDate)}</span>
                <span className="text-lg leading-tight text-stone-50">{event.title}</span>
                <span className="text-sm leading-5 text-stone-400">
                  {event.locationName}
                  {event.country ? `, ${event.country}` : ''}
                </span>
                <span className="w-fit rounded-full border border-[#d6bd77]/35 px-3 py-1 text-xs uppercase tracking-[0.12em] text-[#d6bd77]">
                  {event.eventType}
                </span>
              </button>
            ))}
            {!loading && !timelineEvents.length ? (
              <p className="text-sm text-stone-400">No events have been recorded yet.</p>
            ) : null}
          </div>
        </div>
      </section>

      {isCreating ? (
        <div className="fixed inset-0 z-[2000] grid place-items-end bg-black/55 p-3 sm:place-items-center">
          <section className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-[1.25rem] border border-[#d6c8ad] bg-[#f4eee4] p-5 text-[#13211b] shadow-[0_30px_80px_rgba(4,9,8,0.34)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[#8a6a2f]">New event</p>
                <h2 className="mt-2 text-3xl tracking-[-0.05em]">Add to the register</h2>
              </div>
              <button
                className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 transition hover:bg-white"
                onClick={() => setIsCreating(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Title" value={form.title} onChange={(title) => setForm((current) => ({ ...current, title }))} />
              <Field
                label="Type"
                value={form.eventType}
                onChange={(eventType) => setForm((current) => ({ ...current, eventType }))}
              />

              <label className="grid gap-2 sm:col-span-2">
                <span className="text-sm uppercase tracking-[0.14em] text-stone-500">Location</span>
                <select
                  className="rounded-[0.9rem] border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#8a6a2f]"
                  value={form.locationId}
                  onChange={(event) => {
                    const location = locations.find((current) => current.id === event.target.value)
                    setForm((current) => ({
                      ...current,
                      locationId: event.target.value,
                      locationName: '',
                      country: '',
                      latitude: location?.latitude ? String(location.latitude) : '',
                      longitude: location?.longitude ? String(location.longitude) : '',
                    }))
                  }}
                >
                  <option value="">Add new location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.locationName}
                      {location.country ? `, ${location.country}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              {!selectedLocation ? (
                <>
                  <Field
                    label="New location"
                    value={form.locationName}
                    onChange={(locationName) => setForm((current) => ({ ...current, locationName }))}
                  />
                  <Field
                    label="Country"
                    value={form.country}
                    onChange={(country) => setForm((current) => ({ ...current, country }))}
                  />
                  <Field
                    label="Latitude"
                    value={form.latitude}
                    onChange={(latitude) => setForm((current) => ({ ...current, latitude }))}
                  />
                  <Field
                    label="Longitude"
                    value={form.longitude}
                    onChange={(longitude) => setForm((current) => ({ ...current, longitude }))}
                  />
                </>
              ) : null}

              <Field
                label="Start"
                type="date"
                value={form.startDate}
                onChange={(startDate) => setForm((current) => ({ ...current, startDate }))}
              />
              <Field
                label="End"
                type="date"
                value={form.endDate}
                onChange={(endDate) => setForm((current) => ({ ...current, endDate }))}
              />
              <Field
                value={form.commentType}
                label="Comment type"
                onChange={(commentType) => setForm((current) => ({ ...current, commentType }))}
                renderInput={(inputProps) => <CommentTypeInput {...inputProps} />}
              />
              <label className="grid gap-2 sm:col-span-2">
                <span className="text-sm uppercase tracking-[0.14em] text-stone-500">Location comment</span>
                <textarea
                  className="min-h-28 rounded-[0.9rem] border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#8a6a2f]"
                  value={form.commentText}
                  onChange={(event) => setForm((current) => ({ ...current, commentText: event.target.value }))}
                />
              </label>
            </div>

            <button
              className="mt-5 w-full rounded-full bg-[#13211b] px-5 py-3 text-base text-stone-50 transition hover:bg-[#1a2c24]"
              disabled={saving}
              onClick={submit}
              type="button"
            >
              {saving ? 'Saving...' : 'Create event'}
            </button>
          </section>
        </div>
      ) : null}

      {selectedLocationSummary && activeEvent ? (
        <div className="fixed inset-0 z-[2000] grid place-items-end bg-black/55 p-3 sm:place-items-center">
          <section className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-[1.25rem] border border-[#d6c8ad] bg-[#f4eee4] p-5 text-[#13211b] shadow-[0_30px_80px_rgba(4,9,8,0.34)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[#8a6a2f]">
                  Event location
                </p>
                <h2 className="mt-2 text-3xl tracking-[-0.05em]">{selectedLocationSummary.locationName}</h2>
                <p className="mt-1 text-sm text-stone-600">
                  {selectedLocationSummary.country || 'No country set'} · {selectedLocationSummary.events.length}{' '}
                  recorded event{selectedLocationSummary.events.length === 1 ? '' : 's'} here
                </p>
              </div>
              <button
                className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 transition hover:bg-white"
                onClick={() => {
                  setSelectedLocationId(null)
                  setSelectedEvent(null)
                }}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <section className="rounded-[1rem] border border-stone-200 bg-white/60 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                  {selectedLocationSummary.events.length === 1 ? 'Event at this location' : 'Events at this location'}
                </p>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {selectedLocationSummary.events.map((event) => (
                    <button
                      key={event.id}
                      className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                        activeEvent.id === event.id
                          ? 'border-[#13211b] bg-[#13211b] text-stone-50'
                          : 'border-stone-300 bg-white/80 text-stone-700 hover:bg-white'
                      }`}
                      onClick={() => selectEventInDrawer(event)}
                      type="button"
                    >
                      {event.title}
                    </button>
                  ))}
                </div>
              </section>

              {!canEditSelected ? (
                <p className="rounded-[0.9rem] border border-stone-200 bg-white/60 p-3 text-sm leading-6 text-stone-600">
                  These event fields are locked because this event was created by another member.
                  You can still view the record and add comments for this location.
                </p>
              ) : null}

              <Field
                disabled={!canEditSelected}
                label="Title"
                value={detailForm.title}
                onChange={(title) => setDetailForm((current) => ({ ...current, title }))}
              />
              <Field
                disabled={!canEditSelected}
                label="Type"
                value={detailForm.eventType}
                onChange={(eventType) => setDetailForm((current) => ({ ...current, eventType }))}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  disabled={!canEditSelected}
                  label="Start"
                  type="date"
                  value={detailForm.startDate}
                  onChange={(startDate) => setDetailForm((current) => ({ ...current, startDate }))}
                />
                <Field
                  disabled={!canEditSelected}
                  label="End"
                  type="date"
                  value={detailForm.endDate}
                  onChange={(endDate) => setDetailForm((current) => ({ ...current, endDate }))}
                />
              </div>
              {canEditSelected ? (
                <button
                  className="rounded-full bg-[#13211b] px-5 py-3 text-base text-stone-50 transition hover:bg-[#1a2c24]"
                  disabled={saving}
                  onClick={saveSelectedEvent}
                  type="button"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              ) : null}

              <div className="rounded-[1rem] border border-stone-200 bg-white/70 p-4">
                <p className="text-sm uppercase tracking-[0.16em] text-stone-500">Attendance</p>
                <p className="mt-2 text-lg">{activeEvent.attendeeCount} members</p>
                {activeEvent.attendees.length ? (
                  <p className="mt-2 text-sm leading-6 text-stone-600">{activeEvent.attendees.join(', ')}</p>
                ) : null}
              </div>

              <section className="rounded-[1rem] border border-stone-200 bg-white/70 p-4">
                <p className="text-sm uppercase tracking-[0.16em] text-stone-500">Location comments</p>
                <div className="mt-3 grid gap-3">
                  {selectedLocationSummary.comments.length ? (
                    selectedLocationSummary.comments.map((comment) => (
                      <article key={comment.id} className="rounded-[0.9rem] border border-stone-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm uppercase tracking-[0.14em] text-[#8a6a2f]">
                            {comment.commentType}
                          </p>
                          <p className="text-xs text-stone-500">{comment.createdByName}</p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-700">{comment.commentText}</p>
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-stone-600">No comments have been added for this location yet.</p>
                  )}
                </div>

                <div className="mt-4 grid gap-3">
                  <Field
                    value={commentForm.commentType}
                    label="Comment type"
                    onChange={(commentType) => setCommentForm((current) => ({ ...current, commentType }))}
                    renderInput={(inputProps) => <CommentTypeInput {...inputProps} />}
                  />
                  <label className="grid gap-2">
                    <span className="text-sm uppercase tracking-[0.14em] text-stone-500">Comment</span>
                    <textarea
                      className="min-h-24 rounded-[0.9rem] border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#8a6a2f]"
                      value={commentForm.commentText}
                      onChange={(event) =>
                        setCommentForm((current) => ({ ...current, commentText: event.target.value }))
                      }
                    />
                  </label>
                  <button
                    className="rounded-full border border-stone-300 px-5 py-3 text-base text-[#13211b] transition hover:bg-white"
                    disabled={saving || !commentForm.commentText.trim()}
                    onClick={saveComment}
                    type="button"
                  >
                    {saving ? 'Saving...' : 'Add comment'}
                  </button>
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  disabled = false,
  renderInput,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  disabled?: boolean
  renderInput?: (props: { disabled: boolean; onChange: (value: string) => void; value: string }) => ReactNode
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm uppercase tracking-[0.14em] text-stone-500">{label}</span>
      {renderInput ? (
        renderInput({ disabled, onChange, value })
      ) : (
        <input
          className="rounded-[0.9rem] border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#8a6a2f] disabled:bg-stone-100 disabled:text-stone-500"
          disabled={disabled}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  )
}

function CommentTypeInput({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean
  onChange: (value: string) => void
  value: string
}) {
  const isKnownType = COMMENT_TYPES.includes(value)

  return (
    <div className="grid gap-2">
      <select
        className="rounded-[0.9rem] border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#8a6a2f] disabled:bg-stone-100 disabled:text-stone-500"
        disabled={disabled}
        value={isKnownType ? value : 'Other'}
        onChange={(event) => onChange(event.target.value === 'Other' ? '' : event.target.value)}
      >
        {COMMENT_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
        <option value="Other">Other</option>
      </select>
      {!isKnownType ? (
        <input
          className="rounded-[0.9rem] border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#8a6a2f] disabled:bg-stone-100 disabled:text-stone-500"
          disabled={disabled}
          placeholder="Type comment category"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}
    </div>
  )
}
