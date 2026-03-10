
export interface AnalysisResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  atsCompatibility: 'Low' | 'Medium' | 'High';
  domainMatchScore: number;
  rejectionAnalysis: string;
  suggestedJobRoles: string[];
}

export interface ResumeRewrite {
  rewrittenText: string;
  rewrittenContent: string;
  changesMade: string[];
  missingFields: string[];
}

export interface InterviewFeedback {
  overallScore: number;
  communicationRating: number;
  technicalRating: number;
  problemSolvingRating: number;
  keyTakeaways: string[];
  focusTopics: string[];
  suggestedAnswers: { question: string; userResponse: string; improvement: string; topicMatch: string }[];
}

export interface InterviewSetup {
  yearsOfExperience: string;
  projectType: string;
  education: string;
  problemSolvingLevel: string;
  communicationLevel: string;
  domain: string;
}

export enum AppSection {
  DASHBOARD = 'DASHBOARD',
  RESUME_ANALYZER = 'RESUME_ANALYZER',
  INTERVIEW_COACH = 'INTERVIEW_COACH'
}

export interface TranscriptionItem {
  speaker: 'User' | 'AI';
  text: string;
  timestamp: number;
}

// ─── Interview Coach Types ───

export enum InterviewMode {
  DOMAIN_BASED = 'DOMAIN_BASED',
  JD_BASED = 'JD_BASED',
  RESUME_BASED = 'RESUME_BASED',
  COMPANY_SPECIFIC = 'COMPANY_SPECIFIC',
  PREVIOUS_EXPERIENCE = 'PREVIOUS_EXPERIENCE',
  CUSTOM = 'CUSTOM'
}

export type ExperienceLevel = 'fresher' | 'experienced';

export type InterviewLimitType = 'duration' | 'questions';

export interface InterviewConfig {
  mode: InterviewMode;
  // Domain Based
  domain?: string;
  topic?: string;
  // JD Based
  jobDescription?: string;
  // Resume Based
  resumeText?: string;
  // Company Specific
  companyName?: string;
  // Previous Experience
  previousCompany?: string;
  jobRole?: string;
  topicCategories?: ('technical' | 'behavioral')[];
  technicalTopics?: string[];
  behavioralTopics?: string[];
  customTechnicalTopic?: string;
  customBehavioralTopic?: string;
  previousQuestions?: string;
  previousAnswers?: string;
  // Common
  experienceLevel: ExperienceLevel;
  yearsOfExperience?: number;
  limitType: InterviewLimitType;
  durationMinutes?: 5 | 10;
  numberOfQuestions?: number;
  candidateName?: string;
}

export interface InterviewQuestion {
  id: number;
  question: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeAllocationSeconds: number;
  tags: string[];
}

export interface InterviewSessionState {
  questions: InterviewQuestion[];
  currentQuestionIndex: number;
  answers: { [questionId: number]: string };
  bookmarkedQuestions: number[];
  skippedQuestions: number[];
  startedAt: number;
  status: 'loading' | 'active' | 'paused' | 'finished';
}
