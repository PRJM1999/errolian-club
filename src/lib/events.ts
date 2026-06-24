import { supabase } from './supabase'

export type EventLocation = {
  id: string
  locationName: string
  country: string
  latitude: number | null
  longitude: number | null
}

export type LocationComment = {
  id: string
  locationId: string
  commentType: string
  commentText: string
  createdAt: string
  createdByName: string
}

export type EventEntry = EventLocation & {
  id: string
  locationId: string
  title: string
  eventType: string
  startDate: string
  endDate: string | null
  createdBy: string | null
  createdByName: string
  attendeeCount: number
  attendees: string[]
  commentCount: number
  comments: LocationComment[]
}

export type EventUpdate = {
  id: string
  title: string
  eventType: string
  startDate: string
  endDate: string
}

export type EventInput = {
  title: string
  eventType: string
  locationId: string
  locationName: string
  country: string
  latitude: number | null
  longitude: number | null
  startDate: string
  endDate: string
  commentType: string
  commentText: string
  createdBy: string
}

type LocationRow = {
  id: string
  location_name: string
  country: string | null
  latitude: number | null
  longitude: number | null
}

type EventRow = {
  id: string
  title: string
  event_type: string | null
  location_id: string
  start_date: string
  end_date: string | null
  created_by: number | string | null
  event_locations: LocationRow | LocationRow[] | null
}

type AttendanceRow = {
  event_id: string
  users:
    | {
    first_name: string | null
    last_name: string | null
  }
    | Array<{
        first_name: string | null
        last_name: string | null
      }>
    | null
}

type CommentRow = {
  id: string
  location_id: string
  comment_type: string
  comment_text: string
  created_at: string
  users:
    | {
        first_name: string | null
        last_name: string | null
      }
    | Array<{
        first_name: string | null
        last_name: string | null
      }>
    | null
}

type UserRow = {
  id: number | string
  first_name: string | null
  last_name: string | null
}

const ensureClient = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  return supabase
}

const normalizeUserId = (memberId: string) => {
  if (/^\d+$/.test(memberId)) {
    return Number(memberId)
  }

  return memberId
}

const displayName = (user: AttendanceRow['users']) =>
  [firstValue(user)?.first_name, firstValue(user)?.last_name].filter(Boolean).join(' ') || 'Member'

const firstValue = <T,>(value: T | T[] | null) => (Array.isArray(value) ? value[0] : value)

const mapLocation = (row: LocationRow): EventLocation => ({
  id: row.id,
  locationName: row.location_name,
  country: row.country || '',
  latitude: row.latitude,
  longitude: row.longitude,
})

export async function listLocations() {
  const client = ensureClient()

  const { data, error } = await client
    .from('event_locations')
    .select('id, location_name, country, latitude, longitude')
    .order('location_name', { ascending: true })

  if (error) throw new Error(error.message)

  return ((data ?? []) as LocationRow[]).map(mapLocation)
}

