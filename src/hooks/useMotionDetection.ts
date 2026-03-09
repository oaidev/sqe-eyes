import { useRef, useCallback } from 'react';

const DOWNSCALE_W = 160;
const DOWNSCALE_H = 90;
const PIXEL_DIFF_THRESHOLD = 30; // RGB channel diff to count as "changed"
const MOTION_PERCENT_THRESHOLD = 0.05; // 5% of pixels must change

export function useMotionDetection() {
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const getCanvas = () => {
    if (!motionCanvasRef.current) {
      motionCanvasRef.current = document.createElement('canvas');
      motionCanvasRef.current.width = DOWNSCALE_W;
      motionCanvasRef.current.height = DOWNSCALE_H;
    }
    return motionCanvasRef.current;
  };

  const detectMotion = useCallback((videoEl: HTMLVideoElement): boolean => {
    if (!videoEl || videoEl.videoWidth === 0) return false;

    const canvas = getCanvas();
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.drawImage(videoEl, 0, 0, DOWNSCALE_W, DOWNSCALE_H);
    const currentData = ctx.getImageData(0, 0, DOWNSCALE_W, DOWNSCALE_H).data;

    const prev = prevFrameRef.current;
    prevFrameRef.current = new Uint8ClampedArray(currentData);

    if (!prev) return false; // First frame, no comparison

    const totalPixels = DOWNSCALE_W * DOWNSCALE_H;
    let changedPixels = 0;

    for (let i = 0; i < currentData.length; i += 4) {
      const rDiff = Math.abs(currentData[i] - prev[i]);
      const gDiff = Math.abs(currentData[i + 1] - prev[i + 1]);
      const bDiff = Math.abs(currentData[i + 2] - prev[i + 2]);
      if (rDiff > PIXEL_DIFF_THRESHOLD || gDiff > PIXEL_DIFF_THRESHOLD || bDiff > PIXEL_DIFF_THRESHOLD) {
        changedPixels++;
      }
    }

    return (changedPixels / totalPixels) > MOTION_PERCENT_THRESHOLD;
  }, []);

  const resetMotion = useCallback(() => {
    prevFrameRef.current = null;
  }, []);

  return { detectMotion, resetMotion };
}
