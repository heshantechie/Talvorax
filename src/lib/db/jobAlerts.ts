import { supabase } from '../supabase';
import { JobAlert, JobRecommendation } from '../../types/jobs';

export const saveJobAlert = async (alert: Partial<JobAlert>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('job_alerts')
    .insert([{ ...alert, user_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getJobAlerts = async (): Promise<JobAlert[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('job_alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as JobAlert[];
};

export const updateJobAlert = async (id: string, updates: Partial<JobAlert>) => {
  const { data, error } = await supabase
    .from('job_alerts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const toggleJobAlert = async (id: string, status: 'active' | 'inactive') => {
  return updateJobAlert(id, { status });
};

export const deleteJobAlert = async (id: string) => {
  const { error } = await supabase
    .from('job_alerts')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const getUserRecommendations = async (): Promise<JobRecommendation[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('job_recommendations')
    .select(`
      *,
      cached_job:jobs_cache(*)
    `)
    .eq('user_id', user.id)
    .neq('status', 'dismissed')
    .order('match_score', { ascending: false });

  if (error) throw error;
  return data as JobRecommendation[];
};

export const dismissRecommendation = async (id: string) => {
  const { error } = await supabase
    .from('job_recommendations')
    .update({ status: 'dismissed' })
    .eq('id', id);

  if (error) throw error;
};

export const saveRecommendation = async (id: string) => {
  const { error } = await supabase
    .from('job_recommendations')
    .update({ status: 'saved' })
    .eq('id', id);

  if (error) throw error;
};
