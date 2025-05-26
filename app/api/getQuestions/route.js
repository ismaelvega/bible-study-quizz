import { NextResponse } from 'next/server'
import { supabase } from '../../../utils/supabase/client.js'

// GET /api/questions — only public fields, no answers
export async function GET() {
  const { data, error } = await supabase
    .from('questions')
    .select('id, text, options, reference, url')
    .order('id', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}