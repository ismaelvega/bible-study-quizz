"use client";

export default function MultipleChoiceQuestion({
  question,
  selected,
  setSelected,
  verified,
  isCorrect,
  correctIndex,
}) {
  return (
    <div className="space-y-3 mb-6">
      {question.options.map((option, index) => (
        <button
          key={index}
          onClick={() => !verified && setSelected(index)}
          disabled={verified}
          className={`w-full text-left p-4 border rounded-lg text-lg transition-all duration-150 ease-in-out
            ${verified
              ? index === correctIndex
                ? "bg-green-100 border-green-400 text-green-700 font-semibold" // Correct answer
                : index === selected && !isCorrect
                ? "bg-red-100 border-red-400 text-red-700" // Incorrect selected
                : "bg-gray-50 border-gray-300 text-gray-500" // Other options
              : selected === index
              ? "bg-blue-100 border-blue-500 ring-2 ring-blue-300" // Selected before verification
              : "bg-white border-gray-300 hover:bg-gray-100 hover:border-gray-400" // Default
            }
          `}
        >
          <span className="mr-2 font-medium">
            {String.fromCharCode(65 + index)}.
          </span>{" "}
          {/* A, B, C... */}
          {option}
        </button>
      ))}
    </div>
  );
}