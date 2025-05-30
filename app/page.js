"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import MultipleChoiceQuestion from "../components/MultipleChoiceQuestion";
import OpenAnswerQuestion from "../components/OpenAnswerQuestion";

export default function Home() {
  const [allQuestions, setAllQuestions] = useState([]);
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
  const [numQuestions, setNumQuestions] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [questionType, setQuestionType] = useState(null);

  // Fisher–Yates shuffle
  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Fetch all questions on mount
  useEffect(() => {
    async function fetchAllQuestions() {
      setLoading(true);
      try {
        const res = await fetch("/api/getQuestions");
        const data = await res.json();
        if (Array.isArray(data)) {
          setAllQuestions(data);
        } else {
          setAllQuestions([]);
        }
      } catch (err) {
        setAllQuestions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAllQuestions();
  }, []);

  // When user chooses, shuffle and slice from allQuestions
  useEffect(() => {
    if (quizStarted && numQuestions && allQuestions.length > 0 && questionType) {
      setLoading(true);
      // Filter by type
      const filtered = allQuestions.filter(q =>
        questionType === "both"
          ? true
          : questionType === "multiple"
            ? q.options && q.type !== "open-answer"
            : !q.options || q.type === "open-answer"
      );
      const randomized = shuffleArray(filtered);
      setQuestions(
        numQuestions === "all"
          ? randomized
          : randomized.slice(0, Number(numQuestions))
      );
      setLoading(false);
    }
  }, [quizStarted, numQuestions, allQuestions, questionType]);

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
            reference: currentQuestion.reference,
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


  // Show selection screen before quiz starts
  if (!quizStarted) {
    if (loading) {
      return <div className="p-8 text-center">Cargando preguntas…</div>;
    }

    // Choose question type
    if (!questionType) {
      return (
        <>
          {/* Page Header - Remains for all pre-quiz steps */}
          <header className="bg-slate-800 text-white p-4 shadow-md h-16 flex items-center sticky top-0 z-50">
            <div className="container mx-auto flex justify-between items-center">
              <h1 className="text-xl font-semibold">Estudio Bíblico Interactivo</h1>
              {/* No "Configurar Quiz" button here as we are at the first step */}
            </div>
          </header>

          {/* Hero Header Text - ONLY FOR QUESTION TYPE SELECTION SCREEN */}
          <div className="bg-slate-700 text-white py-8 text-center">
            <div className="container mx-auto">
              <h2 className="text-4xl font-bold">Jueces 13 a Rut 3</h2>
              <p className="text-slate-300 mt-2 text-base">Pon a prueba tus conocimientos.</p>
            </div>
          </div>

          <main className="min-h-[calc(100vh-4rem-8rem)] flex items-center justify-center bg-gray-100 p-4"> {/* Adjusted min-height */}
            <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center border border-slate-200">
              <h1 className="text-3xl font-bold mb-8 text-slate-700">¿Qué tipo de preguntas prefieres?</h1>
              <div className="space-y-6"> {/* Increased spacing between options */}
                <div>
                  <button
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-all text-lg font-medium"
                    onClick={() => setQuestionType("multiple")}
                  >
                    <span className="text-2xl">📝</span> {/* Icon for multiple choice */}
                    Opción Múltiple
                  </button>
                  <p className="text-xs text-gray-500 mt-2">Elige la respuesta correcta entre varias opciones.</p>
                </div>
                <div>
                  <button
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-teal-500 text-white rounded-lg shadow-md hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75 transition-all text-lg font-medium"
                    onClick={() => setQuestionType("open")}
                  >
                    <span className="text-2xl">✍️</span> {/* Icon for open answer */}
                    Respuesta Abierta
                  </button>
                  <p className="text-xs text-gray-500 mt-2">Escribe tu propia respuesta a la pregunta.</p>
                </div>
                <div>
                  <button
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-500 text-white rounded-lg shadow-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 transition-all text-lg font-medium"
                    onClick={() => setQuestionType("both")}
                  >
                    <span className="text-2xl">🔀</span> {/* Icon for both */}
                    Ambas
                  </button>
                  <p className="text-xs text-gray-500 mt-2">Una mezcla de preguntas de opción múltiple y abiertas.</p>
                </div>
              </div>
            </div>
          </main>
        </>
      );
    }

    // - Choose number of questions screen
    // (The hero header will NOT be rendered here)
    const filteredQuestions = allQuestions.filter(q =>
      questionType === "both"
        ? true
        : questionType === "multiple"
          ? q.options && q.type !== "open-answer"
          : !q.options || q.type === "open-answer"
    );

    const possibleOptions = [20, 50, 100].filter(opt => opt <= filteredQuestions.length);
    if (filteredQuestions.length > 0) possibleOptions.push("all");

    if (filteredQuestions.length === 0 && !loading) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center border border-slate-200">
            <h1 className="text-2xl font-bold mb-4 text-slate-700">No hay preguntas disponibles</h1>
            <p className="text-gray-600 mb-6">
              No se encontraron preguntas para el tipo seleccionado. Por favor, intenta con otra opción.
            </p>
            <button
              onClick={() => setQuestionType(null)} // Go back to type selection
              className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-all text-lg font-medium"
            >
              Elegir otro tipo
            </button>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center border border-slate-200">
          <h1 className="text-3xl font-bold mb-6 text-slate-700">¿Cuántas preguntas quieres responder?</h1>
          <div className="mb-6 text-gray-600">
            Total disponibles para <span className="font-semibold text-slate-700">{questionType === "multiple" ? "Opción Múltiple" : questionType === "open" ? "Respuesta Abierta" : "Ambas"}</span>: 
            <span className="block text-2xl font-bold text-blue-600 mt-1">{filteredQuestions.length}</span>
          </div>
          <div className="space-y-4">
            {possibleOptions.map(opt => (
              <button
                key={opt}
                className={`w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg shadow-md transition-all text-lg font-medium
                  ${opt === "all"
                    ? "bg-green-500 hover:bg-green-600 focus:ring-green-400 text-white"
                    : "bg-blue-500 hover:bg-blue-600 focus:ring-blue-400 text-white"
                  }
                  focus:outline-none focus:ring-2 focus:ring-opacity-75
                `}
                onClick={() => {
                  setNumQuestions(opt);
                  setQuizStarted(true);
                }}
              >
                {/* Optional: Add icons here if desired */}
                {opt === "all" ? `Todas (${filteredQuestions.length})` : `${opt} preguntas`}
              </button>
            ))}
          </div>
          {filteredQuestions.length > 100 && (
             <p className="text-xs text-gray-500 mt-6">
               Prueba con 20 o 50 preguntas para un inicio más rápido.
             </p>
          )}
        </div>
      </main>
    );
  }

  const question = questions[currentIdx];

  // Optionally, handle the case where questions is empty
  if (!question) {
    // If quiz has started but no questions (e.g., filtered out all)
    if (quizStarted) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center border border-slate-200">
            <h1 className="text-2xl font-bold mb-4 text-slate-700">No hay preguntas disponibles</h1>
            <p className="text-gray-600 mb-6">
              No se encontraron preguntas para el tipo y número seleccionados.
            </p>
            <button
              onClick={() => {
                setQuizStarted(false);
                setQuestionType(null);
                setNumQuestions(null);
              }}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-all text-lg font-medium"
            >
              Volver a configurar
            </button>
          </div>
        </main>
      );
    }
    return <div className="p-8 text-center">Cargando preguntas o no hay preguntas disponibles...</div>;
  }

  // WHEN QUIZ HAS STARTED (The hero header will NOT be rendered here either)
  return (
    <>
      {/* Page Header */}
      <header className="bg-slate-800 text-white p-4 shadow-md h-16 flex items-center sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold">Estudio Bíblico Interactivo</h1>
          <button
            onClick={() => {
              const confirmReset = window.confirm(
                "¿Estás seguro de que quieres configurar un nuevo quiz? Perderás tu progreso actual."
              );
              if (confirmReset) {
                // Reset all quiz-related states to go back to selection
                setQuizStarted(false);
                setQuestionType(null);
                setNumQuestions(null);
                setCurrentIdx(0);
                setResults([]);
                setSkippedQuestions([]);
                setSelected(null);
                setOpenAnswer("");
                setVerified(false);
              }
            }}
            className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-md"
          >
            Configurar Quiz
          </button>
        </div>
      </header>

      {/* NO Hero Header Text here */}

      <main className="min-h-[calc(100vh-4rem)] bg-gray-50 flex flex-col items-center justify-start p-4 pt-8"> {/* Adjusted min-height */}
        <div className="relative bg-white border rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-xl mb-8">
          {/* Display Chosen Question Type */}
          {questionType && (
            <div className="text-center mb-4">
              <span className="text-sm font-semibold text-indigo-600 px-3 py-1 bg-indigo-100 rounded-full">
                Tipo de Quiz: {questionType === "multiple" ? "Opción Múltiple" : questionType === "open" ? "Respuesta Abierta" : "Ambas"}
              </span>
            </div>
          )}

          {/* PROGRESS BAR */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progreso
              </span>
              <span className="text-sm text-gray-500">
                {currentIdx + 1}/{questions.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
            {skippedQuestions.length > 0 && (
              <div className="text-xs text-orange-500 mt-1 text-center">
                Saltadas: {skippedQuestions.length}
              </div>
            )}
          </div>

          <div className="text-center mb-8">
            <p className="text-sm text-blue-600 mb-1 font-medium">
              Pregunta {question.id}:
            </p>
            <h1 className="text-3xl font-bold text-slate-800 leading-tight">
              {question.text}
            </h1>
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
                      <li key={chapter} className="flex flex-wrap items-center">
                        <span className="font-medium mr-2 whitespace-nowrap">{chapter}</span>
                        <div className="flex flex-wrap">
                          {Array.from({ length: cnt }).map((_, i) => (
                            <span key={i} className="text-green-500 text-xl mr-1" title={questions[i].text}>
                              ✅
                            </span>
                          ))}
                        </div>
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
                      <li key={chapter} className="flex flex-wrap items-center">
                        <span className="font-medium mr-2 whitespace-nowrap">{chapter}</span>
                        <div className="flex flex-wrap">
                          {Array.from({ length: cnt }).map((_, i) => (
                            <span key={i} className="text-red-500 text-xl mr-1" title={questions[i].text}>
                              ❌
                            </span>
                          ))}
                        </div>
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
