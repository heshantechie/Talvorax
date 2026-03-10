
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
