import { AnalysisResult, ResumeRewrite, InterviewFeedback, TranscriptionItem, InterviewSetup, InterviewConfig, InterviewQuestion } from "../types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const API_KEY = process.env.API_KEY || "";
const MODEL = "google/gemini-2.0-flash-001";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callOpenRouter(messages: OpenRouterMessage[], jsonSchema?: object): Promise<string> {
  const body: any = {
    model: MODEL,
    messages,
  };
  if (jsonSchema) {
    body.response_format = { type: "json_object" };
  }
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "HireReady AI"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "{}";
}

/**
 * Utility to call OpenRouter with exponential backoff retries for rate limits (429).
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let delay = 2000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = error?.message || "";
      const isRateLimit = errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("quota") || errorMsg.includes("rate");

      if (isRateLimit && i < maxRetries - 1) {
        console.warn(`OpenRouter rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded for OpenRouter API call.");
}

export const analyzeResume = async (resumeText: string, jobDescription: string, domain: string): Promise<AnalysisResult> => {
  return withRetry(async () => {
    const prompt = `You are an expert ATS resume analyst. Analyze this resume against the following job description for a ${domain} role.

Resume:
${resumeText}

Job Description / Desired Role Keywords:
${jobDescription}

Provide a JSON response with these exact fields:
{
  "score": <number 0-100, ATS compatibility percentage>,
  "domainMatchScore": <number 0-10>,
  "atsCompatibility": "<Low|Medium|High>",
  "strengths": ["<strength1>", "<strength2>", ...],
  "weaknesses": ["<critical gap 1>", "<critical gap 2>", ...],
  "recommendations": ["<recommendation1>", ...],
  "rejectionAnalysis": "<A paragraph explaining the risk of rejection for this resume>",
  "suggestedJobRoles": ["<role1>", "<role2>", "<role3>", "<role4>"]
}

For suggestedJobRoles: suggest exactly 4 suitable job roles that this resume is best suited for within the ${domain} domain, based on the candidate's skills and experience shown in the resume.

Return ONLY valid JSON, no markdown.`;

    const result = await callOpenRouter([
      { role: "system", content: "You are a professional ATS resume analysis expert. Always respond with valid JSON only, no markdown code fences." },
      { role: "user", content: prompt }
    ], {});

    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned) as AnalysisResult;
  });
};

export const getRequiredSkillsForRole = async (role: string, resumeText: string, domain: string): Promise<string[]> => {
  return withRetry(async () => {
    const prompt = `You are a career advisor. Given the following resume and the target job role "${role}" in the ${domain} domain, identify the mandatory/required skills for this job role that are NOT present in the resume.

Resume:
${resumeText}

Return a JSON object with exactly this format:
{
  "missingSkills": ["<skill1>", "<skill2>", "<skill3>", ...]
}

List 5-8 specific, concrete skills (technologies, frameworks, certifications, tools) that are essential for the "${role}" role but missing from this resume.
Return ONLY valid JSON, no markdown.`;

    const result = await callOpenRouter([
      { role: "system", content: "You are a career skills advisor. Always respond with valid JSON only, no markdown code fences." },
      { role: "user", content: prompt }
    ], {});

    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed.missingSkills || [];
  });
};

export const rewriteResume = async (resumeText: string, jobDescription: string, additionalSkills?: string[]): Promise<ResumeRewrite> => {
  return withRetry(async () => {
    const skillsNote = additionalSkills && additionalSkills.length > 0
      ? `\n\nIMPORTANT: The candidate wants to highlight these additional skills in the resume. Incorporate them naturally: ${additionalSkills.join(', ')}`
      : '';

    const prompt = `Rewrite the following resume to be ATS-optimized for this job description. Focus on industry standard keywords, clarity, and professional formatting.${skillsNote}

Job Description: ${jobDescription}
Resume Content: ${resumeText}

Return a JSON object with exactly this format:
{
  "rewrittenText": "<brief summary of the rewrite>",
  "rewrittenContent": "<the full rewritten resume text, well-formatted with sections like SUMMARY, SKILLS, EXPERIENCE, EDUCATION, PROJECTS>",
  "changesMade": ["<change1>", "<change2>", ...],
  "missingFields": ["<field1>", "<field2>", ...]
}

Return ONLY valid JSON, no markdown.`;

    const result = await callOpenRouter([
      { role: "system", content: "You are a professional resume writer. Always respond with valid JSON only, no markdown code fences." },
      { role: "user", content: prompt }
    ], {});

    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned) as ResumeRewrite;
  });
};

export const generateInterviewFeedback = async (
  transcript: TranscriptionItem[],
  setup: InterviewSetup
): Promise<InterviewFeedback> => {
  const hasUserTranscript = transcript.some(t => t.speaker === 'User' && t.text.length > 5);
  if (!hasUserTranscript) {
    return {
      overallScore: 0,
      communicationRating: 0,
      technicalRating: 0,
      problemSolvingRating: 0,
      keyTakeaways: ["Session engagement was too low to generate score."],
      focusTopics: ["Participation required."],
      suggestedAnswers: []
    };
  }

  const transcriptText = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');

  return withRetry(async () => {
    const prompt = `TECHNICAL EVALUATION TASK: Provide a detailed score for this technical interview for a ${setup.domain} role.
        
CRITICAL INSTRUCTIONS:
1. Analyze the technical depth of User responses.
2. Identify specific technical gaps where the User missed key terminology or concepts.
3. For each question asked, provide an improved expert-level answer.
4. Score harshly on technical accuracy but encourage communication growth.

TRANSCRIPT:
${transcriptText}

Return a JSON object with exactly this format:
{
  "overallScore": <number 0-100>,
  "communicationRating": <number 0-10>,
  "technicalRating": <number 0-10>,
  "problemSolvingRating": <number 0-10>,
  "keyTakeaways": ["<takeaway1>", ...],
  "focusTopics": ["<topic1>", ...],
  "suggestedAnswers": [
    {
      "question": "<the question>",
      "userResponse": "<what user said>",
      "improvement": "<better answer>",
      "topicMatch": "<topic>"
    }
  ]
}

Return ONLY valid JSON, no markdown.`;

    const result = await callOpenRouter([
      { role: "system", content: "You are a technical interview evaluator. Always respond with valid JSON only, no markdown code fences." },
      { role: "user", content: prompt }
    ], {});

    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned) as InterviewFeedback;
  });
};

export const generateInterviewQuestions = async (config: InterviewConfig): Promise<InterviewQuestion[]> => {
  const expDesc = config.experienceLevel === 'fresher'
    ? 'a fresher/entry-level candidate'
    : `an experienced professional with ${config.yearsOfExperience || 3} years of experience`;

  let numQuestions = config.numberOfQuestions || 5;
  if (config.limitType === 'duration' && config.durationMinutes) {
    // Estimate: each question ~60s max, so 5min = ~5 questions, 10min = ~10 questions
    numQuestions = config.durationMinutes === 5 ? 5 : 10;
  }

  let contextBlock = '';

  switch (config.mode) {
    case 'DOMAIN_BASED':
      contextBlock = `Domain: ${config.domain || 'General'}
Topic: ${config.topic || 'General concepts'}
This is a domain-based interview. Ask questions specifically about ${config.topic || 'the domain'} within the ${config.domain || 'technology'} domain.`;
      break;

    case 'JD_BASED':
      contextBlock = `Job Description:
${config.jobDescription || ''}
This is a JD-based interview. Ask questions that test the candidate on the skills, technologies, and competencies mentioned in this job description.`;
      break;

    case 'RESUME_BASED':
      contextBlock = `Resume Content:
${config.resumeText || ''}
This is a resume-based interview. Ask questions about the technologies, projects, and skills mentioned in this resume. Test depth of knowledge on what the candidate claims to know.`;
      break;

    case 'COMPANY_SPECIFIC':
      contextBlock = `Company: ${config.companyName || 'Unknown'}
This is a company-specific interview for ${config.companyName}. Ask questions that ${config.companyName} typically asks in their interviews. Include a mix of technical, behavioral, and company-specific questions relevant to ${config.companyName}'s tech stack, culture, and interview patterns.`;
      break;

    case 'PREVIOUS_EXPERIENCE':
      contextBlock = `Previous Company: ${config.previousCompany || 'N/A'}
Job Role: ${config.jobRole || 'N/A'}
Topics: ${[...(config.technicalTopics || []), ...(config.behavioralTopics || [])].join(', ')}
${config.customTechnicalTopic ? `Custom Technical Focus: ${config.customTechnicalTopic}` : ''}
${config.customBehavioralTopic ? `Custom Behavioral Focus: ${config.customBehavioralTopic}` : ''}
${config.previousQuestions ? `Previous Interview Questions (reference): ${config.previousQuestions}` : ''}
${config.previousAnswers ? `Candidate's Previous Answers (reference): ${config.previousAnswers}` : ''}
This is a mock interview based on the candidate's previous interview experience. Generate similar questions to what they might face in future interviews, building on the topics and patterns from their previous interview.`;
      break;

    default:
      contextBlock = 'General technical interview.';
  }

  const prompt = `You are an expert technical interviewer. Generate exactly ${numQuestions} interview questions for ${expDesc}.

${contextBlock}

IMPORTANT RULES:
1. All questions MUST be in English only.
2. Vary difficulty levels appropriately for the experience level.
3. For each question, assign a time allocation in seconds based on complexity:
   - Easy questions: 30-40 seconds
   - Medium questions: 40-50 seconds
   - Hard questions: 50-60 seconds
   - Maximum time for any question is 60 seconds.
4. Include relevant topic tags for each question.

Return a JSON array with exactly this format:
[
  {
    "id": 1,
    "question": "<the interview question>",
    "topic": "<main topic>",
    "difficulty": "<easy|medium|hard>",
    "timeAllocationSeconds": <number 30-60>,
    "tags": ["<tag1>", "<tag2>"]
  }
]

Return ONLY valid JSON array, no markdown.`;

  return withRetry(async () => {
    const result = await callOpenRouter([
      { role: "system", content: "You are an expert technical interviewer. Always respond with valid JSON only, no markdown code fences." },
      { role: "user", content: prompt }
    ], {});

    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned) as InterviewQuestion[];
  });
};

export const generateInterviewAnalysis = async (
  questions: InterviewQuestion[],
  answers: { [questionId: number]: string },
  bookmarkedIds: number[],
  skippedIds: number[],
  config: InterviewConfig
): Promise<InterviewFeedback> => {
  const expDesc = config.experienceLevel === 'fresher'
    ? 'a fresher'
    : `an experienced professional with ${config.yearsOfExperience || 3} years`;

  const qaText = questions.map(q => {
    const answer = answers[q.id] || '';
    const wasSkipped = skippedIds.includes(q.id);
    const wasBookmarked = bookmarkedIds.includes(q.id);
    return `Q${q.id} [${q.difficulty}] ${wasBookmarked ? '⭐ BOOKMARKED' : ''} ${wasSkipped ? '(SKIPPED)' : ''}: ${q.question}
Topic: ${q.topic} | Tags: ${q.tags.join(', ')}
Answer: ${wasSkipped ? '(No answer - skipped)' : (answer || '(No answer recorded)')}`;
  }).join('\n\n');

  return withRetry(async () => {
    const prompt = `TECHNICAL EVALUATION TASK: Evaluate this interview for ${expDesc}.
Mode: ${config.mode}

Questions & Answers:
${qaText}

${bookmarkedIds.length > 0 ? `\nNOTE: Questions marked with ⭐ BOOKMARKED were flagged by the candidate for review. Pay special attention to these in your feedback.\n` : ''}

CRITICAL INSTRUCTIONS:
1. Score based on the quality and depth of answers.
2. For skipped questions, count them negatively.
3. For bookmarked questions, provide extra-detailed feedback.
4. Provide improved answers for each question.
5. Be strict on technical accuracy but encouraging on communication.

Return a JSON object with exactly this format:
{
  "overallScore": <number 0-100>,
  "communicationRating": <number 0-10>,
  "technicalRating": <number 0-10>,
  "problemSolvingRating": <number 0-10>,
  "keyTakeaways": ["<takeaway1>", ...],
  "focusTopics": ["<topic1>", ...],
  "suggestedAnswers": [
    {
      "question": "<the question>",
      "userResponse": "<what user said>",
      "improvement": "<better answer>",
      "topicMatch": "<topic>"
    }
  ]
}

Return ONLY valid JSON, no markdown.`;

    const result = await callOpenRouter([
      { role: "system", content: "You are a technical interview evaluator. Always respond with valid JSON only, no markdown code fences." },
      { role: "user", content: prompt }
    ], {});

    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned) as InterviewFeedback;
  });
};

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}