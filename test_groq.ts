import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { generateInterviewQuestions } from './services/gemini.ts'; // assuming running with tsx/ts-node

// Need to mock process.env since Vite env handling isn't here
process.env.API_KEY = process.env.GROQ_API_KEY;

async function runTest() {
  console.log("Testing Groq API integration...");
  console.log("Using API Key:", process.env.API_KEY ? "Set" : "Not Set");
  
  try {
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

    const questions = await generateInterviewQuestions(config as any);
    console.log("Successfully generated questions!");
    console.log(JSON.stringify(questions, null, 2));
  } catch (error) {
    console.error("Test failed:", error);
  }
}

runTest();
