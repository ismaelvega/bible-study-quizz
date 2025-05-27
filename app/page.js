"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import MultipleChoiceQuestion from "../components/MultipleChoiceQuestion";
import OpenAnswerQuestion from "../components/OpenAnswerQuestion";

export default function Home() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);

  const [selected, setSelected] = useState(null);
  const [openAnswer, setOpenAnswer] = useState("");
  const [verified, setVerified] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [correctIndex, setCorrectIndex] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [results, setResults] = useState([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [skippedQuestions, setSkippedQuestions] = useState([]);

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
        // Check if data is an array before shuffling
        if (Array.isArray(data)) {
          const randomized = shuffleArray(data);
          setQuestions(randomized);
        } else {
          console.error("API returned non-array data:", data);
          setQuestions([]);
        }
      } catch (err) {
        console.error("Failed to load questions", err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, []);

  const handleVerify = useCallback(async () => {
    const currentQuestion = questions[currentIdx];
    if (!currentQuestion || isVerifying || verified) return;
    
    // Check if we have an answer for the current question type
    if (currentQuestion.type === 'open-answer' || !currentQuestion.options) {
      if (!openAnswer.trim()) return;
    } else {
      if (selected === null) return;
    }

    setIsVerifying(true);
    try {
      let correct = false;
      
      if (currentQuestion.type === 'open-answer' || !currentQuestion.options) {
        // check anwsers' length
        if (openAnswer.length > 401){
          return
        }

        const res = await fetch("/api/verifyOpenAnswer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: currentQuestion.id,
            userAnswer: openAnswer,
          }),
        });
        const { isCorrect: isAnswerCorrect, explanation: exp } = await res.json();
        correct = isAnswerCorrect;
        setIsCorrect(correct);
        setExplanation(exp);
      } else {
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: currentQuestion.id,
            selectedIndex: selected,
          }),
        });
        const { correct: isAnswerCorrect, correctIndex: idx } = await res.json();
        correct = isAnswerCorrect;
        setIsCorrect(correct);
        setCorrectIndex(idx);
      }
      
      setVerified(true);
      setResults((prev) => [
        ...prev,
        { correct, reference: currentQuestion.reference },
      ]);
    } catch (err) {
      console.error("Verification failed", err);
    } finally {
      setIsVerifying(false);
    }
  }, [selected, openAnswer, isVerifying, verified, questions, currentIdx]);

  // Effect to automatically verify when an option is selected (only for multiple choice)
  useEffect(() => {
    const currentQuestion = questions[currentIdx];
    if (!currentQuestion || currentQuestion.type === 'open-answer' || !currentQuestion.options) return;
    
    // Only run verify if:
    // 1. An option has been selected (selected !== null)
    // 2. The current question hasn't been verified yet (!verified)
    // 3. We are not already in the process of verifying (!isVerifying)
    if (selected !== null && !verified && !isVerifying) {
      handleVerify();
    }
  }, [selected, verified, isVerifying, handleVerify, questions, currentIdx]);


  const handleNext = () => {
    setCurrentIdx((i) => i + 1);
    setSelected(null);
    setOpenAnswer("");
    setVerified(false);
    setIsCorrect(null);
    setCorrectIndex(null);
    setExplanation("");
    setCorrectAnswer("");
  };

  const handleSkip = () => {
    const currentQuestion = questions[currentIdx];
    
    // Add current question to skipped list
    setSkippedQuestions(prev => [...prev, currentQuestion]);
    
    // Remove current question from main questions array and add it to the end
    setQuestions(prev => {
      const newQuestions = [...prev];
      const skippedQ = newQuestions.splice(currentIdx, 1)[0];
      newQuestions.push(skippedQ);
      return newQuestions;
    });
    
    // Reset form state but don't increment currentIdx since we removed current question
    setSelected(null);
    setOpenAnswer("");
    setVerified(false);
    setIsCorrect(null);
    setCorrectIndex(null);
    setExplanation("");
    setCorrectAnswer("");
  };

  // Compute total counts
  const correctCount = results.filter((r) => r.correct).length;
  const incorrectCount = results.length - correctCount;

  // Group by "Book Chapter"
  const { correctGroups, incorrectGroups } = useMemo(() => {
    return results.reduce(
      (acc, { correct, reference }) => {
        const chapter = reference.split(":")[0];
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
            <div>Progreso: {currentIdx + 1}/{questions.length}</div>
            {skippedQuestions.length > 0 && (
              <div className="text-xs text-orange-500">
                Saltadas: {skippedQuestions.length}
              </div>
            )}
          </div>
          <div className="text-center mb-6">
            <p className="text-sm text-blue-500 mb-1">
              Pregunta {question.id}:
            </p>
            <h1 className="text-2xl font-semibold">{question.text}</h1>
          </div>

          {/* Question Input */}
          {question.type === 'open-answer' || !question.options ? (
            <OpenAnswerQuestion
              openAnswer={openAnswer}
              setOpenAnswer={setOpenAnswer}
              verified={verified}
              isCorrect={isCorrect}
              explanation={explanation}
              onVerify={handleVerify}
              isVerifying={isVerifying}
            />
          ) : (
            <MultipleChoiceQuestion
              question={question}
              selected={selected}
              setSelected={setSelected}
              verified={verified}
              isCorrect={isCorrect}
              correctIndex={correctIndex}
            />
          )}

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

          {/* Action Buttons */}
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
              <div className="flex items-center justify-center gap-3 h-[36px]">
                {question.options && question.type !== 'open-answer' && isVerifying ? (
                  <p className="text-blue-500">Verificando…</p>
                ) : question.type === 'open-answer' || !question.options ? (
                  <button
                    onClick={handleSkip}
                    className="px-4 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Paso
                  </button>
                ) : null}
              </div>
            )}
          </div>

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

          
        </div>
      </main>
    </>
  );
}
