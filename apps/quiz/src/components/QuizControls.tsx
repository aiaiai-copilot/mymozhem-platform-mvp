interface QuizControlsProps {
  quizStatus: 'WAITING' | 'QUESTION_ACTIVE' | 'BETWEEN_ROUNDS' | 'FINISHED';
  questionIndex: number;
  totalQuestions: number;
  onStartQuiz: () => void;
  onNextQuestion: () => void;
  onEndQuiz: () => void;
  isLoading?: boolean;
}

export function QuizControls({
  quizStatus,
  questionIndex,
  totalQuestions,
  onStartQuiz,
  onNextQuestion,
  onEndQuiz,
  isLoading = false,
}: QuizControlsProps) {
  const isLastQuestion = questionIndex >= totalQuestions - 1;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-semibold text-gray-700 mb-3">Quiz Controls</h3>

      <div className="space-y-3">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Status:</span>
          <StatusBadge status={quizStatus} />
        </div>

        {/* Progress */}
        {quizStatus !== 'WAITING' && quizStatus !== 'FINISHED' && (
          <div className="text-sm text-gray-600">
            Question {questionIndex + 1} of {totalQuestions}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          {quizStatus === 'WAITING' && (
            <button
              onClick={onStartQuiz}
              disabled={isLoading || totalQuestions === 0}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoading ? 'Starting...' : 'Start Quiz'}
            </button>
          )}

          {quizStatus === 'BETWEEN_ROUNDS' && !isLastQuestion && (
            <button
              onClick={onNextQuestion}
              disabled={isLoading}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Next Question'}
            </button>
          )}

          {quizStatus === 'BETWEEN_ROUNDS' && isLastQuestion && (
            <button
              onClick={onEndQuiz}
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Finishing...' : 'Show Final Results'}
            </button>
          )}

          {quizStatus === 'QUESTION_ACTIVE' && (
            <div className="text-center text-sm text-gray-500">
              Waiting for answers...
            </div>
          )}

          {quizStatus === 'FINISHED' && (
            <div className="text-center text-green-600 font-medium">
              Quiz Complete!
            </div>
          )}
        </div>

        {/* Warnings */}
        {totalQuestions === 0 && quizStatus === 'WAITING' && (
          <p className="text-sm text-red-500">
            No questions added yet. Add questions to start the quiz.
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    WAITING: 'bg-yellow-100 text-yellow-800',
    QUESTION_ACTIVE: 'bg-green-100 text-green-800',
    BETWEEN_ROUNDS: 'bg-blue-100 text-blue-800',
    FINISHED: 'bg-gray-100 text-gray-800',
  };

  const labels: Record<string, string> = {
    WAITING: 'Waiting',
    QUESTION_ACTIVE: 'Question Active',
    BETWEEN_ROUNDS: 'Between Rounds',
    FINISHED: 'Finished',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.WAITING}`}>
      {labels[status] || status}
    </span>
  );
}