export async function listEvents() {
  const client = ensureClient()

  const [
    { data: events, error: eventsError },
    { data: attendance, error: attendanceError },
    { data: comments, error: commentsError },
    { data: users, error: usersError },
  ] = await Promise.all([
      client
        .from('events')
        .select(
          'id, title, event_type, location_id, start_date, end_date, created_by, event_locations(id, location_name, country, latitude, longitude)',
        )
        .order('start_date', { ascending: false }),
      client.from('event_attendance').select('event_id, users(first_name, last_name)'),
      client
        .from('location_comments')
        .select('id, location_id, comment_type, comment_text, created_at, users(first_name, last_name)')
        .order('created_at', { ascending: false }),
      client.from('users').select('id, first_name, last_name'),
    ])

  if (eventsError) throw new Error(eventsError.message)
  if (attendanceError) throw new Error(attendanceError.message)
  if (commentsError) throw new Error(commentsError.message)
  if (usersError) throw new Error(usersError.message)

  const attendeesByEvent = new Map<string, string[]>()
  const commentsByLocation = new Map<string, LocationComment[]>()
  const usersById = new Map(
    ((users ?? []) as UserRow[]).map((user) => [
      String(user.id),
      [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Member',
    ]),
  )

  for (const row of (attendance ?? []) as AttendanceRow[]) {
    attendeesByEvent.set(row.event_id, [...(attendeesByEvent.get(row.event_id) ?? []), displayName(row.users)])
  }

  for (const row of (comments ?? []) as CommentRow[]) {
    commentsByLocation.set(row.location_id, [
      ...(commentsByLocation.get(row.location_id) ?? []),
      {
        id: row.id,
        locationId: row.location_id,
        commentType: row.comment_type,
        commentText: row.comment_text,
        createdAt: row.created_at,
        createdByName: displayName(row.users),
      },
    ])
  }

  return ((events ?? []) as unknown as EventRow[]).map((event) => {
    const locationRow = firstValue(event.event_locations)
    const location = locationRow
      ? mapLocation(locationRow)
      : {
          id: event.location_id,
          locationName: 'Unknown location',
          country: '',
          latitude: null,
          longitude: null,
        }
    const attendees = attendeesByEvent.get(event.id) ?? []
    const locationComments = commentsByLocation.get(location.id) ?? []

    return {
      ...location,
      id: event.id,
      locationId: location.id,
      title: event.title,
      eventType: event.event_type || 'Event',
      startDate: event.start_date,
      endDate: event.end_date,
      createdBy: event.created_by === null ? null : String(event.created_by),
      createdByName:
        event.created_by === null ? 'Historic register' : usersById.get(String(event.created_by)) ?? 'Member',
      attendeeCount: attendees.length,
      attendees,
      commentCount: locationComments.length,
      comments: locationComments,
    }
  })
}

export async function createEvent(input: EventInput) {
  const client = ensureClient()
  let locationId = input.locationId

  if (!locationId) {
    const { data: location, error: locationError } = await client
      .from('event_locations')
      .insert({
        location_name: input.locationName,
        country: input.country || null,
        latitude: input.latitude,
        longitude: input.longitude,
      })
      .select('id')
      .single()

    if (locationError) throw new Error(locationError.message)
    locationId = location.id
  }

  const { data: event, error: eventError } = await client
    .from('events')
    .insert({
      title: input.title,
      event_type: input.eventType,
      location_id: locationId,
      start_date: input.startDate,
      end_date: input.endDate || null,
      created_by: normalizeUserId(input.createdBy),
    })
    .select('id')
    .single()

  if (eventError) throw new Error(eventError.message)

  if (input.commentText) {
    const { error: commentError } = await client.from('location_comments').insert({
      location_id: locationId,
      comment_type: input.commentType || 'General',
      comment_text: input.commentText,
      created_by: normalizeUserId(input.createdBy),
    })

    if (commentError) throw new Error(commentError.message)
  }

  const { data: users, error: usersError } = await client.from('users').select('id').eq('is_active', true)

  if (usersError) throw new Error(usersError.message)

  const attendance = ((users ?? []) as UserRow[]).map((user) => ({
    event_id: event.id,
    user_id: normalizeUserId(String(user.id)),
  }))

  if (!attendance.length) return

  const { error: attendanceError } = await client.from('event_attendance').insert(attendance)

  if (attendanceError) throw new Error(attendanceError.message)
}

export async function updateEvent(input: EventUpdate) {
  const client = ensureClient()

  const { error } = await client
    .from('events')
    .update({
      title: input.title,
      event_type: input.eventType,
      start_date: input.startDate,
      end_date: input.endDate || null,
    })
    .eq('id', input.id)

  if (error) throw new Error(error.message)
}

export async function createLocationComment(
  locationId: string,
  commentType: string,
  commentText: string,
  createdBy: string,
) {
  const client = ensureClient()

  const { error } = await client.from('location_comments').insert({
    location_id: locationId,
    comment_type: commentType || 'General',
    comment_text: commentText,
    created_by: normalizeUserId(createdBy),
  })

  if (error) throw new Error(error.message)
}
