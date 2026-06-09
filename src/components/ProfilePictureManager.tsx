import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const ProfilePictureManager: React.FC = () => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const currentAvatar = user?.user_metadata?.avatar_url;

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setError(null);

      // Unique file path based on user id and timestamp to break cache
      const fileExt = file.name.split('.').pop() || 'jpeg';
      const filePath = `${user?.id}/${Date.now()}.${fileExt}`;

      // Upload to your "avatars" bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
            upsert: true,
            contentType: file.type // ensure correct mime type
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

  return (
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
            onClick={() => cameraInputRef.current?.click()}
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
  );
};
