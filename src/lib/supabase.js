import { createClient } from '@supabase/supabase-js'

// These will come from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Log to see if variables are loaded (remove in production)
console.log('Supabase URL:', supabaseUrl ? 'Loaded' : 'Missing')
console.log('Supabase Key:', supabaseKey ? 'Loaded' : 'Missing')

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!')
  // Use empty strings to prevent crash
  const supabaseUrl = 'https://placeholder.supabase.co'
  const supabaseKey = 'placeholder-key'
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
)
