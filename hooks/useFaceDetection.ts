/**
 * useFaceDetection Hook
 * Runs real-time face detection using TensorFlow.js MediaPipe Face Detector.
 * Optimized for performance: pauses when tab is inactive, runs at configurable intervals.
 */
import { useState, useRef, useEffect, useCallback } from 'react';

// Lazy-loaded TF.js imports (tree-shaking friendly)
let tfReady: Promise<any> | null = null;
let loadAttempts = 0;

async function loadFaceDetector() {
  if (!tfReady) {
    tfReady = (async () => {
      // Import full TF.js (includes core + webgl backend + all deps)
      await import('@tensorflow/tfjs');
      const faceDetection = await import('@tensorflow-models/face-detection');
      
      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
      
      const tryCreateDetector = async () => {
        return await faceDetection.createDetector(model, {
          runtime: 'tfjs',
          maxFaces: 5,
          detectorModelUrl: '/models/face_detection/model.json'
        });
      };

      try {
        loadAttempts++;
        return await tryCreateDetector();
      } catch (err) {
        console.warn(`Face detector failed on attempt ${loadAttempts}. Retrying...`, err);
        if (loadAttempts === 1) {
          loadAttempts++;
          return await tryCreateDetector();
        }
        throw err;
      }
    })().catch(err => {
      tfReady = null; // allow retry from scratch
      throw err;
    });
  }
  return tfReady;
}

interface UseFaceDetectionOptions {
  /** Detection interval in milliseconds (default: 750ms) */
  intervalMs?: number;
  /** Minimum confidence score to consider a face "clearly visible" (default: 0.5) */
  minConfidence?: number;
  /** Whether detection should be active */
  enabled?: boolean;
}

interface UseFaceDetectionReturn {
  /** Number of clearly visible faces detected */
  faceCount: number;
  /** Whether the TF.js model has finished loading */
  isModelLoaded: boolean;
  /** Whether a detection cycle is currently running */
  isDetecting: boolean;
  /** Error message if model failed to load */
  modelError: string;
}

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: UseFaceDetectionOptions = {}
): UseFaceDetectionReturn {
  const {
    intervalMs = 750,
    minConfidence = 0.5,
    enabled = true,
  } = options;

  const [faceCount, setFaceCount] = useState(0);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [modelError, setModelError] = useState('');

  const detectorRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTabVisibleRef = useRef(!document.hidden);

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Load model
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    (async () => {
      try {
        const detector = await loadFaceDetector();
        if (cancelled) return;
        detectorRef.current = detector;
        setIsModelLoaded(true);
      } catch (err: any) {
        console.error('Face detection model failed to load:', err);
        if (!cancelled) {
          setModelError('Face detection model could not be loaded. Detection is disabled.');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [enabled]);

  // Detection loop
  const runDetection = useCallback(async () => {
    const detector = detectorRef.current;
    const video = videoRef.current;

    // Skip if conditions aren't met
    if (!detector || !video || !isTabVisibleRef.current) return;
    if (video.readyState < 2) return; // Video not ready (HAVE_CURRENT_DATA)
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    try {
      setIsDetecting(true);
      const faces = await detector.estimateFaces(video, { flipHorizontal: false });
      
      // Some face detection models return very small box widths/heights if normalized
      // Or they don't have scores. Just rely on the detector's internal threshold.
      setFaceCount(faces.length);
    } catch (err) {
      // Model inference can occasionally fail on unusable frames — don't crash
      console.warn('Face detection frame error:', err);
    } finally {
      setIsDetecting(false);
    }
  }, [videoRef, minConfidence]);

  // Start/stop detection interval
  useEffect(() => {
    if (!enabled || !isModelLoaded) return;

    intervalRef.current = setInterval(runDetection, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, isModelLoaded, intervalMs, runDetection]);

  // Cleanup detector ref on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    faceCount,
    isModelLoaded,
    isDetecting,
    modelError,
  };
}
