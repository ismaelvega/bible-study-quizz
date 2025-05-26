"use client"

import { useState, useEffect } from 'react';

export default function Home() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);

  const [selected, setSelected] = useState(null);
  const [verified, setVerified] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [correctIndex, setCorrectIndex] = useState(null);
  const [results, setResults] = useState([]);

  // 1. Fetch questions on mount
  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch('/api/getQuestions');
        const data = await res.json();
        setQuestions(data);
      } catch (err) {
        console.error('Failed to load questions', err);
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, []);

  // 2. Handle verify by calling /api/verify
  const handleVerify = async () => {
    if (selected === null) return;
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: questions[currentIdx].id,
          selectedIndex: selected
        }),
      });
      const { correct, correctIndex: idx } = await res.json();
      setIsCorrect(correct);
      setCorrectIndex(idx);
      setVerified(true);
      setResults(prev => [...prev, correct]);
    } catch (err) {
      console.error('Verification failed', err);
    }
  };

  const handleNext = () => {
    setCurrentIdx(i => i + 1);
    setSelected(null);
    setVerified(false);
    setIsCorrect(null);
    setCorrectIndex(null);
  };

  // Totals
  const correctCount = results.filter(r => r).length;
  const incorrectCount = results.length - correctCount;

  if (loading) return <div className="p-8 text-center">Cargando preguntas…</div>;
  if (!questions.length) return <div className="p-8 text-center">No hay preguntas.</div>;

  const question = questions[currentIdx];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-lg shadow p-8 w-full max-w-md">
        {/* Question */}
        <div className="text-center mb-6">
          <p className="text-sm text-blue-500 mb-1">Pregunta {question.id}:</p>
          <h1 className="text-2xl font-semibold">{question.text}</h1>
        </div>

        {/* Options */}
        <div className="space-y-4 mb-6">
          {question.options.map((opt, idx) => {
            let style = 'border-gray-800';
            if (selected === idx && !verified) style = 'bg-gray-200';
            if (verified) {
              if (idx === correctIndex) style = 'bg-green-100 border-green-500';
              else if (selected === idx && !isCorrect) style = 'bg-red-100 border-red-500';
              else style = 'border-gray-300';
            }
            return (
              <button
                key={idx}
                onClick={() => !verified && setSelected(idx)}
                disabled={verified}
                className={`w-full py-2 border rounded-lg text-lg font-medium ${style}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Passage Link: always show after verification */}
        {verified && (
          <a
            href={question.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline mb-4 block text-center"
          >
            ver: {question.reference}
          </a>
        )}

        {/* Results Summary */}
        {results.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap justify-center mb-2">
              {results.map((res, i) => (
                <span
                  key={i}
                  className={`text-2xl mr-1 ${res ? 'text-green-500' : 'text-red-500'}`}
                >
                  {res ? '✅' : '❌'}
                </span>
              ))}
            </div>
            <div className="text-center font-medium">
              Correctas: {correctCount} &nbsp; Incorrectas: {incorrectCount}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="text-center">
          {!verified ? (
            <button
              onClick={handleVerify}
              disabled={selected === null}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Verificar
            </button>
          ) : currentIdx < questions.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-yellow-400 text-gray-800 rounded hover:bg-yellow-500"
            >
              Siguiente
            </button>
          ) : (
            <div className="text-center font-semibold text-lg mt-4">
              ¡Has completado el quiz!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
