
export interface AnalysisResult {
  finalScore: number;
  scoreBreakdown: {
    semanticSkillMatch: {
      score: number;
      evidence: string[];
      reason: string;
    };
    experienceRelevance: {
      score: number;
      evidence: string[];
      reason: string;
    };
    impactAchievements: {
      score: number;
      evidence: string[];
      reason: string;
    };
    projectDepth: {
      score: number;
      evidence: string[];
      reason: string;
    };
    atsOptimization: {
      score: number;
      evidence: string[];
      reason: string;
    };
    keywordPenalty: {
      penalty: number;
      reason: string;
    };
  };
  missingCriticalSkills: string[];
  hardRequirementCapApplied: boolean;
  capReason: string;
  strengths: string[];
  weaknesses: string[];
  actionableImprovements: string[];
  // Keep the old fields required by UI / DB mappings where possible.
  score: number; // mapped from finalScore for backwards compatibility
  atsCompatibility: 'Low' | 'Medium' | 'High'; // Derived
  domainMatchScore: number; // Derived
  rejectionAnalysis: string; // Used to store breakdown JSON to DB or generic reason
  suggestedJobRoles: string[]; // Keep for UI functionality
  originalResumeJSON?: string;
}

export interface StructuredResume {
  name: string;
  contact: string;
  professionalSummary?: string;
  technicalSkills?: {
    [category: string]: string[];
  };
  experience?: {
    company: string;
    location: string;
    role: string;
    duration: string;
    achievements: string[];
  }[];
  education?: {
    institution: string;
    location: string;
    duration: string;
    degree: string;
  }[];
  projects?: {
    name: string;
    date: string;
    details: string[];
  }[];
  extracurricular?: {
    activities: string[];
  };
  leadership?: {
    roles: string[];
  };
}

export interface ResumeRewrite {
  rewrittenText: string;
  rewrittenContent: string; // JSON string of StructuredResume
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
  suggestedAnswers: { question: string; userResponse: string; improvement: string; topicMatch: string; score: number }[];
}

export interface MinuteTalkFeedback {
  contentScore: number;
  structureScore: number;
  fluencyScore: number;
  confidenceScore: number;
  wpm: number;
  fillerCount: number;
  topFiller: string;
  finalScore: number;
  suggestions: string[];
  grammarScore?: number;
  vocabularyScore?: number;
  fillerWordsAnalysis?: {
    totalCount: number;
    frequencyPerMinute: number;
    percentage: number;
    topFiller: string;
    counts: Record<string, number>;
    suggestions: string[];
  };
  vocabularyAnalysis?: {
    uniqueCount: number;
    repeatedCount: number;
    lexicalDiversity: number;
    richnessScore: number;
    repeatedWordsDetail: { word: string; count: number }[];
    advancedWords: string[];
  };
  grammarAnalysis?: {
    score: number;
    mistakes: {
      original: string;
      corrected: string;
      explanation: string;
      type: string;
    }[];
    suggestions: string[];
  };
  pauseAnalysis?: {
    averagePause: number;
    longestPause: number;
    count: number;
    list: { start: number; duration: number }[];
  };
  detailedActionableFeedback?: {
    content: string;
    structure: string;
    fluency: string;
    confidence: string;
    grammar: string;
    vocabulary: string;
  };
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
  INTERVIEW_COACH = 'INTERVIEW_COACH',
  MINUTE_TALK = 'MINUTE_TALK',
  EDIT_PROFILE = 'EDIT_PROFILE'
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

// ─── Job Fit & Gap Analysis Engine ──────────────────────────────────────────

export type GapConfidence =
  | 'EXPLICITLY_VERIFIED'   // 0.95-1.0: skill directly evidenced in resume
  | 'IMPLICITLY_SUPPORTED'  // 0.75-0.94: parent tool/framework present
  | 'POSSIBLY_KNOWN'        // 0.40-0.74: adjacent concept present
  | 'MISSING'               // 0.10-0.39: no evidence, learnable
  | 'CANNOT_VERIFY';        // 0.0-0.09: hard barrier (cert/niche platform)

export type GapSkillCategory =
  | 'Required Hard Skills'
  | 'Preferred Skills'
  | 'Tools & Infrastructure'
  | 'Frameworks & Libraries'
  | 'Technologies & Languages'
  | 'Methodologies'
  | 'Certifications & Degrees'
  | 'Domain Knowledge'
  | 'Soft Skills';

export interface SkillAssessment {
  skillName: string;
  category: GapSkillCategory;
  confidence: GapConfidence;
  confidenceScore: number;   // 0-1
  resumeEvidence: string;    // verbatim quote from resume; '' when none
  jdSnippet: string;         // verbatim JD phrase requiring this skill
  importanceScore: number;   // 0-10
  isEssential: boolean;
  projectDemonstrable: boolean;
}

export interface VerifiedImprovement {
  section: string;    // e.g. "Experience — Acme Corp, bullet 2"
  original: string;
  improved: string;
  tactic: string;     // Keyword Integration | Action Verb | XYZ Quantification | Reorder | Summary Tailoring
  rationale: string;
  estMatchDelta: string; // e.g. "+5-12%"
  usesEstimatedMetrics: boolean; // improved text contains example figures the user must confirm
}

export interface RecommendedPortfolioProject {
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedHours: number;
  techStack: string[];
  skillsDemonstrated: string[];
  resumeValue: number;      // 0-10
  recruiterSignal: string;
  buildSteps: string[];
}

export interface RoadmapItem {
  title: string;
  detail: string;
  estTime: string;
  impact: string;
}

export interface GapRoadmap {
  quickWins: RoadmapItem[];        // < 30 mins
  resumeEdits: RoadmapItem[];      // 1-2 hours
  portfolioBuilds: RoadmapItem[];  // 1-2 weeks
  skillAcquisition: RoadmapItem[]; // 1-3 months
  interviewPrepTopics: string[];
}

export type RecruiterInsightType = 'STRENGTH' | 'GAP' | 'TIP';

export interface RecruiterInsight {
  type: RecruiterInsightType; // STRENGTH: lead with it | GAP: close it | TIP: positioning advice
  headline: string;           // short punchy card title
  insight: string;            // the substance
  jdRequirement: string;      // which JD requirement this addresses
  impactChannels: string[];   // e.g. ["ATS Parsing Score", "Callback Likelihood"]
}

export interface JobFitAnalysis {
  overallMatch: number; // 0-100
  matchBreakdown: { hardSkills: number; experience: number; softSkills: number };
  verdict: string;      // e.g. "STRONG CANDIDATE"
  skills: SkillAssessment[];
  recruiterInsights: RecruiterInsight[];
  improvements: VerifiedImprovement[];
  projects: RecommendedPortfolioProject[];
  roadmap: GapRoadmap;
}
