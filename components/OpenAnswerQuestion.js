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
              {explanation}
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