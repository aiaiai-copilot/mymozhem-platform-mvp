import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { platform } from '@/lib/platform';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  timeLimit?: number;
}

export function CreateQuizPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);

  // Current question being edited
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [timeLimit, setTimeLimit] = useState<number | undefined>(undefined);

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectIndex(0);
    setTimeLimit(undefined);
  };

  const addQuestion = () => {
    if (!questionText.trim() || options.some(o => !o.trim())) {
      setError('Please fill in all question fields');
      return;
    }

    const newQuestion: Question = {
      id: editingQuestion?.id || `q_${Date.now()}`,
      text: questionText.trim(),
      options: options.map(o => o.trim()),
      correctIndex,
      timeLimit,
    };

    if (editingQuestion) {
      setQuestions(questions.map(q => q.id === editingQuestion.id ? newQuestion : q));
    } else {
      setQuestions([...questions, newQuestion]);
    }

    resetQuestionForm();
    setError('');
  };

  const editQuestion = (question: Question) => {
    setEditingQuestion(question);
    setQuestionText(question.text);
    setOptions([...question.options]);
    setCorrectIndex(question.correctIndex);
    setTimeLimit(question.timeLimit);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    if (editingQuestion?.id === id) {
      resetQuestionForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a quiz name');
      return;
    }

    if (questions.length === 0) {
      setError('Please add at least one question');
      return;
    }

    setIsLoading(true);

    try {
      const { data: room } = await platform.rooms.create({
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
        appId: 'app_quiz_v1',
        appSettings: {
          questions,
          currentQuestionIndex: -1,
          quizStatus: 'WAITING',
        },
      });

      if (room) {
        // Create a "Quiz Point" prize for tracking round wins
        await platform.prizes.create(room.id, {
          name: 'Quiz Point',
          description: 'Awarded for winning a quiz round',
          quantity: questions.length,
        });

        navigate(`/quiz/${room.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quiz');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Quiz</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Quiz Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quiz Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border"
                placeholder="Enter quiz name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border"
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="isPublic" className="text-sm text-gray-700">
                Public quiz (visible to everyone)
              </label>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            Questions ({questions.length})
          </h2>

          {questions.length === 0 ? (
            <p className="text-gray-500 text-sm">No questions added yet</p>
          ) : (
            <div className="space-y-3 mb-4">
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <span className="font-medium">
                      {index + 1}. {q.text}
                    </span>
                    <div className="text-sm text-gray-500 mt-1">
                      {q.options.length} options
                      {q.timeLimit && ` | ${q.timeLimit}s time limit`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editQuestion(q)}
                      className="text-purple-600 hover:text-purple-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Question */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingQuestion ? 'Edit Question' : 'Add Question'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Text
              </label>
              <input
                type="text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border"
                placeholder="Enter your question"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Answer Options (select correct answer)
              </label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={correctIndex === index}
                      onChange={() => setCorrectIndex(index)}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="w-8 text-sm text-gray-500">
                      {['A', 'B', 'C', 'D'][index]}.
                    </span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...options];
                        newOptions[index] = e.target.value;
                        setOptions(newOptions);
                      }}
                      className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border"
                      placeholder={`Option ${['A', 'B', 'C', 'D'][index]}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Limit (seconds, optional)
              </label>
              <input
                type="number"
                value={timeLimit || ''}
                onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-32 rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border"
                placeholder="No limit"
                min={5}
                max={120}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={addQuestion}
                className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
              >
                {editingQuestion ? 'Update Question' : 'Add Question'}
              </button>
              {editingQuestion && (
                <button
                  type="button"
                  onClick={resetQuestionForm}
                  className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || questions.length === 0}
            className="bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-lg font-semibold"
          >
            {isLoading ? 'Creating...' : 'Create Quiz'}
          </button>
        </div>
      </form>
    </div>
  );
}
