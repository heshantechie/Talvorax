import { z } from "zod";

const AnalysisScoreBreakdown = z.object({
  score: z.coerce.number().catch(0),
  evidence: z.array(z.coerce.string()).catch([]),
  reason: z.coerce.string().catch('')
});

const AnalysisResultSchema = z.object({
  finalScore: z.coerce.number().min(0).max(100).catch(0),
  scoreBreakdown: z.object({
    semanticSkillMatch: AnalysisScoreBreakdown,
    experienceRelevance: AnalysisScoreBreakdown,
    impactAchievements: AnalysisScoreBreakdown,
    projectDepth: AnalysisScoreBreakdown,
    atsOptimization: AnalysisScoreBreakdown,
    keywordPenalty: z.object({
      penalty: z.coerce.number().catch(0),
      reason: z.coerce.string().catch('')
    })
  }).catch({
    semanticSkillMatch: { score: 0, evidence: [], reason: '' },
    experienceRelevance: { score: 0, evidence: [], reason: '' },
    impactAchievements: { score: 0, evidence: [], reason: '' },
    projectDepth: { score: 0, evidence: [], reason: '' },
    atsOptimization: { score: 0, evidence: [], reason: '' },
    keywordPenalty: { penalty: 0, reason: '' }
  }),
  missingCriticalSkills: z.array(z.coerce.string()).catch([]),
  hardRequirementCapApplied: z.boolean().catch(false),
  capReason: z.coerce.string().catch(''),
  strengths: z.array(z.coerce.string()).catch([]),
  weaknesses: z.array(z.coerce.string()).catch([]),
  actionableImprovements: z.array(z.coerce.string()).catch([]),
  suggestedJobRoles: z.array(z.coerce.string()).catch([])
}).transform((data) => {
  return {
    ...data,
    score: data.finalScore,
    atsCompatibility: typeof data.finalScore === 'number' ? (data.finalScore >= 70 ? 'High' : data.finalScore >= 40 ? 'Medium' : 'Low') : 'Low' as any,
    domainMatchScore: Math.round(data.finalScore / 10),
    rejectionAnalysis: data.hardRequirementCapApplied ? data.capReason : (data.finalScore < 60 ? 'Candidate lacks sufficient relevance or impact for this role.' : 'Candidate shows good alignment.')
  };
});

function safeParseAI<T>(rawText: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    let cleanText = rawText.replace(/```json\s*/ig, '').replace(/```\s*/g, '').trim();
    
    // Extract JSON subset to ignore conversational prefixes/suffixes
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    
    // Simple sanitization for trailing commas which often break JSON.parse
    cleanText = cleanText.replace(/,\s*([}\]])/g, '$1');
    // Sanitize unescaped newlines in JSON strings (basic fallback mechanism)
    cleanText = cleanText.replace(/\n/g, ' ');

    const parsed = JSON.parse(cleanText);
    const result = schema.safeParse(parsed);
    if (result.success) return result.data;
    console.error('AI response validation failed:', JSON.stringify(result.error.issues));
    return fallback;
  } catch (err) {
    console.error('AI response parse error:', err);
    console.log('Raw text was:', rawText);
    return fallback;
  }
}

const mockResponse = `{
  "finalScore": 85,
  "scoreBreakdown": {
    "semanticSkillMatch": { "score": 25, "evidence": ["a"], "reason": "b" },
    "experienceRelevance": { "score": "20", "evidence": ["c"], "reason": "d" },
    "impactAchievements": { "score": 15, "evidence": ["e"], "reason": "f" },
    "projectDepth": { "score": 10, "evidence": [], "reason": "" },
    "atsOptimization": { "score": 15, "evidence": [], "reason": "" },
    "keywordPenalty": { "penalty": 0, "reason": "" }
  },
  "missingCriticalSkills": [],
  "hardRequirementCapApplied": false,
  "capReason": "",
  "strengths": [],
  "weaknesses": [],
  "actionableImprovements": [],
  "suggestedJobRoles": ["1", "2"]
}`;

console.log(JSON.stringify(safeParseAI(mockResponse, AnalysisResultSchema, { finalScore: 0 } as any), null, 2));
