interface AnswerButtonProps {
  option: string;
  index: number;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const OPTION_COLORS = [
  'hover:bg-red-50 hover:border-red-300',
  'hover:bg-blue-50 hover:border-blue-300',
  'hover:bg-yellow-50 hover:border-yellow-300',
  'hover:bg-green-50 hover:border-green-300',
];
const SELECTED_COLORS = [
  'bg-red-100 border-red-500',
  'bg-blue-100 border-blue-500',
  'bg-yellow-100 border-yellow-500',
  'bg-green-100 border-green-500',
];

export function AnswerButton({
  option,
  index,
  onClick,
  disabled = false,
  selected = false,
}: AnswerButtonProps) {
  const baseClasses = 'w-full p-4 rounded-lg border-2 text-left transition-all';
  const enabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed border-gray-200'
    : `cursor-pointer ${OPTION_COLORS[index]} border-gray-200`;
  const selectedClasses = selected ? SELECTED_COLORS[index] : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${enabledClasses} ${selectedClasses}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            selected ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {OPTION_LETTERS[index]}
        </span>
        <span className="text-gray-800">{option}</span>
      </div>
    </button>
  );
}
