import { useState } from 'react';
import { TrimParams, SplitParams, EditResult, SplitResult } from '../types/edit';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Hook for video editing operations (trim, split)
 */
export function useVideoEdit() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimVideo = async (params: TrimParams): Promise<EditResult | null> => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/edit/trim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Trim failed');
      }

      const result = await response.json();
      setProcessing(false);
      return result as EditResult;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Trim failed';
      setError(errorMsg);
      setProcessing(false);
      return null;
    }
  };

  const splitVideo = async (params: SplitParams): Promise<SplitResult | null> => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/edit/split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Split failed');
      }

      const result = await response.json();
      setProcessing(false);
      return result as SplitResult;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Split failed';
      setError(errorMsg);
      setProcessing(false);
      return null;
    }
  };

  return {
    trimVideo,
    splitVideo,
    processing,
    error,
  };
}
