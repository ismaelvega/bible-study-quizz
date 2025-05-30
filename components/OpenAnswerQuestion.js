"use client";

export default function OpenAnswerQuestion({ 
  openAnswer, 
  setOpenAnswer, 
  verified, 
  isCorrect, 
  explanation,
  onVerify,
  isVerifying 
}) {
  return (
    <div className="space-y-4 mb-6">
      <div>
        <textarea
          value={openAnswer}
          onChange={(e) => setOpenAnswer(e.target.value)}
          disabled={verified}
          placeholder="Escribe tu respuesta aquí..."
          maxLength={400}
          required
          className={`w-full p-3 border rounded-lg text-lg ${
            verified 
              ? (isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500')
              : 'border-gray-300'
          }`}
          rows={4}
        />
        {verified && (
          <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
            isCorrect ? "bg-green-50 border border-green-400" : "bg-amber-50 border border-amber-400"
          }`}>
            <span className={`text-2xl mt-0.5 ${isCorrect ? "text-green-500" : "text-amber-500"}`}>
              {isCorrect ? "✅" : "💡"}
            </span>
            <div>
              <div className={`font-medium ${isCorrect ? "text-green-700" : "text-amber-700"}`}>
                {explanation ? explanation : (isCorrect ? "¡Respuesta correcta!" : "Respuesta incorrecta.")}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Nota: Esta respuesta fue generada por un modelo de IA y puede no ser 100% precisa.
              </div>
            </div>
          </div>
        )}
      </div>

      {!verified && (
        <div className="text-center">
          <button
            onClick={onVerify}
            disabled={!openAnswer.trim() || isVerifying}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isVerifying ? "Verificando…" : "Verificar"}
          </button>
        </div>
      )}
    </div>
  );
}