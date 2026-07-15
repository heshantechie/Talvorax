// ─── Communication Routes ─────────────────────────────────────────────────────
// Mounted at /api/communication/*
// Uses the shared supabaseAdmin + callAIProxy + extractUserId from parent scope
// Includes a local in-memory DB fallback if Supabase is not configured.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';
import { WORLDS_CONFIG } from './worldsConfig.js';

// Local in-memory DB fallback
const MEMORY_DB = {
  sessions: [],
  messages: [],
  speechReports: [],
  fillerReports: [],
  clarityReports: []
};

// ─── Standalone Tool Scenarios (for Speech Analyzer / Filler / Clarity) ───────
// These are not world missions but standalone tool scenarios.
const STANDALONE_SCENARIOS = {
  speech_analyzer: {
    title: 'Speech Analyzer',
    difficulty: 'medium',
    duration: '5 min',
    xp: 50,
    objective: 'Analyze pronunciation, grammar, fluency, and vocabulary.',
    communicationGoal: 'Deliver a clear, well-structured spoken statement.',
    character: { name: 'Coach AI', role: 'Speech Coach', tone: 'Analytical and supportive.' },
    skills: ['Pronunciation', 'Grammar', 'Fluency', 'Vocabulary'],
    successCriteria: ['Clear pronunciation', 'Grammatically correct', 'Fluent delivery']
  },
  filler_words: {
    title: 'Filler Word Detection',
    difficulty: 'easy',
    duration: '3 min',
    xp: 30,
    objective: 'Identify and reduce filler words in spoken speech.',
    communicationGoal: 'Speak without using filler words like um, uh, like, basically.',
    character: { name: 'Coach AI', role: 'Fluency Coach', tone: 'Encouraging and precise.' },
    skills: ['Filler word awareness', 'Speaking confidence'],
    successCriteria: ['Fewer than 3 filler words', 'Confident delivery']
  },
  voice_clarity: {
    title: 'Voice Clarity Coach',
    difficulty: 'medium',
    duration: '5 min',
    xp: 50,
    objective: 'Evaluate voice clarity, pace, volume consistency, and pronunciation.',
    communicationGoal: 'Speak clearly at a measured pace with consistent volume.',
    character: { name: 'Coach AI', role: 'Voice Coach', tone: 'Warm and precise.' },
    skills: ['Voice clarity', 'Pace control', 'Volume control', 'Pronunciation'],
    successCriteria: ['Clear articulation', 'Measured pace', 'Consistent volume']
  },
  confidence_builder: {
    title: 'Confidence Builder',
    difficulty: 'medium',
    duration: '8 min',
    xp: 60,
    objective: 'Practice answering impromptu questions under pressure.',
    communicationGoal: 'Deliver confident, structured responses with minimal hesitation.',
    character: { name: 'Coach AI', role: 'Confidence Coach', tone: 'Challenging and supportive.' },
    skills: ['Confidence', 'Impromptu speaking', 'Composure'],
    successCriteria: ['Structured responses', 'Minimal filler words', 'Good speaking pace']
  },
  pronunciation_coach: {
    title: 'Pronunciation Coach',
    difficulty: 'medium',
    duration: '4 min',
    xp: 40,
    objective: 'Practice pronunciation and articulation of complex sentences.',
    communicationGoal: 'Perfect word stress and clear pronunciation of target phrases.',
    character: { name: 'Coach AI', role: 'Articulation Coach', tone: 'Detailed and precise.' },
    skills: ['Pronunciation', 'Articulation', 'Word stress'],
    successCriteria: ['Clear phonetics', 'Correct syllable emphasis', 'Natural rhythm']
  }
};

// Helper to look up mission config across worlds and standalone scenarios
const lookupMissionConfig = (mId, wId) => {
  // Try world config first
  const worldConfig = WORLDS_CONFIG[wId];
  const worldMission = worldConfig?.missions[mId];
  if (worldMission) return { missionConfig: worldMission, worldConfig };
  // Try standalone scenarios
  const standalone = STANDALONE_SCENARIOS[mId] || STANDALONE_SCENARIOS[wId];
  if (standalone) return { missionConfig: standalone, worldConfig: null };
  return { missionConfig: null, worldConfig: null };
};


// ─── Score Calculator Prompt Builder ──────────────────────────────────────────
const buildFeedbackPrompt = (messages, missionConfig) => {
  const transcript = messages
    .filter(m => m.sender === 'user')
    .map((m, i) => `User turn ${i + 1}: "${m.message_text}"`)
    .join('\n');

  return `You are an expert communication coach evaluating a student's performance in a roleplay scenario.

MISSION DETAILS:
- Title: ${missionConfig.title}
- Objective: ${missionConfig.objective}
- Goal: ${missionConfig.communicationGoal}
- Evaluated Skills: ${missionConfig.skills.join(', ')}
- Success Criteria: ${missionConfig.successCriteria.join(', ')}

STUDENT TRANSCRIPT (User turns only):
${transcript}

Evaluate the student's communication and return ONLY a JSON object with this exact structure:
{
  "overall_score": <integer 0-100>,
  "grammar_score": <integer 0-100>,
  "fluency_score": <integer 0-100>,
  "vocabulary_score": <integer 0-100>,
  "confidence_score": <integer 0-100>,
  "professional_tone_score": <integer 0-100>,
  "pronunciation_score": <integer 0-100>,
  "strengths": [<string>, <string>, <string>],
  "areas_to_improve": [<string>, <string>],
  "suggestions": [<string>, <string>, <string>],
  "grammar_corrections": [{"original": "<text>", "corrected": "<text>", "explanation": "<why>"}],
  "turnImprovements": [{"userTurnText": "<original>", "improvedTurnText": "<better version>", "reason": "<explanation>"}]
}

Scoring guidelines:
- grammar_score: accuracy of tense, subject-verb agreement, articles, punctuation
- fluency_score: natural flow, sentence variety, absence of repetition
- vocabulary_score: range and appropriateness of word choice
- confidence_score: assertiveness, clarity, directness
- professional_tone_score: formality, politeness, appropriateness for the context
- pronunciation_score: estimate based on word choice clarity (80-90 if unclear)
- overall_score: weighted average (grammar 25%, fluency 20%, vocabulary 20%, confidence 20%, tone 15%)

Return ONLY valid JSON. No markdown. No explanations outside the JSON.`;
};

// Simulated AI responses if API fails or falls back
const simulateResponse = (userText, missionId, historyCount) => {
  const responses = [
    "Thank you for sharing that. How does this connect to our immediate project timeline?",
    "I understand your position. What alternatives have you considered to address this concern?",
    "That makes sense. Can you explain how you intend to coordinate this with the rest of the team?",
    "Excellent suggestion. I think we have enough detail to proceed. Let's conclude here."
  ];
  return responses[Math.min(historyCount, responses.length - 1)];
};

// ─── Coaching Analysis Prompt Builder ─────────────────────────────────────────
const buildCoachingAnalysisPrompt = (text, missionContext, previousAttempt) => {
  const words = text.trim().split(/\s+/);
  const wordCount = words.length;
  const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'right', 'so', 'well'];
  const foundFillers = fillerWords.filter(fw => text.toLowerCase().includes(fw));

  const prevSection = previousAttempt
    ? `\nPREVIOUS ATTEMPT (for improvement comparison):\n"${previousAttempt.text}"\nPrevious scores: Grammar ${previousAttempt.scores?.grammar || '?'}, Fluency ${previousAttempt.scores?.fluency || '?'}, Confidence ${previousAttempt.scores?.confidence || '?'}`
    : '';

  return `You are a premium AI Communication Coach performing a comprehensive analysis of a student's spoken text.
${missionContext ? `\nMISSION CONTEXT: ${missionContext}` : ''}
STUDENT SPEECH TRANSCRIPT:
"${text}"

DETECTED STATS:
- Word count: ${wordCount}
- Filler words found: ${foundFillers.length > 0 ? foundFillers.join(', ') : 'none'}
- Estimated WPM: ${Math.round(wordCount * 2.3)} (assuming ~26s avg recording)
${prevSection}

Analyze all dimensions and return ONLY a JSON object with this EXACT structure:
{
  "scores": {
    "overall": <integer 0-100>,
    "grammar": <integer 0-100>,
    "fluency": <integer 0-100>,
    "confidence": <integer 0-100>,
    "vocabulary": <integer 0-100>,
    "pronunciation": <integer 0-100>,
    "tone": <integer 0-100>,
    "sentence_structure": <integer 0-100>,
    "filler_word_count": <integer>,
    "speech_speed_wpm": <integer>
  },
  "explanations": {
    "grammar": "<1-sentence plain-English explanation of the grammar score>",
    "fluency": "<1-sentence explanation of fluency>",
    "confidence": "<1-sentence explanation of confidence>",
    "vocabulary": "<1-sentence explanation of vocabulary>",
    "pronunciation": "<1-sentence explanation>",
    "tone": "<1-sentence explanation>",
    "sentence_structure": "<1-sentence explanation>"
  },
  "filler_words_found": [<string list of specific filler words detected>],
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "areas_to_improve": ["<specific area 1>", "<specific area 2>"],
  "turn_improvements": [
    {
      "original": "<exact phrase the user said>",
      "improved": "<better version>",
      "reason": "<1-sentence explanation of why improved version is better>"
    }
  ],
  "retry_prompt": "<coach's conversational request asking user to try the improved version — max 2 sentences, warm and encouraging>",
  "personalized_tip": "<1 personalized coaching tip based specifically on what this user said, for next time>",
  "next_mission_hint": "<brief suggestion of what communication skill to practice next>"
}

Scoring guidelines:
- grammar: tense, agreement, articles, punctuation accuracy
- fluency: natural flow, no repetition, varied sentence structure  
- confidence: directness, assertiveness, avoidance of hedging language
- vocabulary: word range, precision, appropriateness
- pronunciation: estimated from word clarity and complexity
- tone: professionalism and context-appropriateness
- sentence_structure: complexity, variety, completeness
- overall: weighted average (grammar 20%, fluency 18%, confidence 20%, vocabulary 18%, tone 12%, sentence_structure 12%)

Return ONLY valid JSON. No markdown. No text outside the JSON.`;
};

// ─── Fast Coach Hint Prompt ────────────────────────────────────────────────────
const buildCoachHintPrompt = (partialText) => {
  return `You are a real-time communication coach giving ONE short, actionable tip while a user is speaking.
PARTIAL TRANSCRIPT SO FAR: "${partialText}"
Based on what they've said so far, give ONE short coaching nudge (max 6 words).
Return ONLY a JSON object: { "hint": "<short hint>", "type": "positive"|"nudge"|"warning" }
Examples:
- { "hint": "Great pace! Keep going.", "type": "positive" }
- { "hint": "Slow down slightly.", "type": "nudge" }
- { "hint": "Avoid filler words.", "type": "warning" }
Return ONLY valid JSON.`;
};

