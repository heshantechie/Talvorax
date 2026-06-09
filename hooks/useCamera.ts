/**
 * useCamera Hook
 * Manages camera + microphone access via getUserMedia (WebRTC).
 * Provides a MediaStream for live video preview.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export type CameraStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'error';

interface UseCameraReturn {
  /** Ref to attach to a <video> element for live preview */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** The raw MediaStream (video+audio) */
  stream: MediaStream | null;
  /** Current camera status */
  status: CameraStatus;
  /** Human-readable error message (if any) */
  errorMessage: string;
  /** Request camera permission and start the stream */
  startCamera: () => Promise<void>;
  /** Stop the camera stream and release resources */
  stopCamera: () => void;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
  }, []);

  const startCamera = useCallback(async () => {
    // Already active
    if (streamRef.current && status === 'active') return;

    setStatus('requesting');
    setErrorMessage('');

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: true,
      });

      if (!isMountedRef.current) {
        // Component unmounted while waiting for permission, stop it to free the camera
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      // If we already had a stream (e.g. strict mode fast refresh), stop the old one
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      streamRef.current = mediaStream;

      // Attach to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true; // Prevent echo
        try {
          await videoRef.current.play();
        } catch {
          // Autoplay may fail in some browsers — user interaction will fix it
        }
      }

      setStatus('active');
    } catch (err: any) {
      console.error('Camera access failed:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus('denied');
        setErrorMessage(
          'Camera permission was denied. Please allow camera access in your browser settings and reload the page.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setStatus('error');
        setErrorMessage('No camera found. Please connect a camera and try again.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setStatus('error');
        setErrorMessage(
          'Camera is already in use by another application. Please close other apps using the camera.'
        );
      } else {
        setStatus('error');
        setErrorMessage('Failed to access camera. Please check your device and try again.');
      }
    }
  }, [status]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    videoRef,
    stream: streamRef.current,
    status,
    errorMessage,
    startCamera,
    stopCamera,
  };
}
