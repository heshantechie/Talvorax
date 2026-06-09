/**
 * useInterviewAlerts Hook
 * Alert state machine driven by face detection results.
 * Shows warnings after face is missing for a configurable threshold.
 */
import { useState, useRef, useEffect } from 'react';

export type AlertType = 'warning' | 'error' | null;

interface UseInterviewAlertsOptions {
  /** Seconds before triggering face-not-visible alert (default: 2.5s) */
  noFaceThresholdSec?: number;
  /** Whether the alert system is active */
  enabled?: boolean;
}

interface UseInterviewAlertsReturn {
  /** Current alert message (null = no alert) */
  alertMessage: string | null;
  /** Alert severity */
  alertType: AlertType;
}

export function useInterviewAlerts(
  faceCount: number,
  options: UseInterviewAlertsOptions = {}
): UseInterviewAlertsReturn {
  const {
    noFaceThresholdSec = 2.5,
    enabled = true,
  } = options;

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<AlertType>(null);

  // Track when face was last seen
  const faceLastSeenRef = useRef<number>(Date.now());
  const hasSeenFaceRef = useRef<boolean>(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setAlertMessage(null);
      setAlertType(null);
      return;
    }

    // Update the last-seen timestamp whenever a valid face is detected
    if (faceCount === 1) {
      faceLastSeenRef.current = Date.now();
      hasSeenFaceRef.current = true;
    }

    // Multiple faces — immediate alert
    if (faceCount > 1) {
      setAlertMessage('Only one person should be visible in the camera.');
      setAlertType('error');
      return;
    }

    // Single face detected — clear any alert
    if (faceCount === 1) {
      setAlertMessage(null);
      setAlertType(null);
      return;
    }

    // faceCount === 0: Start checking for threshold
    // We use an interval so the alert appears after the threshold even if faceCount
    // doesn't change (it stays at 0)
    checkIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - faceLastSeenRef.current) / 1000;
      if (elapsed >= noFaceThresholdSec) {
        if (hasSeenFaceRef.current) {
          setAlertMessage('Face not clearly visible');
        } else {
          setAlertMessage('Face not detected. Please stay in front of the camera.');
        }
        setAlertType('warning');
      }
    }, 500);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [faceCount, enabled, noFaceThresholdSec]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  return { alertMessage, alertType };
}
