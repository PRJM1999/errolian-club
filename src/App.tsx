import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://sewvqbvummwkhhbddzqa.supabase.co',
  'sb_publishable_qPppyxRFSgPwLN2cWj2tQw_8bgjP7Hb'
)

export default function App() {
  return (
    <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}>
      Login with Google
    </button>
  )
}