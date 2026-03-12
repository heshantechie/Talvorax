import { supabase } from './supabase';
import { InterviewConfig, InterviewQuestion, InterviewFeedback, AnalysisResult, ResumeRewrite } from '../../types';

// ─── INTERVIEW SESSIONS ────────────────────────────────────────────────────────

export const saveInterviewSession = async (
  userId: string,
  config: InterviewConfig,
  durationSeconds: number,
  status: 'active' | 'completed' | 'abandoned' = 'completed'
) => {
  const { data, error } = await supabase
    .from('interview_sessions')
    .insert({
      user_id: userId,
      mode: config.mode,
      domain: config.domain,
      topic: config.topic,
      job_description: config.jobDescription,
      resume_text: config.resumeText,
      company_name: config.companyName,
      previous_company: config.previousCompany,
      job_role: config.jobRole,
      experience_level: config.experienceLevel,
      years_of_experience: config.yearsOfExperience,
      limit_type: config.limitType,
      duration_minutes: config.durationMinutes,
      number_of_questions: config.numberOfQuestions,
      candidate_name: config.candidateName,
      status,
      duration_seconds: durationSeconds
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving interview session:', error);
    throw error;
  }

  return data;
};

export const saveInterviewQuestions = async (sessionId: string, questions: InterviewQuestion[]) => {
  const records = questions.map((q, index) => ({
    session_id: sessionId,
    question_order: index,
    question_text: q.question,
    topic: q.topic,
    difficulty: q.difficulty,
    time_allocation_seconds: q.timeAllocationSeconds,
    tags: q.tags
  }));

  const { data, error } = await supabase
    .from('interview_questions')
    .insert(records)
    .select();

  if (error) {
    console.error('Error saving interview questions:', error);
    throw error;
  }

  return data;
};

export const saveInterviewAnswers = async (
  sessionId: string,
  userId: string,
  questionIdsMap: Record<number, string>, // Mapping index to DB UUID
  answers: Record<number, string>, // Mapping index to answer text
  bookmarkedIndices: number[],
  skippedIndices: number[]
) => {
  const records = Object.keys(questionIdsMap).map((idxStr) => {
    const idx = parseInt(idxStr);
    const dbQuestionId = questionIdsMap[idx];
    return {
      session_id: sessionId,
      question_id: dbQuestionId,
      user_id: userId,
      answer_text: answers[idx] || null,
      is_bookmarked: bookmarkedIndices.includes(idx),
      is_skipped: skippedIndices.includes(idx),
    };
  });

  if (records.length === 0) return [];

  const { data, error } = await supabase
    .from('interview_answers')
    .insert(records)
    .select();

  if (error) {
    console.error('Error saving interview answers:', error);
    throw error;
  }

  return data;
};

export const saveInterviewFeedback = async (
  sessionId: string,
  userId: string,
  feedback: InterviewFeedback
) => {
  const { data, error } = await supabase
    .from('interview_feedback')
    .insert({
      session_id: sessionId,
      user_id: userId,
      overall_score: feedback.overallScore,
      communication_rating: feedback.communicationRating,
      technical_rating: feedback.technicalRating,
      problem_solving_rating: feedback.problemSolvingRating,
      key_takeaways: feedback.keyTakeaways,
      focus_topics: feedback.focusTopics,
      suggested_answers: feedback.suggestedAnswers
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving interview feedback:', error);
    throw error;
  }

  return data;
};

// ─── RESUME ANALYSES ──────────────────────────────────────────────────────────

export const saveResumeAnalysis = async (
  userId: string,
  analysis: AnalysisResult,
  originalResumeText: string,
  jobDescription: string,
  domain: string,
  resumeStoragePath?: string,
  rewrite?: ResumeRewrite
) => {
  const { data, error } = await supabase
    .from('resume_analyses')
    .insert({
      user_id: userId,
      resume_storage_path: resumeStoragePath,
      job_description: jobDescription,
      domain,
      score: analysis.score,
      ats_compatibility: analysis.atsCompatibility,
      domain_match_score: analysis.domainMatchScore,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendations: analysis.recommendations,
      rejection_analysis: analysis.rejectionAnalysis,
      suggested_job_roles: analysis.suggestedJobRoles,
      rewritten_content: rewrite?.rewrittenContent,
      changes_made: rewrite?.changesMade,
      missing_fields: rewrite?.missingFields
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving resume analysis:', error);
    throw error;
  }

  return data;
};

export const updateResumeAnalysisRewrite = async (
  analysisId: string,
  rewrite: ResumeRewrite
) => {
  const { data, error } = await supabase
    .from('resume_analyses')
    .update({
      rewritten_content: rewrite.rewrittenContent,
      changes_made: rewrite.changesMade,
      missing_fields: rewrite.missingFields
    })
    .eq('id', analysisId)
    .select()
    .single();

  if (error) {
    console.error('Error updating resume analysis with rewrite:', error);
    throw error;
  }

  return data;
};
