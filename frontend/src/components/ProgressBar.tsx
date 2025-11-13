interface ProgressBarProps {
  progress: number;
  operation?: string;
  message?: string;
}

/**
 * Progress bar component for showing operation progress
 */
export function ProgressBar({ progress, operation, message }: ProgressBarProps) {
  return (
    <div className="fixed bottom-4 right-4 w-80 bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">
            {operation || 'Processing'}
          </span>
          <span className="text-sm text-gray-400">{Math.round(progress)}%</span>
        </div>

        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {message && (
          <p className="text-xs text-gray-400">{message}</p>
        )}
      </div>
    </div>
  );
}
