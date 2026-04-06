import { supabase } from './supabase'

export type LeaveEntry = {
  id: string
  memberId: string
  memberName: string
  start: string
  end: string
  createdAt: string | null
}

type LeaveRow = {
  id: string
  user_id: number | string
  member_name: string
  start_date: string
  end_date: string
  created_at: string | null
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

const mapRow = (row: LeaveRow): LeaveEntry => ({
  id: row.id,
  memberId: String(row.user_id),
  memberName: row.member_name,
  start: row.start_date,
  end: row.end_date,
  createdAt: row.created_at,
})

export async function listLeave() {
  const client = ensureClient()

  const { data, error } = await client
    .from('leave_entries')
    .select('id, user_id, member_name, start_date, end_date, created_at')
    .order('start_date', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapRow(row as LeaveRow))
}

export async function createLeave(
  memberId: string,
  memberName: string,
  startDate: string,
  endDate: string,
) {
  const client = ensureClient()

  const { error } = await client.from('leave_entries').insert({
    user_id: normalizeUserId(memberId),
    member_name: memberName,
    start_date: startDate,
    end_date: endDate,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteLeave(id: string) {
  const client = ensureClient()

  const { error } = await client.from('leave_entries').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}
