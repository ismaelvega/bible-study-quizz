"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

export default function Home() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);

  const [selected, setSelected] = useState(null);
  const [verified, setVerified] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [correctIndex, setCorrectIndex] = useState(null);
  const [results, setResults] = useState([]);
  const [isVerifying, setIsVerifying] = useState(false);

  // Fisher–Yates shuffle
  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch("/api/getQuestions");
        const data = await res.json();
        // Shuffle right here
        const randomized = shuffleArray(data);
        setQuestions(randomized);
      } catch (err) {
        console.error("Failed to load questions", err);
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, []);

  const handleVerify = useCallback(async () => {
    // Guard: don't run if no option is selected, or if already verifying, or if already verified.
    if (selected === null || isVerifying || verified) return;

    setIsVerifying(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: questions[currentIdx]?.id,
          selectedIndex: selected,
        }),
      });
      const { correct, correctIndex: idx } = await res.json();
      setIsCorrect(correct);
      setCorrectIndex(idx);
      setVerified(true);
      setResults((prev) => [
        ...prev,
        { correct, reference: questions[currentIdx]?.reference },
      ]);
    } catch (err) {
      console.error("Verification failed", err);
      // Optionally, reset some state or show an error message to the user
    } finally {
      setIsVerifying(false);
    }
  }, [selected, isVerifying, verified, questions, currentIdx, setIsVerifying, setIsCorrect, setCorrectIndex, setVerified, setResults]);

  // Effect to automatically verify when an option is selected
  useEffect(() => {
    // Only run verify if:
    // 1. An option has been selected (selected !== null)
    // 2. The current question hasn't been verified yet (!verified)
    // 3. We are not already in the process of verifying (!isVerifying)
    if (selected !== null && !verified && !isVerifying) {
      handleVerify();
    }
  }, [selected, verified, isVerifying, handleVerify]);


  const handleNext = () => {
    setCurrentIdx((i) => i + 1);
    setSelected(null);
    setVerified(false);
    setIsCorrect(null);
    setCorrectIndex(null);
  };

  // Compute total counts
  const correctCount = results.filter((r) => r.correct).length;
  const incorrectCount = results.length - correctCount;

  // Group by "Book Chapter"
  const { correctGroups, incorrectGroups } = useMemo(() => {
    return results.reduce(
      (acc, { correct, reference }) => {
        const chapter = reference.split(":")[0]; // e.g. "Jueces 10"
        if (correct) {
          acc.correctGroups[chapter] = (acc.correctGroups[chapter] || 0) + 1;
        } else {
          acc.incorrectGroups[chapter] =
            (acc.incorrectGroups[chapter] || 0) + 1;
        }
        return acc;
      },
      { correctGroups: {}, incorrectGroups: {} }
    );
  }, [results]);

  // thresholds
  const MIN_CORRECT = 3;
  const MIN_INCORRECT = 3;

  // filter per-chapter mastery & practice lists
  const mastered = Object.entries(correctGroups)
  .filter(([chapter, cnt]) => cnt >= MIN_CORRECT)
  .sort(([, aCount], [, bCount]) => bCount - aCount);

  const needsPractice = Object.entries(incorrectGroups)
  .filter(([chapter, cnt]) => cnt >= MIN_INCORRECT)
  .sort(([, aCount], [, bCount]) => bCount - aCount);


  if (loading)
    return <div className="p-8 text-center">Cargando preguntas…</div>;
  if (!questions.length)
    return <div className="p-8 text-center">No hay preguntas.</div>;

  const question = questions[currentIdx];

  return (
    <>
      {/* Page Header */}
      <header className="bg-slate-800 text-white p-4 shadow-md h-16 flex items-center">
        <div className="container mx-auto">
          <h1 className="text-xl font-semibold">Estudia Jueces y Rut</h1>
        </div>
      </header>

      <main className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center p-4">
        <div className="relative bg-white border rounded-lg shadow p-8 w-full max-w-md">
          {/* PROGRESS INDICATOR */}
          <div className="absolute top-2 right-4 text-sm text-gray-500">
            Progreso: {currentIdx + 1}/{questions.length}
          </div>
          <div className="text-center mb-6">
            <p className="text-sm text-blue-500 mb-1">
              Pregunta {question.id}:{" "}
            </p>
            <h1 className="text-2xl font-semibold">{question.text}</h1>
          </div>

          {/* Options */}
          <div className="space-y-4 mb-6">
            {question.options.map((opt, idx) => {
              let style = "border-gray-800";
              if (selected === idx && !verified) style = "bg-gray-200";
              if (verified) {
                if (idx === correctIndex)
                  style = "bg-green-100 border-green-500";
                else if (selected === idx && !isCorrect)
                  style = "bg-red-100 border-red-500";
                else style = "border-gray-300";
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

          {/* Action Button */}
          <div className="text-center">
            {verified ? (
              currentIdx < questions.length - 1 ? (
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
              )
            ) : (
              <div className="h-[36px] flex items-center justify-center"> {/* Placeholder to maintain layout space */}
                {isVerifying && (
                  <p className="text-blue-500">Verificando…</p>
                )}
              </div>
            )}
          </div>

          {/* Results Summary (icons + counts) */}
          {results.length > 0 && (
            <div className="mb-4 mt-4">
              <div className="text-center font-medium">
                Correctas: {correctCount} &nbsp; Incorrectas: {incorrectCount}
              </div>
              <div className="flex flex-wrap justify-center mb-2">
                {results.map((r, i) => (
                  <span
                    key={i}
                    className={`text-2xl mr-1 ${
                      r.correct ? "text-green-500" : "text-red-500"
                    }`}
                    title={questions[i].text}
                  >
                    {r.correct ? "✅" : "❌"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Chapter mastery and suggestions */}
          {results.length > 0 && (
            <>
              {mastered.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-green-600 font-semibold">Ya dominas</h2>
                  <ul className="mt-2 space-y-1">
                    {mastered.map(([chapter, cnt]) => (
                      <li key={chapter} className="flex items-center">
                        <span className="font-medium mr-2">{chapter}</span>
                        {Array.from({ length: cnt }).map((_, i) => (
                          <span key={i} className="text-green-500 text-xl mr-1" title={questions[i].text}>
                            ✅
                          </span>
                        ))}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {needsPractice.length > 0 && (
                <div className="mt-4">
                  <h2 className="text-blue-600 font-semibold">
                    Te sugerimos leer:
                  </h2>
                  <ul className="mt-2 space-y-1">
                    {needsPractice.map(([chapter, cnt]) => (
                      <li key={chapter} className="flex items-center">
                        <span className="font-medium mr-2">{chapter}</span>
                        {Array.from({ length: cnt }).map((_, i) => (
                          <span key={i} className="text-red-500 text-xl mr-1">
                            ❌
                          </span>
                        ))}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
