import { useState } from 'react';
import { Subtitle } from '../types/subtitle';

interface SubtitleEditorProps {
  subtitles: Subtitle[];
  currentTime: number;
  onSubtitlesChange: (subtitles: Subtitle[]) => void;
}

/**
 * Subtitle editor component for adding, editing, and removing subtitles
 */
export function SubtitleEditor({ subtitles, currentTime, onSubtitlesChange }: SubtitleEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSubText, setNewSubText] = useState('');
  const [newSubStart, setNewSubStart] = useState(0);
  const [newSubDuration, setNewSubDuration] = useState(3);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds);
    const secs = Math.floor((seconds % 1) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAdd = () => {
    if (!newSubText.trim()) {
      alert('Please enter subtitle text');
      return;
    }

    const newSubtitle: Subtitle = {
      id: `sub-${Date.now()}`,
      text: newSubText.trim(),
      startTime: newSubStart,
      duration: newSubDuration,
    };

    onSubtitlesChange([...subtitles, newSubtitle].sort((a, b) => a.startTime - b.startTime));
    setNewSubText('');
    setNewSubStart(currentTime);
  };

  const handleRemove = (id: string) => {
    onSubtitlesChange(subtitles.filter((sub) => sub.id !== id));
  };

  const handleEdit = (id: string, updates: Partial<Subtitle>) => {
    onSubtitlesChange(
      subtitles.map((sub) =>
        sub.id === id ? { ...sub, ...updates } : sub
      )
    );
    setEditingId(null);
  };

  const setStartToCurrent = () => {
    setNewSubStart(currentTime);
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-300">Subtitles</h4>

      {/* Add New Subtitle */}
      <div className="space-y-3 p-3 bg-gray-700 rounded">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Text</label>
          <input
            type="text"
            value={newSubText}
            onChange={(e) => setNewSubText(e.target.value)}
            placeholder="Enter subtitle text..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Start: {formatTime(newSubStart)}
            </label>
            <div className="flex gap-1">
              <input
                type="number"
                value={newSubStart.toFixed(1)}
                onChange={(e) => setNewSubStart(parseFloat(e.target.value) || 0)}
                step="0.1"
                className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={setStartToCurrent}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
              >
                Now
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Duration: {newSubDuration}s
            </label>
            <input
              type="number"
              value={newSubDuration}
              onChange={(e) => setNewSubDuration(parseFloat(e.target.value) || 1)}
              step="0.5"
              min="0.5"
              max="10"
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleAdd}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
        >
          + Add Subtitle
        </button>
      </div>

      {/* Subtitle List */}
      {subtitles.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-gray-400">
            {subtitles.length} subtitle{subtitles.length !== 1 ? 's' : ''}
          </div>
          {subtitles.map((sub) => (
            <div
              key={sub.id}
              className="p-3 bg-gray-700 rounded space-y-2"
            >
              {editingId === sub.id ? (
                <>
                  <input
                    type="text"
                    value={sub.text}
                    onChange={(e) => handleEdit(sub.id, { text: e.target.value })}
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm">{sub.text}</div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {formatTime(sub.startTime)} - {formatTime(sub.startTime + sub.duration)}
                      {' '}({sub.duration}s)
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingId(sub.id)}
                        className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemove(sub.id)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
