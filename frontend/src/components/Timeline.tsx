import { useRef, useEffect } from 'react';

interface TimelineProps {
  duration: number;
  currentTime: number;
  onSeek?: (time: number) => void;
}

/**
 * Canvas-based timeline component with ruler and time markers
 */
export function Timeline({ duration, currentTime, onSeek }: TimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 80 * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = '80px';

    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, 80);

    // Background
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, rect.width, 80);

    if (duration <= 0) return;

    // Draw ruler
    ctx.strokeStyle = '#4b5563';
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';

    const pixelsPerSecond = rect.width / duration;
    const interval = duration > 60 ? 10 : duration > 30 ? 5 : 1;

    for (let time = 0; time <= duration; time += interval) {
      const x = time * pixelsPerSecond;

      // Major tick
      ctx.beginPath();
      ctx.moveTo(x, 60);
      ctx.lineTo(x, 80);
      ctx.stroke();

      // Time label
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      const label = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
      ctx.fillText(label, x + 2, 55);
    }

    // Draw minor ticks
    const minorInterval = interval / 5;
    for (let time = 0; time <= duration; time += minorInterval) {
      const x = time * pixelsPerSecond;

      if (time % interval !== 0) {
        ctx.beginPath();
        ctx.moveTo(x, 70);
        ctx.lineTo(x, 80);
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Draw playhead
    const playheadX = currentTime * pixelsPerSecond;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, 80);
    ctx.stroke();

    // Playhead circle
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(playheadX, 5, 5, 0, Math.PI * 2);
    ctx.fill();

  }, [duration, currentTime]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || duration <= 0 || !onSeek) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    onSeek(Math.max(0, Math.min(duration, time)));
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-2 text-gray-300">Timeline</h3>
      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className="cursor-pointer rounded"
        />
      </div>
    </div>
  );
}
