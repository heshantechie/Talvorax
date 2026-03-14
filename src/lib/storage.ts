import { supabase } from './supabase';

export const uploadResume = async (userId: string, file: File): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
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
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
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

/**
 * SECURITY: Use signed URLs for private bucket access instead of public URLs.
 * Signed URLs expire after 1 hour (3600 seconds).
 */
export const getFileUrl = async (
  bucket: 'resumes' | 'documents',
  path: string
): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600); // 1 hour expiry

  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }

  return data.signedUrl;
};
