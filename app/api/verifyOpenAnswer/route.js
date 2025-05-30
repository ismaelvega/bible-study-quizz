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

// const model = "o3-mini-2025-01-31";
// const model = "o4-mini-2025-04-16";
// const model = "gpt-4o-2024-08-06";


export async function POST(req) {
  // 1) parse payload
  const { questionId, userAnswer, reference } = await req.json()

  // 1.5 checks if the length is huge
  if (userAnswer.length > 700) {
    return NextResponse.json(
      { error: 'La respuesta es demasiado larga' },
      { status: 400 }
    )
  }

  // 1.6 checks if the answer  contains a number, if so, use a reasoning model for accurate answers
  const containsNumber = /\d/.test(userAnswer);
  const model = containsNumber ? "o3-mini-2025-01-31" : "gpt-4o-mini-2024-07-18";

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
      model: model,
      input: [
        {
          role: "system",
          content:
        `Eres un teólogo cristiano bautista que respeta mucho la doctrina cristiana y que se preserve la integridad de las escrituras. Tu tarea es corroborar que la siguiente pregunta se conteste de la manera correcta. Si no se responde de manera correcta, agrega una explicación breve y amigable en la que se le explique al usuario el por qué no es correcta.
        Cosas que deberías saber: Tus respuestas vienen de jóvenes con una edad promedio de 20 años.
        Estos jóvenes están practicando para una competencia de preguntas y respuestas sobre Jueces y Rut. No seas tan duro con ellos jaja
        Importante:
        - La pregunta se basa en el pasaje ${reference}
        - Si vas a sugerir citas, omite la versión de la Biblia
        - Si responde algo como "No sé" o "No estoy seguro", considera que la respuesta es incorrecta y agrega una explicación breve y amigable.
        - Puede que el usuario conozca el nombre de las ciudades en versiones distintas, así que no te limites a Reina Valera 1960
        - Si la respuesta no tiene nada que ver con la pregunta, responde algo como "haha :) la respuesta correcta es: ..." y marcala como incorrecta
        ${question.text}

        Ejemplo de output:
        {
          "isCorrect": false,
          "explanation": "Ouch:( Cerca, pero recuerda que ese personaje aparece en...
        }
        {
          "isCorrect": true,
          "explanation": "¡Correcto! El personaje mencionado es..."
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

const jsonToReturn = {
  model,
  questionId,
  questionText: question.text,
  reference,
  isCorrect: anwserVerificationOutput.isCorrect,
  explanation: anwserVerificationOutput.explanation,
  userAnswer,
}
console.log('jsonToReturn:', jsonToReturn)

// 5) return structured response
return NextResponse.json(jsonToReturn)

} catch (err) {
  console.error('Verification error:', err)
    return NextResponse.json(
      { error: 'No se pudo verificar la respuesta' },
      { status: 500 }
    )
  }
}
