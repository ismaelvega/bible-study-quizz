import { NextResponse } from 'next/server'
import { supabase } from '../../../utils/supabase/client.js'

// POST /api/verify — checks answer and returns correctness plus the correct index
export async function POST(req) {
  const { questionId, selectedIndex } = await req.json()

  console.log({ questionId, selectedIndex })

  const { data, error } = await supabase
    .from('questions')
    .select('correctIndex')
    .eq('id', questionId)
    .single()

  console.log({ data, error })

  if (error || !data) {
    return NextResponse.json({ error: error ? error.message : 'Not found' }, { status: 500 })
  }

  const correct = data.correctIndex === selectedIndex
  return NextResponse.json({ questionId, selectedIndex, correct, correctIndex: data.correctIndex })
}