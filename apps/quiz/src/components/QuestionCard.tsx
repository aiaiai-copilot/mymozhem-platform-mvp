import { useState, useEffect } from 'react';
import { AnswerButton } from './AnswerButton';

interface QuestionCardProps {
  question: {
    id: string;
    text: string;
    options: string[];
    timeLimit?: number;
  };
  questionIndex: number;
  totalQuestions: number;
  hasAnswered: boolean;
  myAnswer: number | null;
  onAnswer: (answerIndex: number) => void;
  disabled?: boolean;
}

export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  hasAnswered,
  myAnswer,
  onAnswer,
  disabled = false,
}: QuestionCardProps) {
  const [timeLeft, setTimeLeft] = useState(question.timeLimit || 0);

  // Timer countdown
  useEffect(() => {
    if (!question.timeLimit || hasAnswered) return;

    setTimeLeft(question.timeLimit);
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [question.id, question.timeLimit, hasAnswered]);

  const isTimedOut = Boolean(question.timeLimit && timeLeft === 0 && !hasAnswered);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
        {question.timeLimit && !hasAnswered && (
          <span
            className={`text-lg font-bold ${
              timeLeft <= 5 ? 'text-red-600' : 'text-gray-700'
            }`}
          >
            {timeLeft}s
          </span>
        )}
      </div>

      {/* Question */}
      <h2 className="text-xl font-semibold mb-6">{question.text}</h2>

      {/* Answer options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {question.options.map((option, index) => (
          <AnswerButton
            key={index}
            option={option}
            index={index}
            onClick={() => onAnswer(index)}
            disabled={disabled || hasAnswered || isTimedOut}
            selected={myAnswer === index}
          />
        ))}
      </div>

      {/* Feedback */}
      {hasAnswered && (
        <div className="mt-4 text-center">
          <span className="text-purple-600 font-medium">
            Answer submitted! Waiting for results...
          </span>
        </div>
      )}

      {isTimedOut && (
        <div className="mt-4 text-center">
          <span className="text-red-600 font-medium">
            Time's up! You didn't answer in time.
          </span>
        </div>
      )}
    </div>
  );
}
