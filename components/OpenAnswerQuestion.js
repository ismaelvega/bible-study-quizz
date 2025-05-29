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
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className={`font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {/* There's a chance that the user is informed whether the answer is correct or not but the explanation is not provided */}
              {explanation ? explanation : (isCorrect ? "¡Respuesta correcta!" : "Respuesta incorrecta.")}
            </div>
            {/* Disclaimer. AI generated answer */}
            <div className="text-xs text-gray-500 mt-2">
              Nota: Esta respuesta fue generada por un modelo de IA y puede no ser 100% precisa.
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