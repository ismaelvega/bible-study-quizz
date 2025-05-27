"use client";

export default function MultipleChoiceQuestion({ 
  question, 
  selected, 
  setSelected, 
  verified, 
  isCorrect, 
  correctIndex 
}) {
  return (
    <div className="space-y-4 mb-6">
      {question.options?.map((opt, idx) => {
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
  );
}