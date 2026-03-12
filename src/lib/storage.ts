import { supabase } from './supabase';

export const uploadResume = async (userId: string, file: File): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('resumes')
    .upload(filePath, file);

  if (error) {
    console.error('Error uploading resume:', error);
    return null;
  }

  return data.path;
};

export const uploadDocument = async (userId: string, file: File): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(filePath, file);

  if (error) {
    console.error('Error uploading document:', error);
    return null;
  }

  return data.path;
};

export const getFileUrl = (bucket: 'resumes' | 'documents', path: string): string => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};
