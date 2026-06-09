import { useRef, useState, useCallback, useEffect } from 'react';

export function useVideoRecorder(stream: MediaStream | null) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);

  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const startRecording = useCallback(() => {
    if (!stream) {
      console.warn('Cannot start recording: no stream provided');
      return;
    }
    
    // Clear previous recording data
    chunksRef.current = [];
    setRecordingBlob(null);

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      console.error('No supported mime type found for MediaRecorder');
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordingBlob(blob);
        chunksRef.current = [];
      };

      // Ensure we request chunks frequently to not lose data
      mediaRecorder.start(1000); 
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
    }
  }, [stream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const downloadRecording = useCallback((filename = 'interview_recording.webm') => {
    if (!recordingBlob) {
      console.warn('No recording available to download');
      return;
    }

    const url = URL.createObjectURL(recordingBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }, [recordingBlob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    recordingBlob,
    startRecording,
    stopRecording,
    downloadRecording
  };
}
