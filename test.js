import { readFileSync } from 'fs';

// simple .env parser
const envFile = readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key) env[key.trim()] = val.join('=').trim();
});

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const API_KEY = env.GROQ_API_KEY;
const MODEL = "llama-3.3-70b-versatile";

const config = {
  mode: 'DOMAIN_BASED',
  experienceLevel: 'experienced',
  yearsOfExperience: 5,
  limitType: 'questions',
  numberOfQuestions: 1, // Testing the custom number of questions
  candidateName: 'Test User',
  domain: 'Frontend Development',
  topic: '', // Testing optional topic
};

const prompt = `You are an expert technical interviewer. Generate exactly ${config.numberOfQuestions} interview questions for an experienced professional with ${config.yearsOfExperience} years of experience.

Domain: ${config.domain}
Topic: ${config.topic || 'General concepts'}
This is a domain-based interview. Ask questions specifically about ${config.topic || 'the domain'} within the ${config.domain} domain.

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

async function testGroq() {
  console.log("Testing Groq API with provided .env key...");
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "You are an expert technical interviewer. Always respond with valid JSON only, no markdown code fences." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    console.error("Failed:", await response.text());
    return;
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  console.log("Successfully generated question using Groq API and LLAMA model:");
  console.log(content);
}

testGroq();
