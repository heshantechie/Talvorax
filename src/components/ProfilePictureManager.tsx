import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, X, RefreshCw, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Helper to compress image
const compressImage = (file: File | Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 512;
      const MAX_HEIGHT = 512;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Failed to get canvas context');
      
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject('Canvas to Blob failed');
      }, 'image/jpeg', 0.8); // Compress to 80% quality
    };
    img.onerror = (err) => reject(err);
  });
};

const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const ProfilePictureManager: React.FC = () => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Camera Modal State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentAvatar = user?.user_metadata?.avatar_url;

  // Cleanup stream when component unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Set video source when stream is ready
  useEffect(() => {
    if (videoRef.current && cameraStream && !capturedImage) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.error("Video play error:", e));
    }
  }, [cameraStream, capturedImage, showCameraModal]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setError(null);

      const compressedBlob = await compressImage(file);

      // Unique file path based on user id and timestamp to break cache
      const fileExt = file.name.split('.').pop() || 'jpeg';
      const filePath = `${user?.id}/${Date.now()}.${fileExt}`;

      // Upload to your "avatars" bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedBlob, { 
            upsert: true,
            contentType: file.type || 'image/jpeg' // ensure correct mime type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update user metadata so the whole app knows about the new URL
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;
      
      // Force reload page gracefully to ensure context captures new data
      window.location.reload();
      
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile picture.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTakePhotoClick = async () => {
    if (isMobileDevice() || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // On mobile or unsupported devices, just trigger the native capture="user" input
      cameraInputRef.current?.click();
    } else {
      // On desktop, try opening webcam modal
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(stream);
        setShowCameraModal(true);
        setError(null);
        setCapturedImage(null);
        setCapturedBlob(null);
      } catch (err: any) {
        console.error("Camera access error:", err);
        // Fallback to file upload
        fileInputRef.current?.click();
      }
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
    setCapturedImage(null);
    setCapturedBlob(null);
  };

  const captureFrame = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            setCapturedBlob(blob);
            setCapturedImage(URL.createObjectURL(blob));
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
  };

  const handleSaveCapturedPhoto = async () => {
    if (!capturedBlob) return;
    try {
      setIsUploading(true);
      setError(null);
      
      const compressedBlob = await compressImage(capturedBlob);
      const fileExt = 'jpeg';
      const filePath = `${user?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedBlob, { 
            upsert: true,
            contentType: 'image/jpeg' 
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;
      
      closeCamera();
      window.location.reload();
      
    } catch (err: any) {
      setError(err.message || 'Failed to upload captured picture.');
      closeCamera();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center sm:items-start gap-4">
        
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 group">
            {currentAvatar ? (
              <img 
                src={currentAvatar} 
                alt="Profile" 
                className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-60" 
              />
            ) : (
              <span className="text-4xl font-bold text-emerald-600">
                {user?.email?.charAt(0).toUpperCase() || '?'}
              </span>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleUpload}
              disabled={isUploading}
            />
            {/* capture="user" triggers front camera explicitly on mobile! */}
            <input 
              type="file" 
              accept="image/*" 
              capture="user" 
              className="hidden" 
              ref={cameraInputRef} 
              onChange={handleUpload}
              disabled={isUploading}
            />

            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              Upload Photo
            </button>
            
            <button 
              type="button"
              onClick={handleTakePhotoClick}
              disabled={isUploading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-bold rounded-xl hover:bg-emerald-100 hover:border-emerald-200 transition-all shadow-sm disabled:opacity-50"
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              Take Photo
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-2 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100 font-medium">
            {error}
          </div>
        )}
        
        <p className="text-xs text-slate-400 font-medium max-w-sm text-center sm:text-left mt-2">
          Recommended size: 256x256px. JPG, PNG, or GIF. Max 2MB. Make sure you have a public 'avatars' storage bucket set up in Supabase.
        </p>

      </div>

      {/* Camera Modal for Desktop */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-lg">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Take Profile Photo</h3>
              <button 
                onClick={closeCamera} 
                disabled={isUploading}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative bg-slate-900 aspect-video flex items-center justify-center overflow-hidden">
              {!capturedImage ? (
                <video 
                  ref={videoRef} 
                  className="w-full h-full object-cover scale-x-[-1]" /* Mirror the video preview */
                  playsInline
                  autoPlay
                  muted
                />
              ) : (
                <img 
                  src={capturedImage} 
                  alt="Captured preview" 
                  className="w-full h-full object-cover scale-x-[-1]" /* Keep mirroring for preview */
                />
              )}
            </div>

            <div className="p-6 flex justify-center gap-4 bg-slate-50">
              {!capturedImage ? (
                <button 
                  onClick={captureFrame}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-[0_4px_20px_rgba(16,185,129,0.4)] transition-transform hover:scale-105"
                >
                  <Camera className="w-8 h-8 text-white" />
                </button>
              ) : (
                <div className="flex w-full gap-4">
                  <button 
                    onClick={retakePhoto}
                    disabled={isUploading}
                    className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Retake
                  </button>
                  <button 
                    onClick={handleSaveCapturedPhoto}
                    disabled={isUploading}
                    className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    Save Photo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