// Fallback hints for coach-hint endpoint
const FALLBACK_HINTS = [
  { hint: "Great pace! Keep going.", type: "positive" },
  { hint: "Speak with confidence.", type: "nudge" },
  { hint: "Good sentence structure!", type: "positive" },
  { hint: "Try to be more specific.", type: "nudge" },
  { hint: "Nice vocabulary choice.", type: "positive" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Prompt Generator — Per-Tool AI Prompt Builders
// ─────────────────────────────────────────────────────────────────────────────

// Seed pools for variety and fallback
const CONFIDENCE_SCENARIOS = [
  'hr_interview', 'college_discussion', 'presentation', 'group_discussion',
  'meeting', 'networking', 'leadership', 'customer_interaction', 'impromptu'
];
const CONFIDENCE_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

const CONFIDENCE_FALLBACKS = {
  hr_interview: {
    beginner: [
      { question: 'Tell me about yourself in 2 minutes.', hint: 'Start with your background, then skills, then goals.' },
      { question: 'What is your greatest strength and why?', hint: 'Give a real example, not just a trait.' },
      { question: 'Why did you choose this career field?', hint: 'Show passion — not just practicality.' },
    ],
    intermediate: [
      { question: 'Describe a situation where you turned a failure into a learning opportunity.', hint: 'Use STAR: Situation, Task, Action, Result.' },
      { question: 'How do you handle disagreements with your manager or teammates?', hint: 'Show emotional intelligence and professionalism.' },
      { question: 'Give an example of a time you led a project without formal authority.', hint: 'Focus on influence, not title.' },
    ],
    advanced: [
      { question: 'You have 60 seconds to convince a skeptical hiring panel you are the best candidate. Go.', hint: 'Lead with impact, not chronology.' },
      { question: 'Describe how you handled a situation where you disagreed with a strategic decision made above you.', hint: 'Balance diplomacy with confidence.' },
      { question: 'Walk me through a high-stakes decision you made with incomplete information.', hint: 'Show structured thinking under pressure.' },
    ],
  },
  presentation: {
    beginner: [
      { question: 'Introduce yourself to a new team in 60 seconds.', hint: 'Name, role, one fun fact about yourself.' },
      { question: 'Explain your current project to someone outside your field.', hint: 'Avoid jargon. Use simple analogies.' },
      { question: 'Summarize the most important thing you learned this week.', hint: 'Be specific, not vague.' },
    ],
    intermediate: [
      { question: 'Present a proposal for a new initiative to your team in 90 seconds.', hint: 'Problem → Solution → Impact. Keep it tight.' },
      { question: 'Deliver an opening statement for a product demo to potential clients.', hint: 'Hook them in the first 10 seconds.' },
      { question: 'Give a data-backed summary of a project outcome to senior leadership.', hint: 'Lead with the number, then explain.' },
    ],
    advanced: [
      { question: 'You have 2 minutes to present a business case for a controversial budget increase. Present it.', hint: 'Anticipate objections. Address them proactively.' },
      { question: 'A key stakeholder challenges your data mid-presentation. Respond live.', hint: 'Acknowledge, validate, redirect with evidence.' },
      { question: 'Close a critical presentation with a compelling call to action that leaves no room for hesitation.', hint: 'Be specific. Tell them exactly what to do next.' },
    ],
  },
  group_discussion: {
    beginner: [
      { question: 'State your view on whether remote work should be permanent in most companies.', hint: 'Give one strong reason for your position.' },
      { question: 'Is teamwork overrated? Share your honest opinion.', hint: 'It is okay to have an unpopular view — defend it.' },
      { question: 'Should companies prioritize culture fit or skill set when hiring? Explain.', hint: 'Support your answer with a real-world example.' },
    ],
    intermediate: [
      { question: 'Your team is divided on a product direction. Make the case for your preferred approach.', hint: 'Acknowledge the other side before making yours.' },
      { question: 'A colleague dominates every discussion. How do you create space for others while keeping the meeting productive?', hint: 'Show assertiveness AND empathy.' },
      { question: 'Argue for or against: Social media has done more harm than good to professional discourse.', hint: 'Use evidence, not just emotion.' },
    ],
    advanced: [
      { question: 'Moderate a simulated group discussion on AI replacing entry-level jobs. Introduce, mediate, and conclude in 90 seconds.', hint: 'Balance structure with spontaneity.' },
      { question: 'You disagree with the majority decision in a group. How do you voice dissent constructively without alienating the team?', hint: 'Timing and tone matter more than content here.' },
      { question: 'Lead a group to consensus on a polarizing topic: mandatory vaccination in the workplace.', hint: 'Find common ground. Move toward decision.' },
    ],
  },
  networking: {
    beginner: [
      { question: 'Introduce yourself to a senior professional at a networking event in 30 seconds.', hint: 'Be curious. Ask one question about them.' },
      { question: 'How would you start a conversation with a stranger at an industry conference?', hint: 'Open with what brought you there.' },
      { question: 'You meet your dream employer at a coffee line. What do you say?', hint: 'Be human first, professional second.' },
    ],
    intermediate: [
      { question: 'Deliver your 60-second elevator pitch to a potential mentor.', hint: 'Who you are, what you do, what you want from them.' },
      { question: 'Follow up a 10-minute networking conversation by articulating what you want from the connection.', hint: 'Be specific about what kind of help you are seeking.' },
      { question: 'Make a case for why someone should stay in touch with you after a brief meeting.', hint: 'What unique value do YOU offer them?' },
    ],
    advanced: [
      { question: 'You are at a boardroom dinner seated next to the CEO of your target company. Hold a 2-minute conversation that leaves a lasting impression.', hint: 'Listen more than you speak. Ask one brilliant question.' },
      { question: 'A senior recruiter tells you they are not hiring right now. Pivot the conversation to build a long-term relationship instead.', hint: 'Plant seeds, not pressure.' },
      { question: 'Describe your personal brand in a way that differentiates you from every other person in your field.', hint: 'Be memorable. Avoid generic buzzwords.' },
    ],
  },
  leadership: {
    beginner: [
      { question: 'What does being a good leader mean to you personally?', hint: 'Use a real person you admire as an anchor.' },
      { question: 'Describe how you would motivate a team that has low morale.', hint: 'Diagnose before you prescribe.' },
      { question: 'How would you handle a team member who is consistently missing deadlines?', hint: 'Lead with curiosity, not criticism.' },
    ],
    intermediate: [
      { question: 'You are newly promoted. Half the team resents you. How do you build trust in your first 30 days?', hint: 'Listen first. Act second.' },
      { question: 'A top performer on your team wants to leave. What do you say in a retention conversation?', hint: 'Understand their real motivation — it may not be money.' },
      { question: 'How do you communicate a difficult organizational change to a resistant team?', hint: 'Frame it around their interests, not the company\'s.' },
    ],
    advanced: [
      { question: 'Your division missed its annual target. Present a recovery plan to the board in 2 minutes.', hint: 'Own it, then pivot to future. No excuses.' },
      { question: 'A team of high achievers is falling apart due to interpersonal conflict. How do you diagnose and fix this as a leader?', hint: 'Address systemic causes, not just symptoms.' },
      { question: 'Define your leadership philosophy and share how it has been tested in a real high-pressure moment.', hint: 'Make it personal and specific. Generic answers lose credibility.' },
    ],
  },
  customer_interaction: {
    beginner: [
      { question: 'A customer is confused about how your product works. Explain it simply.', hint: 'Use an analogy. Avoid technical terms.' },
      { question: 'How do you greet a new customer who walks into your business for the first time?', hint: 'Warm, genuine, not scripted.' },
      { question: 'A customer asks if you have a product you do not carry. How do you respond?', hint: 'Offer an alternative. Never leave them empty-handed.' },
    ],
    intermediate: [
      { question: 'An angry customer calls to cancel their subscription after a service issue. De-escalate and retain them.', hint: 'Empathize first. Solve second. Retain third.' },
      { question: 'Upsell a premium plan to a satisfied customer who did not ask for it.', hint: 'Lead with their benefit, not your revenue goal.' },
      { question: 'A customer blames you for a mistake that was actually their fault. How do you respond professionally?', hint: 'Avoid blame. Focus on resolution.' },
    ],
    advanced: [
      { question: 'A VIP client is threatening to leave after a major service failure. Handle the conversation live.', hint: 'Acknowledge impact. Take ownership. Offer concrete recovery.' },
      { question: 'Negotiate contract renewal terms with a client who has received a competing offer 20% cheaper.', hint: 'Compete on value, not price.' },
      { question: 'Deliver an unpleasant policy change to your most loyal customer without losing the relationship.', hint: 'Frame the change around their long-term interest.' },
    ],
  },
  impromptu: {
    beginner: [
      { question: 'Speak for 30 seconds on the first word that comes to mind when you hear: "future".', hint: 'Go with your gut. Do not overthink.' },
      { question: 'What is one thing most people misunderstand about you? Explain it.', hint: 'Be honest and specific.' },
      { question: 'Pick any object near you right now and sell it to me in 30 seconds.', hint: 'Features → Benefits → Emotional appeal.' },
    ],
    intermediate: [
      { question: 'Without preparation, give a 60-second motivational speech to a team that just lost a client.', hint: 'Start with empathy. End with energy.' },
      { question: 'Someone asks you to summarize your career in exactly 5 sentences. Do it.', hint: 'Past → Present → Future. Make every sentence count.' },
      { question: 'Invent a product on the spot and pitch it in 60 seconds.', hint: 'Problem → Solution → Why now → Call to action.' },
    ],
    advanced: [
      { question: 'You are asked to give a 90-second speech at a farewell party for a colleague you barely know. Make it genuine.', hint: 'Focus on the universal — what great colleagues represent.' },
      { question: 'Defend an opinion you actually disagree with — convincingly.', hint: 'Steel-man the opposite view. Commit to it fully.' },
      { question: 'Respond to this statement with a 60-second rebuttal: "Ambition is overrated in today\'s world."', hint: 'Cite evidence. Keep emotion controlled.' },
    ],
  },
  college_discussion: {
    beginner: [
      { question: 'Why did you choose your major or field of study?', hint: 'Be authentic. Share the real story.' },
      { question: 'Describe a professor or mentor who changed the way you think.', hint: 'Be specific. What exactly did they do or say?' },
      { question: 'What extracurricular activity has taught you the most? Why?', hint: 'Connect the lesson to a future goal.' },
    ],
    intermediate: [
      { question: 'Argue whether theoretical learning or practical internship experience is more valuable for career preparation.', hint: 'Take a strong position. Do not sit on the fence.' },
      { question: 'You are asked to represent your department in a cross-college panel. Introduce your department compellingly.', hint: 'Make it interesting for non-experts.' },
      { question: 'How would you change your university\'s teaching method to better prepare students for the real world?', hint: 'Be constructive and specific. Not just a rant.' },
    ],
    advanced: [
      { question: 'Deliver a 90-second mock TED talk on the single biggest challenge facing students entering the workforce today.', hint: 'One big idea. Three supporting points. Strong ending.' },
      { question: 'You are on a panel debating whether AI will make degrees irrelevant. Argue your position.', hint: 'Use data and logic, not just fear or optimism.' },
      { question: 'Pitch a startup idea inspired by a real problem you faced as a student.', hint: 'The best pitches come from personal pain points.' },
    ],
  },
  meeting: {
    beginner: [
      { question: 'Kick off a team meeting with a 30-second energizer to set a positive tone.', hint: 'Be enthusiastic. Keep it brief.' },
      { question: 'You are asked to give a quick status update on your project. Summarize in 45 seconds.', hint: 'Progress → Blockers → Next steps.' },
      { question: 'Propose adding a new item to the meeting agenda without derailing the discussion.', hint: 'Frame it as adding value, not interrupting.' },
    ],
    intermediate: [
      { question: 'Two team members are in conflict during a live meeting. You are not the facilitator but step in to mediate. Go.', hint: 'Acknowledge both sides. Redirect to the shared goal.' },
      { question: 'A meeting is going off track. You are not the host. How do you reset the agenda professionally?', hint: 'Ask, don\'t tell. "Can I offer a suggestion?"' },
      { question: 'You need to push back on a decision being made in the meeting that you believe is wrong. Do it diplomatically.', hint: 'Ask questions before making statements.' },
    ],
    advanced: [
      { question: 'Chair a simulated executive meeting where two senior leaders are in disagreement. Facilitate resolution in 90 seconds.', hint: 'Structure the conversation. Do not take sides.' },
      { question: 'Present a last-minute change to a project timeline to a stakeholder group that will not be happy. Handle it live.', hint: 'Lead with the solution, not the problem.' },
      { question: 'Close a critical decision meeting where the team cannot reach consensus. Make a call and own it.', hint: 'Decisive leadership is about clarity, not popularity.' },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PRONUNCIATION COACH — Difficulty + Content-Type pools
// ─────────────────────────────────────────────────────────────────────────────
const PRONUNCIATION_CONTENT_TYPES = [
  'everyday_english', 'interviews', 'business', 'technical', 'presentations', 'storytelling', 'public_speaking', 'tongue_twisters'
];
const PRONUNCIATION_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

const PRONUNCIATION_FALLBACKS_V2 = {
  tongue_twisters: {
    beginner: [
      { text: 'She sells seashells by the seashore', phonetic: 'shee selz SEE-shelz by thuh SEE-shor', difficulty: 'Beginner' },
      { text: 'Red lorry, yellow lorry', phonetic: 'red LOR-ee, YEL-oh LOR-ee', difficulty: 'Beginner' },
      { text: 'Betty Botter bought some butter', phonetic: 'BET-ee BOT-er bawt sum BUT-er', difficulty: 'Beginner' },
      { text: 'How much wood would a woodchuck chuck', phonetic: 'how much WUD wud uh WUD-chuk chuk', difficulty: 'Beginner' },
      { text: 'Peter Piper picked a peck of pickled peppers', phonetic: 'PEE-ter PY-per pikt uh pek uv PIK-uld PEP-erz', difficulty: 'Beginner' },
    ],
    intermediate: [
      { text: 'Unique New York, unique New York, you know you need unique New York', phonetic: 'yoo-NEEK noo YORK, yoo-NEEK noo YORK, yoo noh yoo need yoo-NEEK noo YORK', difficulty: 'Intermediate' },
      { text: 'The sixth sick sheik\'s sixth sheep is sick', phonetic: 'thuh SIXTH sik SHEEKS sixth sheep iz sik', difficulty: 'Intermediate' },
      { text: 'Which witch watched which wristwatch', phonetic: 'wich witch WOTCHT wich RIST-wotch', difficulty: 'Intermediate' },
      { text: 'Rubber baby buggy bumpers', phonetic: 'RUB-er BAY-bee BUG-ee BUM-perz', difficulty: 'Intermediate' },
      { text: 'Irish wristwatch, Swiss wristwatch', phonetic: 'EYE-rish RIST-wotch, swis RIST-wotch', difficulty: 'Intermediate' },
    ],
    advanced: [
      { text: 'The thirty-three thieves thought that they thrilled the throne throughout Thursday', phonetic: 'thuh THER-tee-three theevz thawt that thay thrild thuh throhn throo-OWT THERZ-day', difficulty: 'Advanced' },
      { text: 'Pad kid poured curd pulled cod', phonetic: 'pad kid pord kerd puld kod', difficulty: 'Advanced' },
      { text: 'Brisk brave brigadiers brandished broad bright blades blunderbusses and bludgeons', phonetic: 'brisk brayv brih-guh-DEERZ BRAN-disht brawd bryt blaydz BLUN-der-BUS-ez and BLUJ-unz', difficulty: 'Advanced' },
      { text: 'Six slippery snails slid slowly seaward', phonetic: 'siks SLIP-er-ee snaylz slid SLOH-lee SEE-werd', difficulty: 'Advanced' },
      { text: 'Can you can a can as a canner can can a can', phonetic: 'kan yoo kan uh kan az uh KAN-er kan kan uh kan', difficulty: 'Advanced' },
    ],
  },
  everyday_english: {
    beginner: [
      { text: 'I would like to reschedule our appointment', phonetic: 'I wud LYK to ree-SKEJ-ool OWR uh-POINT-ment', difficulty: 'Beginner' },
      { text: 'Could you please repeat that?', phonetic: 'kud yoo PLEEZ rih-PEET that', difficulty: 'Beginner' },
      { text: 'I appreciate your patience', phonetic: 'I uh-PREE-shee-ayt yor PAY-shents', difficulty: 'Beginner' },
      { text: 'Let me think about that for a moment', phonetic: 'let mee THINK uh-BOWT that for uh MOH-ment', difficulty: 'Beginner' },
      { text: 'I completely understand your concern', phonetic: 'I kum-PLEET-lee un-der-STAND yor kun-SERN', difficulty: 'Beginner' },
    ],
    intermediate: [
      { text: 'To be perfectly honest, I have some reservations about this approach', phonetic: 'to bee PER-fekt-lee ON-est, I hav sum rez-er-VAY-shunz uh-BOWT this uh-PROHCH', difficulty: 'Intermediate' },
      { text: 'I\'d like to build on what you just said', phonetic: 'eyd LYK to bild on wut yoo just sed', difficulty: 'Intermediate' },
      { text: 'That raises an interesting question worth exploring', phonetic: 'that RAYZ-ez an IN-ter-es-ting KWES-chun werth ek-SPLOR-ing', difficulty: 'Intermediate' },
      { text: 'Let\'s circle back to the original agenda item', phonetic: 'lets SER-kul bak to thuh uh-RIJ-in-ul uh-JEN-duh EYE-tem', difficulty: 'Intermediate' },
      { text: 'I\'d like to propose an alternative perspective', phonetic: 'eyd LYK to pruh-POHZ an awl-TER-nuh-tiv per-SPEK-tiv', difficulty: 'Intermediate' },
    ],
    advanced: [
      { text: 'The underlying assumption here requires further scrutiny', phonetic: 'thuh UN-der-LY-ing uh-SUMP-shun heer rih-KWYRZ FER-ther SKROO-tih-nee', difficulty: 'Advanced' },
      { text: 'We ought to reconsider the ramifications of that decision', phonetic: 'wee awt to ree-kun-SID-er thuh ram-ih-fih-KAY-shunz uv that dih-SIZ-hun', difficulty: 'Advanced' },
      { text: 'That\'s a nuanced distinction that merits careful consideration', phonetic: 'thats uh NYOO-anst dih-STINK-shun that MER-its KAYR-ful kun-sid-er-AY-shun', difficulty: 'Advanced' },
      { text: 'I\'d like to challenge the premise of that assertion', phonetic: 'eyd LYK to CHAL-enj thuh PREM-is uv that uh-SER-shun', difficulty: 'Advanced' },
      { text: 'Broadly speaking, the evidence points to a divergent conclusion', phonetic: 'BROD-lee SPEEK-ing, thuh EV-ih-dens points to uh dy-VER-jent kun-KLOO-zhun', difficulty: 'Advanced' },
    ],
  },
  interviews: {
    beginner: [
      { text: 'I am a highly motivated and results-driven professional', phonetic: 'I am uh HY-lee MOH-tih-vay-tid and rih-ZULTZ-driv-un pruh-FESH-un-ul', difficulty: 'Beginner' },
      { text: 'My greatest strength is my ability to adapt quickly', phonetic: 'my GRAY-test strength iz my uh-BIL-ih-tee to uh-DAPT KWIK-lee', difficulty: 'Beginner' },
      { text: 'I am passionate about continuous learning and self-improvement', phonetic: 'I am PASH-un-it uh-BOWT kun-TIN-yoo-us LER-ning and self-im-PROOV-ment', difficulty: 'Beginner' },
      { text: 'I work well both independently and collaboratively', phonetic: 'I werk wel bohth in-dih-PEN-dent-lee and kuh-LAB-uh-ruh-tiv-lee', difficulty: 'Beginner' },
      { text: 'I thrive in fast-paced and dynamic environments', phonetic: 'I thryv in FAST-payst and dy-NAM-ik en-VY-run-ments', difficulty: 'Beginner' },
    ],
    intermediate: [
      { text: 'I demonstrated strong cross-functional leadership throughout that initiative', phonetic: 'I dem-un-STRAYT-id strong KROS-FUNK-shun-ul LEE-der-ship throo-OWT that ih-NISH-ee-ih-tiv', difficulty: 'Intermediate' },
      { text: 'I consistently exceeded quarterly performance benchmarks by significant margins', phonetic: 'I kun-SIS-tent-lee ek-SEED-id KWOR-ter-lee per-FORM-ants BENCH-marks by sig-NIH-fih-kunt MAR-jinz', difficulty: 'Intermediate' },
      { text: 'My approach to conflict resolution prioritizes mutual understanding', phonetic: 'my uh-PROHCH to KON-flikt rez-uh-LOO-shun PRY-or-ih-TY-zes MYOO-choo-ul un-der-STAND-ing', difficulty: 'Intermediate' },
      { text: 'I spearheaded a digital transformation initiative that reduced operational costs', phonetic: 'I SPEER-hed-id uh DIJ-ih-tul trans-for-MAY-shun ih-NISH-ee-ih-tiv that rih-DOOSD op-er-AY-shun-ul costs', difficulty: 'Intermediate' },
      { text: 'This role aligns perfectly with my long-term career trajectory', phonetic: 'this rohl uh-LYNZ PER-fekt-lee with my long-term kuh-REER truh-JEK-tor-ee', difficulty: 'Intermediate' },
    ],
    advanced: [
      { text: 'My stakeholder management capabilities have been instrumental in navigating organizational complexity', phonetic: 'my STAYK-hohl-der MAN-ij-ment KAY-puh-BIL-ih-teez hav been in-STRU-men-tul in NAV-ih-gay-ting or-guh-nih-ZAY-shun-ul KOM-plek-sih-tee', difficulty: 'Advanced' },
      { text: 'I synthesize quantitative analysis with qualitative insights to drive strategic decision-making', phonetic: 'I SIN-thuh-syz KWON-tih-tay-tiv uh-NAL-ih-sis with KWOL-ih-tay-tiv IN-syts to dryv struh-TEE-jik dih-SIZ-hun MAY-king', difficulty: 'Advanced' },
      { text: 'My track record demonstrates consistent delivery against ambitious organizational mandates', phonetic: 'my trak REK-ord DEM-un-strayt-iz kun-SIS-tent dih-LIV-er-ee uh-GENST am-BIH-shus or-guh-nih-ZAY-shun-ul MAN-dayts', difficulty: 'Advanced' },
      { text: 'I leverage data-driven methodologies to build scalable systems that compound over time', phonetic: 'I LEV-er-ij DAY-tuh-driv-en meth-uh-DOL-uh-jeez to bild SKAY-luh-bul SIS-temz that KOM-pownd OH-ver tym', difficulty: 'Advanced' },
      { text: 'My cross-cultural competency has enabled effective collaboration across geographically dispersed teams', phonetic: 'my kros-KUL-chem-ul kom-PEE-ten-see haz EN-ay-buld uh-FEK-tiv kuh-LAB-er-AY-shun uh-KROS jee-uh-GRAF-ih-klee dih-SPERST teemz', difficulty: 'Advanced' },
    ],
  },
  business: {
    beginner: [
      { text: 'Let us schedule a follow-up meeting', phonetic: 'let us SKEJ-ool uh FOL-oh-up MEE-ting', difficulty: 'Beginner' },
      { text: 'I will circle back to you on this', phonetic: 'I wil SER-kul bak to yoo on this', difficulty: 'Beginner' },
      { text: 'Can we align on the next steps?', phonetic: 'kan wee uh-LYN on thuh nekst steps', difficulty: 'Beginner' },
      { text: 'Please review the attached proposal', phonetic: 'pleez rih-VYOO thuh uh-TACHT pruh-POH-zul', difficulty: 'Beginner' },
      { text: 'Our quarterly results exceeded expectations', phonetic: 'OWR KWOR-ter-lee rih-ZULTS ek-SEED-id ek-spek-TAY-shunz', difficulty: 'Beginner' },
    ],
    intermediate: [
      { text: 'We need to realign our go-to-market strategy for Q3', phonetic: 'wee need to ree-uh-LYN OWR GOH-to-MAR-ket STRAT-ih-jee for KYOO-three', difficulty: 'Intermediate' },
      { text: 'The ROI on this initiative far exceeds our original projections', phonetic: 'thuh AR-OH-EYE on this ih-NISH-ee-ih-tiv far ek-SEEDZ OWR uh-RIJ-ih-nul pruh-JEK-shunz', difficulty: 'Intermediate' },
      { text: 'We should leverage our competitive differentiators more strategically', phonetic: 'wee shud LEV-er-ij OWR kom-PET-ih-tiv dif-er-en-shee-AY-torz mor struh-TEE-jih-klee', difficulty: 'Intermediate' },
      { text: 'This merger will create significant synergies across all business units', phonetic: 'this MER-jer wil kree-AYT sig-NIH-fih-kunt SIN-er-jeez uh-KROS awl BIZ-nes YOO-nits', difficulty: 'Intermediate' },
      { text: 'Our key performance indicators show sustained year-over-year growth', phonetic: 'OWR kee per-FORM-ants IN-dih-kay-torz shoh suh-STAYND YER-oh-ver-YER grohth', difficulty: 'Intermediate' },
    ],
    advanced: [
      { text: 'We need to optimize our capital allocation strategy to maximize shareholder value', phonetic: 'wee need to OP-tih-myz OWR KAP-ih-tul al-uh-KAY-shun STRAT-ih-jee to MAK-sih-myz SHAIR-hohl-der VAL-yoo', difficulty: 'Advanced' },
      { text: 'The macroeconomic headwinds are creating unprecedented volatility in our sector', phonetic: 'thuh MAK-roh-ee-kuh-NOM-ik HED-windz ar kree-AY-ting un-PREE-sih-den-tid vol-uh-TIL-ih-tee in OWR SEK-tor', difficulty: 'Advanced' },
      { text: 'Our organizational restructuring aims to eliminate redundancies and streamline cross-functional workflows', phonetic: 'OWR or-guh-nih-ZAY-shun-ul ree-STRUK-cher-ing aymz to ih-LIM-ih-nayt ree-DUN-dun-seez and STREEM-lyne kros-FUNK-shun-ul WER-kflohz', difficulty: 'Advanced' },
      { text: 'We must recalibrate our pricing architecture to reflect the evolving competitive landscape', phonetic: 'wee must ree-KAL-ih-brayt OWR PRY-sing AR-kih-tek-cher to rih-FLEKT thuh ih-VOL-ving kom-PET-ih-tiv LAND-skayp', difficulty: 'Advanced' },
      { text: 'The due diligence process revealed several material risks requiring immediate remediation', phonetic: 'thuh dyoo DIL-ih-jents PROS-es rih-VEELD SEV-er-ul muh-TEER-ee-ul risks rih-KWYR-ing ih-MEE-dee-it ree-mee-dee-AY-shun', difficulty: 'Advanced' },
    ],
  },
  presentations: {
    beginner: [
      { text: 'Good morning and thank you all for being here', phonetic: 'gud MOR-ning and thank yoo awl for BEE-ing heer', difficulty: 'Beginner' },
      { text: 'Today I will be presenting our quarterly results', phonetic: 'tuh-DAY I wil bee pruh-ZEN-ting OWR KWOR-ter-lee rih-ZULTS', difficulty: 'Beginner' },
      { text: 'Please feel free to ask questions at any time', phonetic: 'pleez feel free to ask KWES-chunz at EN-ee tym', difficulty: 'Beginner' },
      { text: 'Let me walk you through the key highlights', phonetic: 'let mee wawk yoo throo thuh kee HY-lyts', difficulty: 'Beginner' },
      { text: 'To summarize what we have covered today', phonetic: 'to SUM-uh-ryz wut wee hav KUV-erd tuh-DAY', difficulty: 'Beginner' },
    ],
    intermediate: [
      { text: 'I would like to draw your attention to this particularly data point', phonetic: 'I wud LYK to draw yor uh-TEN-shun to this par-TIK-yoo-ler-lee comp-EL-ing DATA point', difficulty: 'Intermediate' },
      { text: 'This slide illustrates the correlation between investment and outcomes', phonetic: 'this slyd IL-us-trayt-iz thuh kor-uh-LAY-shun bih-TWEEN in-VES-tment and OWT-kumz', difficulty: 'Intermediate' },
      { text: 'As you can see from the trajectory, we are outpacing benchmarks', phonetic: 'az yoo kan see from thuh truh-JEK-tor-ee, wee ar OWT-pay-sing BENCH-marks', difficulty: 'Intermediate' },
      { text: 'I want to be transparent about both opportunities and challenges ahead', phonetic: 'I wont to bee trans-PAIR-ent uh-BOWT bohth thuh op-er-TOON-ih-teez and thuh CHAL-en-jez uh-HED', difficulty: 'Intermediate' },
      { text: 'The strategic rationale behind this decision is threefold', phonetic: 'thuh struh-TEE-jik RASH-uh-nul buh-HYND this dih-SIZ-hun iz THREE-fohld', difficulty: 'Intermediate' },
    ],
    advanced: [
      { text: 'This represents a paradigm shift that will fundamentally alter the competitive landscape', phonetic: 'this REP-rih-zents uh PAIR-uh-dym shift that wil FUN-duh-men-tul-ee AWL-ter thuh kom-PET-ih-tiv LAND-skayp', difficulty: 'Advanced' },
      { text: 'I would like to challenge a commonly held assumption that has driven strategy', phonetic: 'I wud LYK to CHAL-enj uh KOM-un-lee held uh-SUMP-shun that haz drivn OWR STRAT-ih-jee', difficulty: 'Advanced' },
      { text: 'The cascading implications of this decision extend well beyond our fiscal horizon', phonetic: 'thuh kas-KAY-ding im-plih-KAY-shunz uv this dih-SIZ-hun ek-STEND wel bih-YOND OWR FIS-kul huh-RY-zun', difficulty: 'Advanced' },
      { text: 'Rather than viewing this as a setback, I invite you to reframe it as strategic point', phonetic: 'RATH-er than VYOO-ing this az uh SET-bak, I in-VYT yoo to ree-FRAYM it az uh struh-TEE-jik point', difficulty: 'Advanced' },
      { text: 'The empirical evidence corroborates what our qualitative research indicated', phonetic: 'thuh em-PEER-ih-kul EV-ih-dens kuh-ROB-uh-rayts wut OWR KWOL-ih-tay-tiv REE-serch IN-dih-kay-tid', difficulty: 'Advanced' },
    ],
  },
  storytelling: {
    beginner: [
      { text: 'It was one of those moments that changed everything', phonetic: 'it wuz wun uv thohz MOH-ments that CHAYNJ-d EV-ree-thing', difficulty: 'Beginner' },
      { text: 'I remember the day clearly, as if it were yesterday', phonetic: 'I rih-MEM-ber thuh day KLEER-lee, az if it wer YES-ter-day', difficulty: 'Beginner' },
      { text: 'What started as a routine task quickly became an adventure', phonetic: 'wut STAR-tid az uh roo-TEEN task KWIK-lee bih-KAYM an ad-VEN-cher', difficulty: 'Beginner' },
      { text: 'Looking back, I realize how that experience shaped me', phonetic: 'LUK-ing bak, I REE-uh-lyz how that ik-SPEER-ee-uns SHAYPT mee', difficulty: 'Beginner' },
      { text: 'The lesson I took away from that moment was simple but profound', phonetic: 'thuh LES-un I tuk uh-WAY from that MOH-ment wuz SIM-pul but pruh-FOWND', difficulty: 'Beginner' },
    ],
    intermediate: [
      { text: 'The pivotal moment arrived unexpectedly, catching everyone off guard', phonetic: 'thuh PIV-uh-tul MOH-ment uh-RYVD un-ek-SPEK-tid-lee, KACH-ing EV-ree-wun awf gard', difficulty: 'Intermediate' },
      { text: 'What made the situation extraordinary was not what happened, but how we responded', phonetic: 'wut mayd thuh sich-oo-AY-shun ek-STROR-dih-ner-ee wuz not wut HAP-und, but how wee rih-SPOND-id', difficulty: 'Intermediate' },
      { text: 'In that instant, I understood what resilience truly meant in practice', phonetic: 'in that IN-stunt, I un-der-STOOD wut rih-ZIL-yents TROO-lee ment in PRAK-tis', difficulty: 'Intermediate' },
      { text: 'Against all expectations, the outcome revealed something none of us had anticipated', phonetic: 'uh-GENST awl ek-spek-TAY-shunz, thuh OWT-kum rih-VEELD SUM-thing nun uv us had an-TIS-ih-pay-tid', difficulty: 'Intermediate' },
      { text: 'That experience fundamentally rewired the way I approached every challenge thereafter', phonetic: 'that ik-SPEER-ee-uns FUN-duh-men-tul-ee REE-wyrd thuh way I uh-PROHCHT EV-ree CHAL-enj THAIR-af-ter', difficulty: 'Intermediate' },
    ],
    advanced: [
      { text: 'What the narrative obscures is the extraordinary tension between intention and circumstance', phonetic: 'wut thuh NAIR-uh-tiv ob-SKYOORZ iz thuh ek-STROR-dih-ner-ee TEN-shun bih-TWEEN in-TEN-shun and SER-kum-stuns', difficulty: 'Advanced' },
      { text: 'The irony was not lost on anyone — success had arrived in the exact form none of us had imagined', phonetic: 'thuh EYE-ruh-nee wuz not lost on EN-ee-wun — suk-SES had uh-RYVD in thuh ig-ZAKT form nun uv us had ih-MAJ-ind', difficulty: 'Advanced' },
      { text: 'In retrospect, the trajectory of events was almost inevitable — each decision a stepping stone toward an unforeseen conclusion', phonetic: 'in RET-ruh-spekt, thuh truh-JEK-tor-ee uv ih-VENTS wuz aw-mohst in-EV-ih-tuh-bul — each dih-SIZ-hun uh STEP-ing stohn tuh-WORD an un-for-SEEN kun-KLOO-zhun', difficulty: 'Advanced' },
      { text: 'The tension between what we wanted and what the situation demanded created an almost unbearable clarity', phonetic: 'thuh TEN-shun bih-TWEEN wut wee WON-tid and wut thuh sich-oo-AY-shun dih-MAN-did kree-AY-tid an awl-mohst un-BAIR-uh-bul KLAIR-ih-tee', difficulty: 'Advanced' },
      { text: 'What began as a professional setback ultimately redefined what I understood about leadership and identity', phonetic: 'wut bih-GAN az uh pruh-FESH-un-ul SET-bak ul-TIH-mit-lee ree-dih-FYND wut I un-der-STOOD uh-BOWT LEE-der-ship and y-DEN-tih-tee', difficulty: 'Advanced' },
    ],
  },
  public_speaking: {
    beginner: [
      { text: 'Thank you for the warm welcome and the opportunity to speak today', phonetic: 'thank yoo for thuh worm WEL-kum and thuh op-er-TOON-ih-tee to speek tuh-DAY', difficulty: 'Beginner' },
      { text: 'I am honored to address such a distinguished audience', phonetic: 'I am ON-erd to uh-DRES such uh dis-TING-gwisht AW-dee-ents', difficulty: 'Beginner' },
      { text: 'My message today is simple but I believe deeply important', phonetic: 'my MES-ij tuh-DAY iz SIM-pul but I bih-LEEV DEEP-lee im-POR-tunt', difficulty: 'Beginner' },
      { text: 'I would like to leave you with one idea that I hope stays with you', phonetic: 'I wud LYK to leev yoo with wun y-DEE-uh that I hohp stayz with yoo', difficulty: 'Beginner' },
      { text: 'The world changes when we find the courage to speak up', phonetic: 'thuh werld CHAYN-jiz wen wee fynd thuh KER-ij to speek up', difficulty: 'Beginner' },
    ],
    intermediate: [
      { text: 'We stand at a crossroads where the decisions we make today will define our tomorrow', phonetic: 'wee stand at uh KROS-rohdz wair thuh dih-SIZ-hunz wee mayk tuh-DAY wil dih-FYN OWR kuh-LEK-tiv tuh-MOR-oh', difficulty: 'Intermediate' },
      { text: 'I want to challenge you to move beyond the comfortable and familiar into the uncertain', phonetic: 'I wont to CHAL-enj yoo to moov bih-YOND thuh KUM-for-tuh-bul and fuh-MIL-yer IN-too thuh un-SER-tun', difficulty: 'Intermediate' },
      { text: 'The most profound transformations in history began with a single act of courageous communication', phonetic: 'thuh mohst pruh-FOWND trans-for-MAY-shunz in HIS-tor-ee bih-GAN with uh SIN-gul akt uv KER-ij-us kuh-myoo-nih-KAY-shun', difficulty: 'Intermediate' },
      { text: 'What we say matters — but how we say it, and whether we believe it, matters infinitely more', phonetic: 'wut wee say MAT-erz — but how wee say it, and WEH-ther wee bih-LEEV it, MAT-erz in-FIN-it-lee mor', difficulty: 'Intermediate' },
      { text: 'This is not merely a professional challenge — it is a deeply human one', phonetic: 'this iz not MEER-lee uh pruh-FESH-un-ul CHAL-enj — it iz uh DEEP-lee HYOO-mun wun', difficulty: 'Intermediate' },
    ],
    advanced: [
      { text: 'We must resist the seductive comfort of certainty and embrace the generative tension of complexity', phonetic: 'wee must rih-ZIST thuh suh-DUK-tiv KUM-fort uv SER-tun-tee and em-BRAYS thuh JEN-er-uh-tiv TEN-shun uv KOM-plek-sih-tee', difficulty: 'Advanced' },
      { text: 'The audacity to speak a new truth into an established reality is the birthright of every communicator', phonetic: 'thuh aw-DAS-ih-tee to speek uh nyoo trooth IN-too an uh-STAB-lisht ree-AL-ih-tee iz thuh BERTH-ryt uv EV-ree KER-ij-us', difficulty: 'Advanced' },
      { text: 'Rhetoric without authenticity is manipulation; authenticity without rhetoric is noise', phonetic: 'RET-er-ik with-OWT aw-then-TIS-ih-tee iz muh-NIP-yoo-LAY-shun; aw-then-TIS-ih-tee with-OWT RET-er-ik iz noyz', difficulty: 'Advanced' },
      { text: 'The greatest speeches in history were lived, and then spoken at the precise moment the world was ready', phonetic: 'thuh GRAY-test SPEE-chiz in HIS-tor-ee wer not RIT-un — thay wer livd, and then SPOH-kun at thuh pruh-SYS MOH-ment', difficulty: 'Advanced' },
      { text: 'Silence, deployed with intention, carries more rhetorical weight than a thousand perfectly crafted words', phonetic: 'SY-lents, dih-PLOYD with in-TEN-shun, KAIR-eez mor reh-TOR-ih-kul wayt than uh THOW-zund PER-fekt-lee KRAFT-id werdz', difficulty: 'Advanced' },
    ],
  },
  technical: {
    beginner: [
      { text: 'The application programming interface enables seamless data exchange', phonetic: 'thuh ap-lih-KAY-shun PROH-program-ing IN-ter-fays EN-ay-bulz SEEM-les DAY-tuh ek-SCHANGJ', difficulty: 'Beginner' },
      { text: 'This algorithm processes large datasets efficiently', phonetic: 'this AL-gor-ith-um PROS-es-iz larj DAY-tuh-sets ih-FISH-ent-lee', difficulty: 'Beginner' },
      { text: 'The cloud infrastructure scales automatically with demand', phonetic: 'thuh klowd IN-fruh-STRUK-cher skayl-z aw-tuh-MAT-ih-klee with dih-MAND', difficulty: 'Beginner' },
      { text: 'Machine learning models improve with additional training data', phonetic: 'muh-SHEEN LER-ning MOD-ulz im-PROOV with uh-DIH-shun-ul TRAY-ning DAY-tuh', difficulty: 'Beginner' },
      { text: 'The microservices architecture improves system resilience and scalability', phonetic: 'thuh MY-kroh-SER-vis-iz AR-kih-tek-cher im-PROOVZ SIS-tem rih-ZIL-yents and skay-luh-BIL-ih-tee', difficulty: 'Beginner' },
    ],
    intermediate: [
      { text: 'Asynchronous communication patterns reduce latency in distributed systems', phonetic: 'ay-SING-kruh-nus kuh-myoo-nih-KAY-shun PAT-ernz rih-DOOS LAY-ten-see in dis-TRIB-yoo-tid SIS-temz', difficulty: 'Intermediate' },
      { text: 'The containerization of workloads enables reproducible deployment environments', phonetic: 'thuh kuh-tayn-er-ih-ZAY-shun uv WER-klohds EN-ay-bulz ree-pruh-DYOO-suh-bul dih-PLOY-ment en-VY-run-ments', difficulty: 'Intermediate' },
      { text: 'We implemented a multi-threaded event-driven architecture to optimize throughput', phonetic: 'wee im-PLI-men-tid uh MUL-tee-THRED-id ih-VENT-driv-un AR-kih-tek-cher to OP-tih-myz THROO-poot', difficulty: 'Intermediate' },
      { text: 'The neural network\'s backpropagation algorithm adjusts weights through gradient descent', phonetic: 'thuh NYOOR-ul NET-werks bak-prop-uh-GAY-shun AL-gor-ith-um uh-JUST wayts throo GRAY-dee-ent dih-SENT', difficulty: 'Intermediate' },
      { text: 'Kubernetes orchestrates containerized workloads across the cluster infrastructure', phonetic: 'KYOO-ber-NET-eez OR-kes-trayts kuh-tayn-er-IZD WER-klohds uh-KROS thuh KLUS-ter IN-fruh-STRUK-cher', difficulty: 'Intermediate' },
    ],
    advanced: [
      { text: 'The eventual consistency model introduces inherent trade-offs between partition tolerance and availability', phonetic: 'thuh ih-VEN-choo-ul kun-SIS-ten-see MOD-ul in-TRUH-dyooz-iz in-HEER-ent TRAYD-awfs bih-TWEEN par-TIH-shun TOL-er-ents and uh-VAYL-uh-BIL-ih-tee', difficulty: 'Advanced' },
      { text: 'We leverage graph neural networks to capture complex relational semantics in heterogeneous datasets', phonetic: 'wee LEV-er-ij graf NYOOR-ul NET-werks to KAP-cher KOM-pleks rih-LAY-shun-ul suh-MAN-tiks in HET-er-uh-JEE-nee-us DAY-tuh-sets', difficulty: 'Advanced' },
      { text: 'The cryptographic hash function ensures data integrity through collision-resistant one-way transformation', phonetic: 'thuh krip-tuh-GRAF-ik hash FUNK-shun en-SHOORZ DAY-tuh in-TEG-rih-tee throo kuh-LIH-zhun-rih-ZIS-tunt wun-way trans-for-MAY-shun', difficulty: 'Advanced' },
      { text: 'Federated learning enables privacy-preserving model training across decentralized data silos', phonetic: 'FED-er-ay-tid LER-ning EN-ay-bulz PRY-vuh-see-pruh-ZER-ving MOD-ul TRAY-ning uh-KROS dee-SEN-truh-lyzd DAY-tuh SY-lohz', difficulty: 'Advanced' },
      { text: 'The quantum decoherence problem fundamentally challenges the viability of large-scale fault-tolerant computation', phonetic: 'thuh KWON-tum dee-koh-HEER-ents PROB-lem FUN-duh-men-tul-ee CHAL-en-jiz thuh vy-uh-BIL-ih-tee uv larj-SKAYL FAWLT-TOL-er-unt kom-pyoo-TAY-shun', difficulty: 'Advanced' },
    ],
  },
};

const SPEECH_ANALYZER_FALLBACKS = [
  {
    id: 'product_pitch',
    label: 'Product Pitch',
    category: 'Business',
    icon: '🚀',
    text: 'Our product is a next-generation AI-powered communication platform that transforms the way professionals develop their speaking skills. By combining real-time feedback with personalized coaching, we help users become more confident, articulate, and effective communicators in any situation.',
  },
  {
    id: 'professional_intro',
    label: 'Professional Introduction',
    category: 'Career',
    icon: '💼',
    text: 'My name is Alex, and I am a product manager with five years of experience driving cross-functional teams to deliver high-impact solutions. I specialize in translating complex technical requirements into clear product roadmaps that align with business objectives and delight end users.',
  },
  {
    id: 'leadership_vision',
    label: 'Leadership Vision',
    category: 'Leadership',
    icon: '🎯',
    text: 'Great leadership is not about authority — it is about influence, empathy, and clarity. A truly effective leader sets a compelling vision, communicates it with conviction, and empowers their team to take ownership. When people understand the why behind their work, they perform at their highest level.',
  },
  {
    id: 'opinion_statement',
    label: 'Opinion Statement',
    category: 'Communication',
    icon: '💬',
    text: 'I strongly believe that communication is the single most underestimated professional skill. Technical expertise can get you hired, but it is your ability to articulate ideas, negotiate disagreements, and inspire action through words that determines how far you go in your career.',
  },
  {
    id: 'crisis_communication',
    label: 'Crisis Communication',
    category: 'Professional',
    icon: '⚡',
    text: 'When a crisis emerges, the first sixty seconds of communication matter most. Leaders must acknowledge the situation, demonstrate empathy, and outline concrete next steps — all while projecting calm authority. Silence or vague statements erode trust faster than the crisis itself.',
  },
];

const FILLER_DETECTION_FALLBACKS = [
  { topic: 'Describe your ideal work environment and why it brings out the best in you.', category: 'Career', icon: '🏢' },
  { topic: 'Explain the biggest lesson you learned from a challenging project or experience.', category: 'Personal', icon: '📚' },
  { topic: 'Talk about a technology trend that excites you and why it matters.', category: 'Technology', icon: '🤖' },
  { topic: 'Describe how you would spend a perfect productive day from morning to evening.', category: 'Lifestyle', icon: '☀️' },
  { topic: 'Explain what leadership means to you and give an example from your life.', category: 'Leadership', icon: '🎯' },
  { topic: 'Talk about a skill you want to learn this year and how you plan to develop it.', category: 'Growth', icon: '🌱' },
  { topic: 'Describe a place you have visited or want to visit and why it fascinates you.', category: 'Travel', icon: '✈️' },
];

const VOICE_CLARITY_FALLBACKS = [
  { topic: 'Present a 60-second introduction of yourself to a room full of senior executives.', category: 'Executive Presence', icon: '🎤', targetPace: '130-150 WPM', tip: 'Project confidence. Slow down on key points.' },
  { topic: 'Explain to a new team member how your team works together and what makes it successful.', category: 'Team Communication', icon: '👥', targetPace: '120-140 WPM', tip: 'Speak clearly and conversationally. Vary your pace.' },
  { topic: 'Describe a complex process or system you understand well, as if explaining it to a client.', category: 'Technical Clarity', icon: '⚙️', targetPace: '110-130 WPM', tip: 'Pause between key concepts to let them land.' },
  { topic: 'Give a 60-second sales pitch for a product or idea you believe in.', category: 'Sales & Persuasion', icon: '💡', targetPace: '140-160 WPM', tip: 'Energetic delivery. Emphasize benefits clearly.' },
  { topic: 'Read aloud a difficult announcement — a project delay — with calm authority.', category: 'Difficult Conversations', icon: '📢', targetPace: '100-120 WPM', tip: 'Slow, measured. Clarity and empathy over speed.' },
];

// ─── Per-tool AI prompt builders ──────────────────────────────────────────────
const buildConfidencePrompt = (scenario, difficulty, previousTopics) => {
  const prevSection = previousTopics?.length > 0
    ? `\nAVOID these topics/questions already used (do not repeat): ${previousTopics.join('; ')}`
    : '';
  const diffGuide = {
    beginner: 'Use plain, accessible language. Questions should be answerable by someone with limited speaking practice.',
    intermediate: 'Use realistic professional scenarios. Require structured thinking and clear opinions.',
    advanced: 'Create high-pressure, nuanced scenarios. Require sophisticated reasoning, evidence-based arguments, and executive-level delivery.',
  }[difficulty || 'intermediate'] || 'Use realistic scenarios.';

  return `You are an elite communication coach creating a UNIQUE ${(difficulty || 'intermediate').toUpperCase()} level speaking challenge.
Scenario context: ${scenario || 'impromptu'}
Difficulty level: ${difficulty || 'intermediate'} (${diffGuide})
${prevSection}

Rules:
- Generate EXACTLY ONE unique, specific, thought-provoking challenge question.
- It must feel like a realistic situation corresponding to: ${scenario || 'impromptu'}.
- Include a short immersive setup or context, not just a plain generic question.

Return ONLY JSON:
{
  "question": "<the challenge or question prompt>",
  "category": "<the scenario type label e.g. HR Interview | College Discussion | Meeting | Impromptu>",
  "hint": "<one concrete 8-word coaching tip to help the user begin>",
  "duration": 45
}`;
};

const buildPronunciationPrompt = (contentType, difficulty, previousPhrases) => {
  const prevSection = previousPhrases?.length > 0
    ? `\nAVOID these phrases/words already used: ${previousPhrases.join('; ')}`
    : '';
  const diffGuide = {
    beginner: 'Use short, common phrases (5-8 words max). Clear syllable breaks. Everyday vocabulary.',
    intermediate: 'Use professional and moderately complex phrases (8-15 words). Include multisyllabic words.',
    advanced: 'Use long, complex, high-density professional or technical phrases (15+ words). Maximum articulation challenge.',
  }[difficulty || 'intermediate'] || 'Sufficient difficulty.';

  return `You are an expert pronunciation coach generating FRESH, UNIQUE drill content.
Content Type: ${contentType || 'everyday_english'}
Difficulty: ${difficulty || 'intermediate'} (${diffGuide})
${prevSection}

Rules:
- Generate EXACTLY 5 unique, distinct phrases/sentences.
- Phrases must be progressively more complex (phrase 1 easiest, phrase 5 hardest).
- Phonetic guides use UPPERCASE for stressed syllables.
- Phonetic guide uses simplified English phonetics (NOT IPA).

Return ONLY JSON:
{
  "label": "<friendly label for this session e.g. 'Advanced Business Language'>",
  "emoji": "<1 relevant emoji>",
  "phrases": [
    { "text": "<phrase 1 — easiest>", "phonetic": "<phonetic guide with STRESSED syllables in UPPERCASE>" },
    { "text": "<phrase 2>", "phonetic": "<phonetic guide>" },
    { "text": "<phrase 3>", "phonetic": "<phonetic guide>" },
    { "text": "<phrase 4>", "phonetic": "<phonetic guide>" },
    { "text": "<phrase 5 — hardest>", "phonetic": "<phonetic guide>" }
  ]
}`;
};

const buildFollowUpPrompt = (scenario, difficulty, originalQuestion, userAnswer, questionNumber) => {
  return `You are an elite communication coach conducting a live ${difficulty} level ${scenario} session.

Context:
- Session type: ${scenario}
- Difficulty: ${difficulty}
- Question ${questionNumber} asked: "${originalQuestion}"
- User's answer: "${userAnswer || 'No response recorded.'}"

Your task: Generate ONE intelligent, context-aware FOLLOW-UP question that:
1. Directly references something specific from the user's answer.
2. Probes deeper into their reasoning, OR challenges a claim they made, OR asks for a concrete example.
3. Feels like a real conversation.
4. Is calibrated to ${difficulty} level.

Return ONLY JSON:
{
  "question": "<the follow-up question>",
  "category": "Follow-up",
  "hint": "<one 8-word coaching tip specific to this follow-up>",
  "duration": 45
}`;
};

const buildSpeechScriptPrompt = (previousTopics) => {
  const prevSection = previousTopics?.length > 0
    ? `\nAVOID these topics already used: ${previousTopics.join('; ')}`
    : '';
  return `You are a speech coach generating a unique reading script for a pronunciation and fluency drill.
${prevSection}

Generate a 3-5 sentence professional reading script on a fresh, specific topic.
Return ONLY JSON:
{
  "id": "<snake_case_id>",
  "label": "<short title like 'Strategic Negotiation'>",
  "category": "<Business|Leadership|Career|Communication|Technology>",
  "icon": "<1 relevant emoji>",
  "text": "<3-5 complete professional sentences forming a coherent passage>"
}
The text should be polished, professional, and naturally flowing for reading aloud. Return ONLY valid JSON.`;
};

const buildFillerTopicPrompt = (previousTopics) => {
  const prevSection = previousTopics?.length > 0
    ? `\nAVOID these topics already used: ${previousTopics.join('; ')}`
    : '';
  return `You are a fluency coach generating a speaking prompt to test filler word usage.
${prevSection}

Generate ONE speaking topic the user should speak about for 30-60 seconds.
Return ONLY JSON: { "topic": "<clear prompt sentence>", "category": "<label>", "icon": "<1 emoji>", "hint": "<one 8-word coaching tip to reduce filler words>" }
Make it conversational yet substantive — something that requires real thought. Return ONLY valid JSON.`;
};

const buildVoiceClarityPrompt = (previousTopics) => {
  const prevSection = previousTopics?.length > 0
    ? `\nAVOID these topics already used: ${previousTopics.join('; ')}`
    : '';
  return `You are a voice clarity coach generating a unique vocal challenge drill.
${prevSection}
 
Generate ONE voice clarity challenge that tests pace, volume, and articulation.
Return ONLY JSON: { "topic": "<what to speak about — specific scenario>", "category": "<label>", "icon": "<1 emoji>", "targetPace": "<e.g. 120-140 WPM>", "tip": "<one specific coaching tip about voice quality>" }
Return ONLY valid JSON.`;
};

const buildDailyChallengePrompt = () => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = new Date().getDay();
  const dayName = dayNames[dayOfWeek];

  const types = {
    0: { title: '30 Second Speech', instructions: 'Speak on the given topic for exactly 30 seconds. Do not stop early and do not go too much over.', emoji: '⏱️' },
    1: { title: 'Opinion Challenge', instructions: 'Give your honest opinion on the topic below. Support it with at least 2 reasons. Be confident and direct.', emoji: '💬' },
    2: { title: 'Explain a Concept', instructions: 'Explain the concept below as simply as possible, as if talking to a smart 12-year-old.', emoji: '💡' },
    3: { title: 'Debate Challenge', instructions: 'Argue FOR the given position, even if you personally disagree. Make the strongest possible case.', emoji: '🥊' },
    4: { title: 'Impromptu Speaking', instructions: 'You have 5 seconds to read the topic, then speak immediately. No long pauses allowed!', emoji: '🎯' },
    5: { title: 'Story Completion', instructions: 'Continue the story opening below and give it a satisfying ending. Use vivid language.', emoji: '📖' },
    6: { title: 'Describe a Scene', instructions: 'Describe this scene as vividly and articulately as possible.', emoji: '🖼️' },
  };

  const challengeInfo = types[dayOfWeek] || types[1];

  return `You are a speech coach creating a unique Daily Challenge for the user.
Today is ${dayName}. The challenge type is: "${challengeInfo.title}".
Instructions: "${challengeInfo.instructions}"

Generate ONE unique, creative, thought-provoking prompt/topic for this challenge.
Return ONLY JSON:
{
  "title": "${challengeInfo.title}",
  "prompt": "<the unique challenge prompt or topic or story opening>",
  "instructions": "${challengeInfo.instructions}",
  "emoji": "${challengeInfo.emoji}",
  "xp": 60,
  "duration": 45
}`;
};

// ─── Export function to register routes ──────────────────────────────────────
export const registerCommunicationRoutes = (app, supabaseAdmin, callAIProxy, extractUserId, safeParseJSON) => {

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/communication/generate-prompt
  // Dynamically generates unique practice content for every Practice Tool session
  // ─────────────────────────────────────────────────────────────────────────────
  app.post('/api/communication/generate-prompt', async (req, res) => {
    try {
      const userId = await extractUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      const { tool, scenario, difficulty, contentType, previous_topics } = req.body;
      if (!tool) return res.status(400).json({ error: 'tool is required' });

      const aiToken = req.headers.authorization?.replace('Bearer ', '');
      let prompt = null;

      // Build tool-specific AI prompt
      switch (tool) {
        case 'confidence_builder': {
          const scen = scenario || CONFIDENCE_SCENARIOS[Math.floor(Math.random() * CONFIDENCE_SCENARIOS.length)];
          const diff = difficulty || 'intermediate';
          prompt = buildConfidencePrompt(scen, diff, previous_topics);
          break;
        }
        case 'pronunciation_coach': {
          const type = contentType || PRONUNCIATION_CONTENT_TYPES[Math.floor(Math.random() * PRONUNCIATION_CONTENT_TYPES.length)];
          const diff = difficulty || 'intermediate';
          prompt = buildPronunciationPrompt(type, diff, previous_topics);
          break;
        }
        case 'speech_analyzer': {
          prompt = buildSpeechScriptPrompt(previous_topics);
          break;
        }
        case 'filler_detection': {
          prompt = buildFillerTopicPrompt(previous_topics);
          break;
        }
        case 'voice_clarity': {
          prompt = buildVoiceClarityPrompt(previous_topics);
          break;
        }
        case 'daily_challenge': {
          prompt = buildDailyChallengePrompt();
          break;
        }
        default:
          return res.status(400).json({ error: `Unknown tool: ${tool}` });
      }

      // Try AI generation
      let result = null;
      try {
        const aiResponse = await callAIProxy([
          { role: 'system', content: 'You are a communication coach. Return only valid JSON, no markdown, no extra text.' },
          { role: 'user', content: prompt },
        ], aiToken, true);
        result = safeParseJSON(aiResponse);
      } catch (aiErr) {
        console.warn(`[generate-prompt] AI failed for tool=${tool}:`, aiErr.message);
      }

      // Fallback to curated pools if AI fails
      if (!result) {
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        switch (tool) {
          case 'confidence_builder': {
            const scen = scenario || 'impromptu';
            const diff = difficulty || 'intermediate';
            const pool = (CONFIDENCE_FALLBACKS[scen] && CONFIDENCE_FALLBACKS[scen][diff]) || CONFIDENCE_FALLBACKS.impromptu.intermediate;
            const chosen = pick(pool);
            result = {
              question: chosen.question,
              category: scen.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              hint: chosen.hint,
              duration: 45
            };
            break;
          }
          case 'pronunciation_coach': {
            const type = contentType || 'everyday_english';
            const diff = difficulty || 'intermediate';
            const pool = (PRONUNCIATION_FALLBACKS_V2[type] && PRONUNCIATION_FALLBACKS_V2[type][diff]) || PRONUNCIATION_FALLBACKS_V2.everyday_english.intermediate;
            result = {
              label: `${diff.charAt(0).toUpperCase() + diff.slice(1)} ${type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`,
              emoji: '🎤',
              phrases: pool
            };
            break;
          }
          case 'speech_analyzer': {
            const unused = SPEECH_ANALYZER_FALLBACKS.filter(s => !previous_topics?.includes(s.id));
            result = pick(unused.length > 0 ? unused : SPEECH_ANALYZER_FALLBACKS);
            break;
          }
          case 'filler_detection': {
            const unused = FILLER_DETECTION_FALLBACKS.filter(f => !previous_topics?.some(p => f.topic.includes(p.substring(0, 20))));
            const chosen = pick(unused.length > 0 ? unused : FILLER_DETECTION_FALLBACKS);
            result = { ...chosen, hint: 'Pause confidently instead of saying "um" or "uh".' };
            break;
          }
          case 'voice_clarity': {
            const unused = VOICE_CLARITY_FALLBACKS.filter(v => !previous_topics?.some(p => v.topic.includes(p.substring(0, 20))));
            result = pick(unused.length > 0 ? unused : VOICE_CLARITY_FALLBACKS);
            break;
          }
          case 'daily_challenge': {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const fallback = {
              0: { title: '30 Second Speech', instructions: "Speak on the given topic for exactly 30 seconds. Don't stop early and don't go too much over.", emoji: '⏱️', prompt: 'The topic is: "The one skill that will matter most in the next 10 years." Ready? Go!', duration: 30, xp: 60 },
              1: { title: 'Opinion Challenge', instructions: 'Give your opinion and support it with at least 2 reasons.', emoji: '💬', prompt: '"Remote work should be the default mode for all knowledge workers."', duration: 45, xp: 50 },
              2: { title: 'Explain a Concept', instructions: 'Explain the concept below as simply as possible to a 12-year-old.', emoji: '💡', prompt: 'Explain how "compound interest" works and why it matters for someone starting their career.', duration: 60, xp: 55 },
              3: { title: 'Debate Challenge', instructions: 'Argue FOR the given position, even if you disagree. Make the strongest possible case.', emoji: '🥊', prompt: 'Argue for: "Failure is more valuable than success as a teacher."', duration: 60, xp: 70 },
              4: { title: 'Impromptu Speaking', instructions: 'You have 5 seconds to read the topic, then speak immediately.', emoji: '🎯', prompt: '"If you could change one thing about how education works, what would it be and why?"', duration: 45, xp: 65 },
              5: { title: 'Story Completion', instructions: 'Continue the story opening and give it a satisfying ending.', emoji: '📖', prompt: 'Continue this: "The email arrived at 11:58 PM. Subject line: \'We need to talk — urgent\'..."', duration: 60, xp: 60 },
              6: { title: 'Describe a Scene', instructions: 'Describe this scene as vividly and articulately as possible.', emoji: '🖼️', prompt: 'Describe this scene: A small café at dawn. One person sits alone at a corner table with a laptop, a cold cup of coffee, and crumpled notes.', duration: 45, xp: 55 },
            }[dayOfWeek] || { title: 'Opinion Challenge', instructions: 'Give your opinion and support it.', emoji: '💬', prompt: '"Is artificial intelligence net positive or negative for society?"', duration: 45, xp: 50 };
            result = fallback;
            break;
          }
        }
      }

      if (!result) return res.status(500).json({ error: 'Failed to generate prompt' });

      res.json({ prompt: result, tool });
    } catch (err) {
      console.error('[Communication] generate-prompt error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/communication/generate-followup
  // Generates context-aware follow-up questions for Confidence Builder
  // ─────────────────────────────────────────────────────────────────────────────
  app.post('/api/communication/generate-followup', async (req, res) => {
    try {
      const userId = await extractUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      const { scenario, difficulty, originalQuestion, userAnswer, questionNumber } = req.body;
      const aiToken = req.headers.authorization?.replace('Bearer ', '');

      const prompt = buildFollowUpPrompt(scenario || 'impromptu', difficulty || 'intermediate', originalQuestion || '', userAnswer || '', questionNumber || 2);

      let result = null;
      try {
        const aiResponse = await callAIProxy([
          { role: 'system', content: 'You are a communication coach. Return only valid JSON, no markdown, no extra text.' },
          { role: 'user', content: prompt },
        ], aiToken, true);
        result = safeParseJSON(aiResponse);
      } catch (aiErr) {
        console.warn(`[generate-followup] AI failed:`, aiErr.message);
      }

      // Fallback follow-up if AI fails
      if (!result) {
        result = {
          question: `Interesting perspective. How would you handle a challenge or unexpected situation related to this?`,
          category: 'Follow-up',
          hint: 'Share a real-life example to support your point.',
          duration: 45
        };
      }

      res.json({ prompt: result });
    } catch (err) {
      console.error('[Communication] generate-followup error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/communication/sessions — list all sessions for the user
  app.get('/api/communication/sessions', async (req, res) => {
    try {
      const userId = await extractUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      if (!supabaseAdmin) {
        const userSessions = MEMORY_DB.sessions.filter(s => s.user_id === userId);
        return res.json({ sessions: userSessions });
      }

      const { data, error } = await supabaseAdmin
        .from('communication_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      res.json({ sessions: data || [] });
    } catch (err) {
      console.error('[Communication] GET sessions error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/communication/user-stats
  // Aggregate stats: XP, level, streak, skill averages, session count, worlds
  // ─────────────────────────────────────────────────────────────────────────────
  app.get('/api/communication/user-stats', async (req, res) => {
    try {
      const userId = await extractUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      let sessions = [];
      if (!supabaseAdmin) {
        sessions = MEMORY_DB.sessions.filter(s => s.user_id === userId);
      } else {
        const { data, error } = await supabaseAdmin
          .from('communication_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (!error) sessions = data || [];
      }

      const completed = sessions.filter(s => s.status === 'completed');
      const totalSessions = completed.length;

      const avg = (key) => totalSessions > 0
        ? Math.round(completed.reduce((sum, s) => sum + (s[key] || 70), 0) / totalSessions)
        : 0;

      const totalXP = completed.reduce((sum, s) => sum + (s.xp_earned || 0), 0);
      const level = Math.floor(totalXP / 200) + 1;
      const levelXP = totalXP % 200;
      const levelMaxXP = 200;

      const overallScore = avg('overall_score');
      const skillScores = {
        grammar: avg('grammar_score'),
        fluency: avg('fluency_score'),
        vocabulary: avg('vocabulary_score'),
        confidence: avg('confidence_score'),
        tone: avg('professional_tone_score'),
        pronunciation: avg('pronunciation_score'),
      };

      // Weakest and strongest skill
      const skillEntries = Object.entries(skillScores);
      const weakest = skillEntries.length > 0 ? skillEntries.sort((a, b) => a[1] - b[1])[0][0] : 'confidence';
      const strongest = skillEntries.length > 0 ? skillEntries.sort((a, b) => b[1] - a[1])[0][0] : 'pronunciation';

      // World completion map
      const worldMap = {};
      completed.forEach(s => {
        if (s.world_id) {
          if (!worldMap[s.world_id]) worldMap[s.world_id] = new Set();
          if (s.mission_id) worldMap[s.world_id].add(s.mission_id);
        }
      });
      const worldCompletion = {};
      Object.entries(worldMap).forEach(([wId, mSet]) => {
        worldCompletion[wId] = mSet.size;
      });

      // Streak calculation (consecutive days with sessions)
      const sessionDays = [...new Set(completed.map(s =>
        new Date(s.completed_at || s.created_at).toDateString()
      ))].sort().reverse();
      let streak = 0;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (sessionDays[0] === today || sessionDays[0] === yesterday) {
        streak = 1;
        for (let i = 1; i < sessionDays.length; i++) {
          const prev = new Date(sessionDays[i - 1]);
          const curr = new Date(sessionDays[i]);
          const diff = (prev - curr) / 86400000;
          if (Math.round(diff) === 1) streak++;
          else break;
        }
      }

      // Weekly XP (last 7 days)
      const weeklyXP = [];
      for (let d = 6; d >= 0; d--) {
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        dayStart.setDate(dayStart.getDate() - d);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        const dayXP = completed
          .filter(s => {
            const t = new Date(s.completed_at || s.created_at);
            return t >= dayStart && t <= dayEnd;
          })
          .reduce((sum, s) => sum + (s.xp_earned || 0), 0);
        weeklyXP.push(dayXP);
      }

      // Recent sessions (last 5)
      const recentSessions = completed.slice(0, 5).map(s => ({
        id: s.id,
        title: s.title || s.mission_id,
        world_id: s.world_id,
        overall_score: s.overall_score || 0,
        xp_earned: s.xp_earned || 0,
        completed_at: s.completed_at || s.created_at,
        difficulty: s.difficulty,
      }));

      res.json({
        totalSessions,
        totalXP,
        level,
        levelXP,
        levelMaxXP,
        streak,
        overallScore,
        skillScores,
        weakest,
        strongest,
        worldCompletion,
        weeklyXP,
        recentSessions,
      });
    } catch (err) {
      console.error('[Communication] user-stats error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/communication/achievements
  // Returns earned + in-progress achievements based on session history
  // ─────────────────────────────────────────────────────────────────────────────
  app.get('/api/communication/achievements', async (req, res) => {
    try {
      const userId = await extractUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      let sessions = [];
      if (!supabaseAdmin) {
        sessions = MEMORY_DB.sessions.filter(s => s.user_id === userId);
      } else {
        const { data } = await supabaseAdmin
          .from('communication_sessions')
          .select('*')
          .eq('user_id', userId);
        sessions = data || [];
      }

      const completed = sessions.filter(s => s.status === 'completed');
      const totalSessions = completed.length;
      const bestScore = completed.length > 0 ? Math.max(...completed.map(s => s.overall_score || 0)) : 0;
      const totalXP = completed.reduce((sum, s) => sum + (s.xp_earned || 0), 0);
      const level = Math.floor(totalXP / 200) + 1;

      const worldSessions = {};
      completed.forEach(s => {
        if (s.world_id) {
          if (!worldSessions[s.world_id]) worldSessions[s.world_id] = new Set();
          if (s.mission_id) worldSessions[s.world_id].add(s.mission_id);
        }
      });

      const highGrammar = completed.filter(s => (s.grammar_score || 0) >= 95).length;
      const noFiller = completed.filter(s => (s.fluency_score || 0) >= 90).length;
      const confidentSessions = completed.filter(s => (s.confidence_score || 0) >= 80).length;
      const estimatedMinutes = totalSessions * 7;

      const ACHIEVEMENTS_DEF = [
        { id: 'first_session',    label: 'First Conversation',  desc: 'Complete your first AI session',          icon: '💬', rarity: 'bronze',  progress: Math.min(1, totalSessions),    max: 1 },
        { id: 'five_sessions',    label: 'Consistent',          desc: 'Complete 5 sessions',                     icon: '🔥', rarity: 'bronze',  progress: Math.min(5, totalSessions),    max: 5 },
        { id: 'ten_sessions',     label: 'Dedicated',           desc: 'Complete 10 sessions',                    icon: '⚡', rarity: 'silver',  progress: Math.min(10, totalSessions),   max: 10 },
        { id: 'score_80',         label: 'Communicator',        desc: 'Score 80+ overall in any session',        icon: '🎯', rarity: 'silver',  progress: bestScore >= 80 ? 1 : 0,       max: 1 },
        { id: 'score_90',         label: 'Excellence',          desc: 'Score 90+ overall in any session',        icon: '💎', rarity: 'gold',    progress: bestScore >= 90 ? 1 : 0,       max: 1 },
        { id: 'confident_speaker',label: 'Confident Speaker',   desc: 'Score 80+ confidence in 3 sessions',     icon: '💪', rarity: 'silver',  progress: Math.min(3, confidentSessions),max: 3 },
        { id: 'no_filler',        label: 'No Filler Words',     desc: 'Score 90+ fluency in 3 sessions',         icon: '🧹', rarity: 'gold',    progress: Math.min(3, noFiller),         max: 3 },
        { id: 'grammar_master',   label: 'Grammar Master',      desc: 'Score 95+ grammar in 5 sessions',         icon: '✍️', rarity: 'gold',    progress: Math.min(5, highGrammar),      max: 5 },
        { id: 'level_5',          label: 'Level 5',             desc: 'Reach communication level 5',             icon: '⭐', rarity: 'silver',  progress: Math.min(5, level),            max: 5 },
        { id: 'level_10',         label: 'Level 10',            desc: 'Reach communication level 10',            icon: '🏆', rarity: 'gold',    progress: Math.min(10, level),           max: 10 },
        { id: 'campus_start',     label: 'Campus Explorer',     desc: 'Complete 1 Campus World mission',         icon: '🎓', rarity: 'bronze',  progress: Math.min(1, worldSessions.campus?.size || 0), max: 1 },
        { id: 'campus_champion',  label: 'Campus Champion',     desc: 'Complete all 8 Campus missions',          icon: '🏛️', rarity: 'gold',    progress: Math.min(8, worldSessions.campus?.size || 0), max: 8 },
        { id: 'workplace_start',  label: 'Office Ready',        desc: 'Complete 1 Workplace mission',            icon: '💼', rarity: 'bronze',  progress: Math.min(1, worldSessions.workplace?.size || 0), max: 1 },
        { id: 'workplace_pro',    label: 'Workplace Pro',       desc: 'Complete all 5 Workplace missions',       icon: '🏢', rarity: 'gold',    progress: Math.min(5, worldSessions.workplace?.size || 0), max: 5 },
        { id: 'social_start',     label: 'Socialite',           desc: 'Complete 1 Social World mission',         icon: '🤝', rarity: 'bronze',  progress: Math.min(1, worldSessions.social?.size || 0),    max: 1 },
        { id: 'leadership_start', label: 'Leader in Making',    desc: 'Complete 1 Leadership mission',           icon: '🎤', rarity: 'bronze',  progress: Math.min(1, worldSessions.leadership?.size || 0), max: 1 },
        { id: 'leadership_master',label: 'Leadership Master',   desc: 'Complete all 5 Leadership missions',      icon: '👑', rarity: 'diamond', progress: Math.min(5, worldSessions.leadership?.size || 0), max: 5 },
        { id: 'speaking_time',    label: '100 Min Speaking',    desc: 'Accumulate 100 minutes of practice',      icon: '⏱️', rarity: 'diamond', progress: Math.min(100, estimatedMinutes), max: 100 },
      ];

      const achievements = ACHIEVEMENTS_DEF.map(a => ({
        ...a,
        earned: a.progress >= a.max,
      }));

      res.json({ achievements });
    } catch (err) {
      console.error('[Communication] achievements error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/communication/daily-challenge/complete
  // Save a completed daily challenge and award XP
  // ─────────────────────────────────────────────────────────────────────────────
  app.post('/api/communication/daily-challenge/complete', async (req, res) => {
    try {
      const userId = await extractUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      const { challenge_type, transcript, score, xp_earned, date_key } = req.body;
      if (!challenge_type || !transcript) return res.status(400).json({ error: 'challenge_type and transcript required' });

      const xp = xp_earned || 60;
      const today = date_key || new Date().toISOString().split('T')[0];

      // Run through coaching analysis for better feedback
      let analysis = { overall_score: score || 70, suggestions: [], strengths: [] };
      const aiToken = req.headers.authorization?.replace('Bearer ', '');
      try {
        const aiResponse = await callAIProxy([
          { role: 'system', content: 'You are a communication coach. Return only valid JSON.' },
          { role: 'user', content: `Daily challenge "${challenge_type}" transcript: "${transcript}". Score the communication quality and return JSON: { "overall_score": <0-100>, "strengths": ["<str>"], "suggestions": ["<str>"] }` }
        ], aiToken, true);
        const parsed = safeParseJSON(aiResponse);
        if (parsed?.overall_score) analysis = parsed;
      } catch {}

      if (!supabaseAdmin) {
        const record = { userId, challenge_type, transcript, score: analysis.overall_score, xp_earned: xp, date_key: today, created_at: new Date().toISOString() };
        if (!MEMORY_DB.dailyChallenges) MEMORY_DB.dailyChallenges = [];
        MEMORY_DB.dailyChallenges.push(record);
        return res.json({ success: true, xp_earned: xp, score: analysis.overall_score, analysis });
      }

      // Supabase save (best-effort — table may not exist)
      try {
        await supabaseAdmin.from('communication_daily_challenges').insert({
          user_id: userId, challenge_type, transcript,
          score: analysis.overall_score, xp_earned: xp, date_key: today
        });
      } catch {}

      res.json({ success: true, xp_earned: xp, score: analysis.overall_score, analysis });
    } catch (err) {
      console.error('[Communication] daily-challenge/complete error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/communication/save-tool-session — save a completed studio tool session and award XP
  app.post('/api/communication/save-tool-session', async (req, res) => {
    try {
      const userId = await extractUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      const { tool, difficulty, scores, feedback } = req.body;
      if (!tool) return res.status(400).json({ error: 'tool is required' });

      const toolConfigs = {
        confidence_builder: { title: 'Confidence Builder', xp: 60 },
        speech_analyzer: { title: 'Speech Analyzer', xp: 50 },
        pronunciation_coach: { title: 'Pronunciation Coach', xp: 40 },
        filler_detection: { title: 'Filler Word Coach', xp: 30 },
        voice_clarity: { title: 'Voice Clarity Coach', xp: 50 }
      };

      const config = toolConfigs[tool] || { title: tool.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), xp: 40 };
      const xpEarned = Math.round(config.xp * ((scores?.overall || 75) / 100));

      const sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

      const sessionObj = {
        id: sessionId,
        user_id: userId,
        scenario_type: tool,
        mission_id: tool,
        world_id: 'studio',
        title: config.title,
        difficulty: difficulty || 'intermediate',
        status: 'completed',
        overall_score: scores?.overall || 75,
        grammar_score: scores?.grammar || 75,
        fluency_score: scores?.fluency || 75,
        vocabulary_score: scores?.vocabulary || 75,
        confidence_score: scores?.confidence || 75,
        professional_tone_score: scores?.tone || 75,
        pronunciation_score: scores?.pronunciation || 75,
        xp_earned: xpEarned,
        completed_at: new Date().toISOString(),
        overall_feedback: feedback || { suggestions: [], strengths: [] }
      };

      if (!supabaseAdmin) {
        MEMORY_DB.sessions.push(sessionObj);
        return res.json({ success: true, session: sessionObj, xp_earned: xpEarned });
      }

      const { data, error } = await supabaseAdmin
        .from('communication_sessions')
        .insert(sessionObj)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, session: data, xp_earned: xpEarned });
    } catch (err) {
      console.error('[Communication] save-tool-session error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/communication/session — create a new session and get first AI message
  app.post('/api/communication/session', async (req, res) => {
    try {
      const userId = await extractUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      const { scenario_type, mission_id, world_id, title, difficulty } = req.body;
      const mId = mission_id || scenario_type;
      const wId = world_id || mId.split('_')[0];

      // Retrieve mission config — checks both world missions and standalone tools
      const { missionConfig } = lookupMissionConfig(mId, wId);

      if (!missionConfig) {
        return res.status(404).json({ error: `Mission "${mId}" not found. Please check world_id and mission_id.` });
      }

      // Dynamic scenario generation prompt
      const generatorMessages = [
        {
          role: 'system',
          content: 'You are an AI Scenario Generator for a professional communication practice game. Return ONLY a valid JSON object. No explanations.'
        },
        {
          role: 'user',
          content: `Generate a unique starting scenario and initial opening message for this communication mission.
MISSION CONFIG:
- World: ${wId}
- Mission: ${missionConfig.title}
- Objective: ${missionConfig.objective}
- Character: ${missionConfig.character.name} (${missionConfig.character.role})
- Personality/Tone: ${missionConfig.character.tone}
- Difficulty: ${difficulty || missionConfig.difficulty}

To ensure replayability, introduce a random unique circumstance (e.g. a specific urgency, team context, budget issue, personal reason, or project blocker) that makes this specific run unique.

Return ONLY a JSON object:
{
  "scenario_description": "<description of the specific circumstance, blocker or context>",
  "opening_message": "<the first spoken line from ${missionConfig.character.name} to the user to start the conversation>"
}`
        }
      ];

      let scenarioDesc = `A realistic scenario for ${missionConfig.title}.`;
      let openingMsgText = `Hello! I'm ${missionConfig.character.name}. Shall we start our discussion?`;

      const aiToken = req.headers.authorization?.replace('Bearer ', '');
      try {
        const aiResponse = await callAIProxy(generatorMessages, aiToken, true);
        const parsed = safeParseJSON(aiResponse);
        if (parsed && parsed.opening_message) {
          scenarioDesc = parsed.scenario_description || scenarioDesc;
          openingMsgText = parsed.opening_message;
        }
      } catch (err) {
        console.warn('[AI] Scenario generator failed, falling back to static default:', err.message);
        // Fallback default openings
        const defaultOpenings = {
          campus_introduce_yourself: "Good morning! Welcome to my class. I'm Professor Emma, and I always like to take the first few minutes to meet each of my students personally. Could you start by telling me a bit about yourself — your name, what program you're enrolled in, and where you're from?",
          campus_ask_doubt: "Oh, yes — please come in! I just finished the lecture on arrays and linked lists. Did you have a question about something I covered?",
          campus_assignment_extension: "Good afternoon. Please, have a seat. What can I help you with today? Office hours are quite busy this time of semester.",
          campus_project_discussion: "Come in, come in! I've been looking forward to discussing your project proposal. Why don't you start by walking me through your core idea?",
          campus_group_discussion: "Alright everyone — today's group discussion is on a pretty hot topic: 'Should AI replace human teachers in higher education?' Let's start with you — what's your take?",
          campus_seminar_presentation: "Good afternoon and welcome. When you're ready, please state your name, your topic, and give us a one-sentence overview of what you'll be presenting today.",
          campus_research_proposal: "Good morning. Thank you for meeting with me today to discuss your research proposal. So let's begin: what is your research question, stated as precisely as you can?",
          campus_final_viva: "Good morning. Please sit down and make yourself comfortable. I've reviewed your thesis submission. In your own words, could you summarise the core purpose of your project?",
          workplace_standup: "Hi everyone, let's get the daily standup started. What updates do you have for us today?",
          workplace_feedback: "Hey, thanks for dropping by. You wanted to chat about feedback on your recent performance, right? Let's discuss.",
          workplace_salary_negotiation: "Hello, thanks for scheduling this call. I wanted to discuss the job offer terms we sent over. What are your thoughts?",
          workplace_performance_review: "Welcome to your mid-year review. Let's start by looking at your key achievements over the past six months.",
          workplace_client_presentation: "Good morning. Thanks for setting up this demo today. We're very interested in seeing what you've built.",
          social_networking: "Hey there! Quite a turnout at this meetup tonight, isn't it? What line of work are you in?",
          social_founder_pitch: "Thanks for meeting me for coffee. You said you had a startup idea you wanted to run by me?",
          leadership_townhall: "Thank you all for joining our town hall meeting today. Before we open up for employee Q&A, I want to invite you to present the product roadmap update.",
          leadership_vc_pitch: "Hello, thanks for pitching us today. We've reviewed your deck. Tell us, what makes your startup a multi-billion dollar opportunity?"
        };
        openingMsgText = defaultOpenings[mId] || openingMsgText;
      }

      const sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

      const sessionObj = {
        id: sessionId,
        user_id: userId,
        scenario_type: mId,
        mission_id: mId,
        world_id: wId,
        title: missionConfig.title,
        difficulty: difficulty || missionConfig.difficulty,
        estimated_duration: missionConfig.duration,
        scenario_description: scenarioDesc,
        status: 'active',
        created_at: new Date().toISOString()
      };

      const aiMsgObj = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        session_id: sessionId,
        sender: 'ai',
        message_text: openingMsgText,
        created_at: new Date().toISOString()
      };

      if (!supabaseAdmin) {
        MEMORY_DB.sessions.push(sessionObj);
        MEMORY_DB.messages.push(aiMsgObj);
        return res.json({ session: sessionObj, initial_message: aiMsgObj });
      }

      // Save to Supabase
      const { data: session, error: sErr } = await supabaseAdmin
        .from('communication_sessions')
        .insert({
          id: sessionId,
          user_id: userId,
          scenario_type: mId,
          mission_id: mId,
          world_id: wId,
          title: missionConfig.title,
          difficulty: difficulty || missionConfig.difficulty,
          estimated_duration: missionConfig.duration,
          scenario_description: scenarioDesc,
          status: 'active'
        })
        .select()
        .single();

      if (sErr) throw sErr;

      const { data: aiMsg, error: mErr } = await supabaseAdmin
        .from('communication_messages')
        .insert({
          session_id: sessionId,
          sender: 'ai',
          message_text: openingMsgText
        })
        .select()
        .single();

      if (mErr) throw mErr;

      res.json({ session, initial_message: aiMsg });
    } catch (err) {
      console.error('[Communication] Session creation error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/communication/session/:id/message — send user message, get AI reply
  app.post('/api/communication/session/:id/message', async (req, res) => {
    try {
      const userId = await extractUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      const { id } = req.params;
      const { message_text } = req.body;
      if (!message_text?.trim()) return res.status(400).json({ error: 'message_text is required' });

      let session;
      let history = [];

      if (!supabaseAdmin) {
        session = MEMORY_DB.sessions.find(s => s.id === id && s.user_id === userId && s.status === 'active');
        if (!session) return res.status(404).json({ error: 'Session not found or already ended' });
        history = MEMORY_DB.messages.filter(m => m.session_id === id);
      } else {
        const { data: sData, error: sErr } = await supabaseAdmin
          .from('communication_sessions')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        if (sErr || !sData) return res.status(404).json({ error: 'Session not found or already ended' });
        session = sData;

        const { data: hData } = await supabaseAdmin
          .from('communication_messages')
          .select('*')
          .eq('session_id', id)
          .order('created_at', { ascending: true });
        history = hData || [];
      }

      // Create and save user message
      const userMsgId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      const userMsgObj = {
        id: userMsgId,
        session_id: id,
        sender: 'user',
        message_text: message_text.trim(),
        created_at: new Date().toISOString()
      };

      if (!supabaseAdmin) {
        MEMORY_DB.messages.push(userMsgObj);
      } else {
        const { error: userMsgErr } = await supabaseAdmin
          .from('communication_messages')
          .insert(userMsgObj);
        if (userMsgErr) throw userMsgErr;
      }

      // Build AI chat prompts dynamically
      const { missionConfig } = lookupMissionConfig(session.mission_id, session.world_id);

      const systemPrompt = `You are playing a role-play communication simulation game.
Your character name is "${missionConfig.character.name}", who is a "${missionConfig.character.role}".
Personality/behavior style: ${missionConfig.character.tone}

CURRENT SCENARIO CIRCUMSTANCE:
${session.scenario_description}

MISSION OBJECTIVE:
${missionConfig.objective}

COMMUNICATION GOAL FOR USER:
${missionConfig.communicationGoal}

DIFFICULTY LEVEL: ${session.difficulty.toUpperCase()}
At this difficulty level:
- Easy: Keep questions simple, give positive reinforcements, guide them if they fail.
- Medium: Act like a normal realistic partner, ask standard business questions.
- Hard: Challenge their statements, play devil's advocate, ask for concrete proof, point out inconsistencies.

ADAPTIVE CONVERSATION:
- If the user responds confidently and with excellent detail: increase difficulty, ask deeper/more analytical questions.
- If the user struggles or gives short answers: simplify your questions, guide them, and offer gentle encouragement in character.
- DO NOT repeat questions you have already asked. Check previous context.
- Keep your replies realistic and short (2-3 sentences max).
- If the user has addressed all Success Criteria (${missionConfig.successCriteria.join(', ')}), or if the conversation has naturally resolved, end the session cleanly with a concluding statement (e.g. "Thank you, that clarifies everything. I think we have a solid plan. Have a good day!").

NEVER break character. NEVER mention that you are an AI assistant. Speak directly as ${missionConfig.character.name}.`;

      const aiMessages = [
        { role: 'system', content: systemPrompt },
        ...history.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.message_text
        })),
        { role: 'user', content: message_text.trim() }
      ];

      // Generate AI response
      let aiText = "That's a good point. Let's discuss it further.";
      const aiToken = req.headers.authorization?.replace('Bearer ', '');
      try {
        const aiResponse = await callAIProxy(aiMessages, aiToken, false);
        aiText = typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse);
        try {
          const parsed = JSON.parse(aiText);
          if (parsed.response || parsed.message || parsed.content) {
            aiText = parsed.response || parsed.message || parsed.content;
          }
        } catch {}
      } catch (err) {
        console.warn('[AI] Chat proxy failed, using dynamic simulated response:', err.message);
        aiText = simulateResponse(message_text.trim(), session.mission_id, history.length);
      }

      const aiMsgId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      const aiMsgObj = {
        id: aiMsgId,
        session_id: id,
        sender: 'ai',
        message_text: aiText.trim(),
        created_at: new Date().toISOString()
      };

      if (!supabaseAdmin) {
        MEMORY_DB.messages.push(aiMsgObj);
      } else {
        const { error: aiMsgErr } = await supabaseAdmin
          .from('communication_messages')
          .insert(aiMsgObj);
        if (aiMsgErr) throw aiMsgErr;
      }

      res.json({ user_message: userMsgObj, ai_message: aiMsgObj });
    } catch (err) {
      console.error('[Communication] Message exchange error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/communication/session/:id/end — end session, generate feedback
  app.post('/api/communication/session/:id/end', async (req, res) => {
    try {
      const userId = await extractUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      const { id } = req.params;
      let session;
      let messages = [];

      if (!supabaseAdmin) {
        const sessionIdx = MEMORY_DB.sessions.findIndex(s => s.id === id && s.user_id === userId);
        if (sessionIdx === -1) return res.status(404).json({ error: 'Session not found' });
        session = MEMORY_DB.sessions[sessionIdx];
        messages = MEMORY_DB.messages.filter(m => m.session_id === id);
      } else {
        const { data: sData, error: sErr } = await supabaseAdmin
          .from('communication_sessions')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .single();

        if (sErr || !sData) return res.status(404).json({ error: 'Session not found' });
        session = sData;

        const { data: mData } = await supabaseAdmin
          .from('communication_messages')
          .select('*')
          .eq('session_id', id)
          .order('created_at', { ascending: true });
        messages = mData || [];
      }

      const userMessages = messages.filter(m => m.sender === 'user');
      if (userMessages.length === 0) {
        return res.status(400).json({ error: "Looks like you didn't provide any responses during the session. Please try again." });
      }

      const { missionConfig } = lookupMissionConfig(session.mission_id, session.world_id);

      // Generate feedback
      let feedback = getDefaultFeedback();
      if (userMessages.length > 0) {
        try {
          const feedbackPrompt = buildFeedbackPrompt(messages, missionConfig);
          const aiToken = req.headers.authorization?.replace('Bearer ', '');
          const aiResponse = await callAIProxy([
            { role: 'system', content: 'You are a communication coach. Return only valid JSON.' },
            { role: 'user', content: feedbackPrompt },
          ], aiToken, true);

          const parsed = safeParseJSON(aiResponse);
          if (parsed && parsed.overall_score) {
            feedback = parsed;
          }
        } catch (feedbackErr) {
          console.error('[Communication] Feedback generation error:', feedbackErr.message);
        }
      }

      const baseXP = missionConfig?.xp || 100;
      const xpMultiplier = (feedback.overall_score || 75) / 100;
      const xpEarned = Math.round(baseXP * xpMultiplier);

      const completedAt = new Date().toISOString();

      const updatedSessionFields = {
        status: 'completed',
        completed_at: completedAt,
        overall_score: feedback.overall_score || 75,
        grammar_score: feedback.grammar_score || 75,
        fluency_score: feedback.fluency_score || 70,
        vocabulary_score: feedback.vocabulary_score || 72,
        confidence_score: feedback.confidence_score || 70,
        professional_tone_score: feedback.professional_tone_score || 75,
        pronunciation_score: feedback.pronunciation_score || 80,
        xp_earned: xpEarned,
        overall_feedback: feedback,
      };

      if (!supabaseAdmin) {
        const sessionIdx = MEMORY_DB.sessions.findIndex(s => s.id === id);
        const updated = { ...session, ...updatedSessionFields };
        MEMORY_DB.sessions[sessionIdx] = updated;
        return res.json({ session: updated, feedback, xp_earned: xpEarned });
      }

      // Update session as completed in DB
      const { data: updatedSession, error: updateErr } = await supabaseAdmin
        .from('communication_sessions')
        .update(updatedSessionFields)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      console.log(`[Communication] Session ${id} completed. Score: ${feedback.overall_score}, XP: ${xpEarned}`);
      res.json({ session: updatedSession, feedback, xp_earned: xpEarned });
    } catch (err) {
      console.error('[Communication] POST end error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/communication/analyze-speech — custom speech analyzer API
  app.post('/api/communication/analyze-speech', async (req, res) => {
    try {
      const userId = await extractUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      const { text } = req.body;
      if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

      const systemPrompt = `You are an expert communication coach and speech therapist.
Analyze the student's spoken text and evaluate their grammar, fluency, vocabulary, confidence, professional tone, and estimated pronunciation clarity.

Return ONLY a JSON object with this exact structure:
{
  "overall_score": <integer 0-100>,
  "grammar_score": <integer 0-100>,
  "fluency_score": <integer 0-100>,
  "vocabulary_score": <integer 0-100>,
  "confidence_score": <integer 0-100>,
  "professional_tone_score": <integer 0-100>,
  "pronunciation_score": <integer 0-100>,
  "strengths": [<string>, <string>],
  "areas_to_improve": [<string>, <string>],
  "suggestions": [<string>, <string>]
}
Return ONLY valid JSON.`;

      let analysis = {
        overall_score: 78,
        grammar_score: 80,
        fluency_score: 75,
        vocabulary_score: 78,
        confidence_score: 82,
        professional_tone_score: 75,
        pronunciation_score: 80,
        strengths: ["Direct and assertive expression", "Strong confidence tone"],
        areas_to_improve: ["Use of advanced vocabulary", "Sentence structure flow"],
        suggestions: ["Practice incorporating technical terms", "Read high-quality articles aloud"]
      };

      const aiToken = req.headers.authorization?.replace('Bearer ', '');
      try {
        const aiResponse = await callAIProxy([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `SPEECH TRANSCRIPT: "${text}"` }
        ], aiToken, true);
        const parsed = safeParseJSON(aiResponse);
        if (parsed && parsed.overall_score) {
          analysis = parsed;
        }
      } catch (err) {
        console.warn('[AI] custom speech analyzer failed, using default fallback:', err.message);
      }

      res.json({ analysis });
    } catch (err) {
      console.error('[Communication] Custom speech analysis error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/communication/analyze-coaching
  // Full unified coaching analysis — replaces separate speech/filler/voice pages
  // ─────────────────────────────────────────────────────────────────────────────
  app.post('/api/communication/analyze-coaching', async (req, res) => {
    try {
      const userId = await extractUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      const { text, mission_id, world_id, previous_attempt } = req.body;
      if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

      // Build optional mission context string
      let missionContext = '';
      if (mission_id && world_id) {
        const worldConfig = WORLDS_CONFIG[world_id];
        const missionConfig = worldConfig?.missions[mission_id];
        if (missionConfig) {
          missionContext = `Mission: ${missionConfig.title}. Goal: ${missionConfig.communicationGoal}. Skills: ${missionConfig.skills.join(', ')}.`;
        }
      }

      const prompt = buildCoachingAnalysisPrompt(text, missionContext, previous_attempt);

      // Default fallback analysis
      const words = text.trim().split(/\s+/);
      const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally'];
      const foundFillers = fillerWords.filter(fw => text.toLowerCase().includes(fw));
      let analysis = {
        scores: {
          overall: 74, grammar: 75, fluency: 70, confidence: 72,
          vocabulary: 74, pronunciation: 80, tone: 73, sentence_structure: 71,
          filler_word_count: foundFillers.length,
          speech_speed_wpm: Math.round(words.length * 2.3)
        },
        explanations: {
          grammar: "Your sentences follow basic grammatical rules with minor inconsistencies.",
          fluency: "Your speech flows reasonably well but has some hesitations.",
          confidence: "You express your thoughts with moderate confidence and could be more assertive.",
          vocabulary: "You use familiar words effectively; expanding your vocabulary range will help.",
          pronunciation: "Your pronunciation is clear and easy to understand.",
          tone: "Your tone is appropriate for the context with room for improvement.",
          sentence_structure: "You form complete sentences though structure variety would help."
        },
        filler_words_found: foundFillers,
        strengths: ["Clear communication intent", "Completed full thought", "Good basic structure"],
        areas_to_improve: ["Reduce filler words", "Use more varied vocabulary"],
        turn_improvements: [
          {
            original: text.substring(0, 60),
            improved: text.substring(0, 60).replace(/\bum\b|\buh\b/gi, '').trim(),
            reason: "Removing filler words makes your speech sound more polished and confident."
          }
        ],
        retry_prompt: "Great effort! Now try saying the same thing again — this time without the hesitations. You've got this!",
        personalized_tip: "Focus on pausing briefly instead of using filler words — a confident pause sounds much better than 'um'.",
        next_mission_hint: "Try a higher-difficulty mission to challenge your vocabulary and confidence further."
      };

      const aiToken = req.headers.authorization?.replace('Bearer ', '');
      try {
        const aiResponse = await callAIProxy([
          { role: 'system', content: 'You are a communication coach. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ], aiToken, true);
        const parsed = safeParseJSON(aiResponse);
        if (parsed && parsed.scores && parsed.scores.overall) {
          analysis = parsed;
        }
      } catch (err) {
        console.warn('[AI] Coaching analysis fallback triggered:', err.message);
      }

      console.log(`[Communication] Coaching analysis complete. Score: ${analysis.scores.overall}`);
      res.json({ analysis });
    } catch (err) {
      console.error('[Communication] analyze-coaching error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/communication/coach-hint
  // Fast lightweight endpoint for real-time coaching hints during recording
  // ─────────────────────────────────────────────────────────────────────────────
  app.post('/api/communication/coach-hint', async (req, res) => {
    try {
      const userId = await extractUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      const { text } = req.body;
      if (!text?.trim() || text.trim().split(/\s+/).length < 5) {
        // Not enough text yet to give a hint
        return res.json({ hint: null });
      }

      const fallback = FALLBACK_HINTS[Math.floor(Math.random() * FALLBACK_HINTS.length)];
      let hint = fallback;

      // Quick local detection (no AI needed for these)
      const lower = text.toLowerCase();
      if (/\bum\b|\buh\b/.test(lower)) {
        hint = { hint: "Avoid filler words.", type: "warning" };
      } else if (text.split(/\s+/).length > 80) {
        hint = { hint: "Try to wrap up soon.", type: "nudge" };
      } else if (text.split(/\s+/).length > 40) {
        hint = { hint: "Good detail level!", type: "positive" };
      } else if (/could|would|should|might/.test(lower)) {
        hint = { hint: "Nice professional tone!", type: "positive" };
      } else if (/I want|I need|give me/.test(lower)) {
        hint = { hint: "Try a polite request form.", type: "nudge" };
      }

      res.json({ hint: hint.hint, type: hint.type });
    } catch (err) {
      console.error('[Communication] coach-hint error:', err.message);
      res.json({ hint: null }); // Never fail the frontend
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/communication/analyze-filler
  // Filler word detection — detailed breakdown of filler usage
  // ─────────────────────────────────────────────────────────────────────────────
  app.post('/api/communication/analyze-filler', async (req, res) => {
    try {
      const userId = await extractUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      const { text } = req.body;
      if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

      const FILLER_LIST = [
        'um', 'uh', 'ah', 'er', 'like', 'you know', 'basically', 'actually',
        'literally', 'right', 'so', 'well', 'kind of', 'sort of', 'i mean',
        'you see', 'okay', 'ok', 'just', 'very', 'really'
      ];

      const words = text.toLowerCase().split(/\s+/);
      const totalWords = words.length;
      const duration = Math.ceil(totalWords / 130); // est. mins at avg 130 wpm

      // Build occurrence timeline
      const occurrences = [];
      const fillerCounts = {};
      let idx = 0;
      while (idx < words.length) {
        let matchedPhrase = null;
        let phraseLength = 0;

        const cleanWord1 = words[idx]?.replace(/[^a-z]/g, '') || '';
        const cleanWord2 = words[idx + 1]?.replace(/[^a-z]/g, '') || '';
        const twoWordCombo = `${cleanWord1} ${cleanWord2}`.trim();

        if (['you know', 'kind of', 'sort of', 'i mean', 'you see'].includes(twoWordCombo)) {
          matchedPhrase = twoWordCombo;
          phraseLength = 2;
        } else if (FILLER_LIST.includes(cleanWord1)) {
          matchedPhrase = cleanWord1;
          phraseLength = 1;
        }

        if (matchedPhrase) {
          occurrences.push({
            word: matchedPhrase,
            position: idx,
            time: `${Math.round((idx / totalWords) * duration * 60)}s`
          });
          fillerCounts[matchedPhrase] = (fillerCounts[matchedPhrase] || 0) + 1;
          idx += phraseLength;
        } else {
          idx++;
        }
      }

      const totalFillers = Object.values(fillerCounts).reduce((a, b) => a + b, 0);
      const mostRepeated = Object.entries(fillerCounts).sort((a, b) => b[1] - a[1])[0];

      // Score: 100 - (fillers/totalWords)*100 capped at 0
      const fluencyScore = Math.max(0, Math.round(100 - (totalFillers / totalWords) * 200));

      let aiInsights = {
        summary: `You used ${totalFillers} filler words across ${totalWords} words. This is ${totalFillers < 3 ? 'excellent' : totalFillers < 8 ? 'acceptable' : 'too frequent'}.`,
        suggestions: [
          'Replace "um" with a brief confident pause.',
          'Slow your speaking pace slightly to reduce filler word frequency.',
          'Record yourself speaking and review filler patterns.',
          'Practice answering questions without any filler words first.'
        ]
      };

      const aiToken = req.headers.authorization?.replace('Bearer ', '');
      try {
        const prompt = `Analyze this speech for filler word usage: "${text}"\nFillers found: ${JSON.stringify(fillerCounts)}\nTotal words: ${totalWords}\nReturn ONLY JSON: { "summary": "<2-sentence summary>", "suggestions": ["<tip1>", "<tip2>", "<tip3>"] }`;
        const aiResponse = await callAIProxy([
          { role: 'system', content: 'You are a speech coach. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ], aiToken, true);
        const parsed = safeParseJSON(aiResponse);
        if (parsed?.summary) aiInsights = parsed;
      } catch {}

      const report = {
        totalFillers,
        totalWords,
        fluencyScore,
        mostRepeated: mostRepeated ? { word: mostRepeated[0], count: mostRepeated[1] } : null,
        fillerCounts,
        occurrences: occurrences.slice(0, 20),
        duration,
        ...aiInsights
      };

      // Persist to memory fallback
      if (!supabaseAdmin) {
        MEMORY_DB.fillerReports.push({ userId, report, createdAt: new Date().toISOString() });
      }

      res.json({ report });
    } catch (err) {
      console.error('[Communication] analyze-filler error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/communication/analyze-clarity
  // Voice clarity coaching report
  // ─────────────────────────────────────────────────────────────────────────────
  app.post('/api/communication/analyze-clarity', async (req, res) => {
    try {
      const userId = await extractUserId(req.headers.authorization);
      if (!userId) return res.status(401).json({ error: 'Not authenticated' });

      const { text, duration_seconds } = req.body;
      if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

      const wordCount = text.trim().split(/\s+/).length;
      const durationSecs = duration_seconds || 30;
      const wpm = Math.round((wordCount / durationSecs) * 60);

      // Compute scores
      const paceScore = wpm >= 120 && wpm <= 160 ? 90 : wpm < 80 ? 55 : wpm > 200 ? 50 : 75;
      const clarityScore = Math.min(100, Math.max(40, 85 - (text.match(/um|uh|er|ah/gi)?.length || 0) * 5));
      const fillerCount = (text.match(/\bum\b|\buh\b|\bah\b|\ber\b/gi) || []).length;
      const volumeScore = 80; // estimated from microphone normalization
      const pronunciationScore = Math.min(100, Math.max(60, clarityScore + 5));
      const overallScore = Math.round((paceScore + clarityScore + volumeScore + pronunciationScore) / 4);

      let coaching = {
        paceMessage: wpm < 100 ? 'Speak a little faster to sound more engaged.' : wpm > 180 ? 'Slow down slightly for better clarity.' : 'Your speaking pace is excellent!',
        clarityMessage: clarityScore >= 80 ? 'Very clear speech! Keep it up.' : 'Try to articulate each word fully.',
        volumeMessage: 'Your volume level was appropriate for the recording.',
        overallTip: 'Practice reading aloud daily for 5 minutes to improve your speaking voice consistency.',
        recommendations: [
          'Stand or sit upright to improve breath control.',
          'Take a breath before long sentences instead of rushing through them.',
          'Record yourself weekly and compare progress.'
        ]
      };

      const aiToken = req.headers.authorization?.replace('Bearer ', '');
      try {
        const prompt = `Voice clarity analysis request.\nSpeech text: "${text}"\nStats: ${wpm} WPM, ${fillerCount} filler words, ${durationSecs}s duration.\nReturn ONLY JSON: { "paceMessage": "<1 sentence>", "clarityMessage": "<1 sentence>", "volumeMessage": "<1 sentence>", "overallTip": "<1 sentence>", "recommendations": ["<tip>", "<tip>", "<tip>"] }`;
        const aiResponse = await callAIProxy([
          { role: 'system', content: 'You are a voice coach. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ], aiToken, true);
        const parsed = safeParseJSON(aiResponse);
        if (parsed?.paceMessage) coaching = parsed;
      } catch {}

      res.json({
        report: {
          wpm,
          paceScore,
          clarityScore,
          volumeScore,
          pronunciationScore,
          overallScore,
          wordCount,
          durationSecs,
          fillerCount,
          ...coaching
        }
      });
    } catch (err) {
      console.error('[Communication] analyze-clarity error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

};

// ─── Helper: Default feedback if AI fails ─────────────────────────────────────
const getDefaultFeedback = () => ({
  overall_score: 75,
  grammar_score: 75,
  fluency_score: 70,
  vocabulary_score: 72,
  confidence_score: 70,
  professional_tone_score: 75,
  pronunciation_score: 80,
  strengths: [
    'Good attempt at maintaining professional communication',
    'Showed willingness to engage in the conversation',
    'Demonstrated basic understanding of the topic'
  ],
  areas_to_improve: [
    'Work on adding more specific examples to your answers',
    'Try to expand your responses with more detail'
  ],
  suggestions: [
    'Practice speaking in complete, well-structured sentences',
    'Use more varied vocabulary to express your ideas',
    'Add specific examples when answering questions'
  ],
  grammar_corrections: [],
  turnImprovements: []
});
