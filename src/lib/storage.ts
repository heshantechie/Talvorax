import { supabase } from './supabase';

// ─── File Upload Validation ───
const RESUME_ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain'];
const RESUME_ALLOWED_EXTENSIONS = ['pdf', 'txt'];
const DOC_ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const DOC_ALLOWED_EXTENSIONS = ['pdf', 'txt', 'doc', 'docx'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function validateFile(
  file: File,
  allowedMimeTypes: string[],
  allowedExtensions: string[],
  maxSize: number = MAX_FILE_SIZE_BYTES
): void {
  // Validate MIME type
  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error(`Invalid file type "${file.type}". Allowed: ${allowedExtensions.join(', ').toUpperCase()}`);
  }

  // Validate extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !allowedExtensions.includes(ext)) {
    throw new Error(`Invalid file extension ".${ext}". Allowed: ${allowedExtensions.join(', ')}`);
  }

  // Validate file size
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    throw new Error(`File too large (${Math.round(file.size / (1024 * 1024))}MB). Maximum allowed: ${maxMB}MB`);
  }
}

export const uploadResume = async (userId: string, file: File): Promise<string | null> => {
  validateFile(file, RESUME_ALLOWED_MIME_TYPES, RESUME_ALLOWED_EXTENSIONS);

  const fileExt = file.name.split('.').pop()?.toLowerCase();
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
  validateFile(file, DOC_ALLOWED_MIME_TYPES, DOC_ALLOWED_EXTENSIONS);

  const fileExt = file.name.split('.').pop()?.toLowerCase();
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

