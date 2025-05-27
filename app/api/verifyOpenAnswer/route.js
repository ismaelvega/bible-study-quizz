// app/api/verify/route.js
import { NextResponse } from 'next/server'
import { supabase } from '../../../utils/supabase/client.js'

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI();

const anwserVerification = z.object({
  isCorrect: z.boolean(),
  explanation: z.string(),
})

export async function POST(req) {
  // 1) parse payload
  console.log('req:', req.questionId, req.userAnswer)
  const { questionId, userAnswer } = await req.json()

  // 1.5 checks if the length is huge
  if (userAnswer.length > 700) {
    return NextResponse.json(
      { error: 'La respuesta es demasiado larga' },
      { status: 400 }
    )
  }

  // 2) load the question
  const { data: question, error: qErr } = await supabase
    .from('questions')
    .select('text, url')
    .eq('id', questionId)
    .single()

  if (qErr || !question) {
    return NextResponse.json(
      { error: qErr?.message ?? 'Pregunta no encontrada' },
      { status: 404 }
    )
  }

  try {
    const response = await openai.responses.parse({
      model: "gpt-4o-2024-08-06",
      input: [
        {
          role: "system",
          content:
        `Eres un teólogo cristiano bautista que respeta mucho la doctrina cristiana y que se preserve la integridad de las escrituras. Tu versión en la que te especializas es Reina Valera 1960. Tu tarea es corroborar que la siguiente pregunta se conteste de la manera correcta. Si no se responde de manera correcta, agrega una explicación breve y amigable en la que se le explique al usuario el por qué no es correcta.
        Cosas que deberías saber: Tus respuestas vienen de jóvenes con una edad promedio de 20 años.
        Estos jóvenes están practicando para una competencia de preguntas y respuestas sobre Jueces y Rut. No seas tan duro con ellos jaja
        Importante:
        -la cita correspondiente a la respuesta ya la otorga el sistema, omite sugerir citas.
        - Si la respuesta no tiene nada que ver con la pregunta, responde algo como "suerte con eso" y marcala como incorrecta
        ${question.text}

        Ejemplo de output:
        {
          "isCorrect": false,
          "explanation": "Ouch:( Cerca, pero recuerda que ese personaje aparece en...
        }
        `,
        },
        { role: "user", content: userAnswer },
      ],
      text: {
        format: zodTextFormat(anwserVerification, "anwser_verification"),
      },
    });

const anwserVerificationOutput = response.output_parsed;
console.log('anwserVerificationOutput:', anwserVerificationOutput)

    // 5) return structured response
    return NextResponse.json(anwserVerificationOutput)

  } catch (err) {
    console.error('Verification error:', err)
    return NextResponse.json(
      { error: 'No se pudo verificar la respuesta' },
      { status: 500 }
    )
  }
}
