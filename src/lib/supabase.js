import { createClient } from '@supabase/supabase-js'

// Hardcode values directly
const supabaseUrl = 'https://atbydkckyhbepxhpubxd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Ynlka2NreWhiZXB4aHB1YnhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMzU3OTEsImV4cCI6MjA3MjYxMTc5MX0.xN8XYf5A2vHqabTUSQzGeiQ4hAS1BzPetUUGMYmLSLI'

console.log('Supabase initialized')

export const supabase = createClient(supabaseUrl, supabaseKey)
