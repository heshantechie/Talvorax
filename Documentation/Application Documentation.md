# Application Documentation

## 1. Application Overview

* **What the application does:** HireReadyAI is a web-based artificial intelligence platform designed to help candidates prepare for job interviews and optimize their resumes. It simulates real-world interviews using voice and text, evaluates candidate responses, and offers AI-driven resume enhancement.
* **Core purpose:** To provide personalized, immediate, and actionable feedback on technical interview skills and resume ATS (Applicant Tracking System) compatibility, bridging the gap between candidates and their target job roles.
* **Target users (inferred from code):** Job seekers, particularly in technology and business domains (e.g., Software Engineering, Data Science, Product Management, Marketing, Sales, Finance), looking to practice mock interviews and tailor their resumes for specific job descriptions.

## 2. Feature Breakdown

### User Features
* **Authentication & Dashboard:** Secure login/signup using Supabase Auth. A visually engaging dashboard tracking historical mock interview performance, areas of improvement, and average scores.
* **Interview Coach:** An interactive AI interviewer supporting multiple modes:
  * *Domain Based:* Questions tailored to a specific industry and topic.
  * *Job Description Based:* Questions extracted from a pasted JD.
  * *Resume Based:* Questions probing the candidate's actual experience based on their uploaded resume.
  * *Company Specific:* Questions mirroring top MNCs and startups.
  * *Previous Experience:* Deep-dives based on a candidate's past interview experiences.
  * *(Coming Soon: Custom Mode)*
* **Mock Interview Session:** Real-time sessions utilizing speech-to-text (Web Speech API) and text-to-speech for an immersive experience. Features a timer, question tracking, and manual/auto next question progression.
* **Post-Interview Analysis:** Detailed feedback comparing the candidate's answer with an "Ideal Answer", computing scores per question, flagging knowledge gaps, and summarizing overall performance.
* **Resume Analyzer:** Accepts PDF/TXT resumes and a target Job Description. Analyzes ATS compatibility, strengths, weaknesses, and missing required skills. 
* **Resume Auto-Optimization (Rewrite):** Uses AI to rewrite the resume content to better align with the target JD, preserving factual structure but enhancing terminology. Allows users to preview and export the rewritten resume as a highly-styled PDF across different visual templates (Classic, Modern, Minimal).

### System Features
* **AI Proxy Layer:** A secure abstraction over the language model (via Supabase Edge Functions) to protect API keys and enforce prompt injection mitigations.
* **Structured Response Enforcement:** Strict Zod parsing of AI responses to guarantee format integrity and prevent app crashes from malformed JSON.
* **File Storage Management:** Secure upload of documents to structured buckets with type/size validation and short-lived signed URLs for retrieval.

## 3. End-to-End User Flow

### Interview Coach Flow
1. **Setup:** User selects an interview mode and configures parameters (e.g., uploads resume, sets experience level, specifies duration).
2. **Generation:** Frontend calls the AI proxy to generate a personalized question set.
3. **Session:** The UI presents questions serially. The browser reads the question aloud. The user clicks "Start Recording" to answer via microphone. The Web Speech API transcribes speech in real-time.
4. **Processing:** Upon finishing the session, all transcriptions are sent to the AI proxy for evaluation.
5. **Review:** The user is presented with a dashboard showing their aggregate score, per-question analysis (Candidate vs. Ideal answers), and dynamically mapped topic weaknesses. 

### Resume Analyzer Flow
1. **Input:** User uploads a resume (TXT or auto-parsed PDF) and pastes a target job description.
2. **Analysis:** The AI proxy processes the inputs and returns an ATS score, strengths, weaknesses, and missing skills.
3. **Refinement:** User manually selects/adds skills they possess that were flagged as missing.
4. **Optimization:** AI rewrites the resume into a structured JSON format incorporating target keywords.
5. **Export:** User views the redesigned resume using one of the aesthetic templates and downloads it as a high-resolution PDF (rendered via HTML2Canvas and jsPDF).

## 4. Project Structure

* `/src/pages/`: Contains the top-level route views (`Dashboard.tsx`, `Login.tsx`, `Signup.tsx`). Lazy-loaded for performance.
* `/components/`: The core feature UI components.
  * `InterviewCoach.tsx`: Entry point and state manager for the mock interview flows.
  * `InterviewSession.tsx`: The active live-interview interface handling recording and timing.
  * `InterviewSetup.tsx`: The configuration forms for the various interview modes.
  * `ResumeAnalyzer.tsx`: The end-to-end resume evaluation and PDF rendering component.
* `/services/`: External integrations.
  * `gemini.ts`: The central AI communication service handling prompts, JSON parsing, retries, and proxy invocation.
  * `speechService.ts`: A wrapper around the browser's native Web Speech API and SpeechSynthesis API.
* `/src/lib/`: Infrastructure wrappers.
  * `db.ts`: Supabase database operations (SQL inserts/updates) for persisting session data.
  * `storage.ts`: Supabase storage operations (Bucket uploads, signed URLs).
  * `supabase.ts`: Supabase client initialization.
* `/src/contexts/`: React contexts (e.g., `AuthContext.tsx` for global user state).

## 5. Core Modules & Logic

### AI Interaction Layer (`services/gemini.ts`)
* **Responsibility:** Act as the bridge between the UI and the LLM. 
* **Logic:** 
  1. Sanitizes user input to prevent prompt injection (`sanitizeUserInput`, `enforceMaxLength`).
  2. Constructs strict prompts demanding JSON stringified outputs structure.
  3. Validates the returned structure against strict `Zod` schemas (e.g., `InterviewFeedbackSchema`, `AnalysisResultSchema`).
  4. Implements automatic exponential backoff for rate limiting (HTTP 429).

### Speech Engine (`services/speechService.ts`)
* **Responsibility:** Manage live audio transcription and playback.
* **Logic:** Instantiates `webkitSpeechRecognition`. Continuously aggregates interim and final transcripts. Includes a heuristic to detect non-English speech (by checking the ratio of non-Latin characters) and trigger a warning. Implements auto-recovery if a network error halts the recognition API mid-session.

### Robust JSON Parsing (`components/ResumeAnalyzer.tsx`)
* **Logic:** AI models frequently fail to perfectly format complex nested JSON (especially with newlines). A `safeParseResumeJSON` utility implements a 4-tier fallback strategy:
  1. Direct `JSON.parse`.
  2. Stripping Markdown code blocks (````json ... ````).
  3. Regex extraction of the outermost JSON object.
  4. Destructive automated newline escaping (`\n`) within strings as a last resort.

## 6. API Documentation

Most external API calls are routed through a Supabase Edge Function (`ai-proxy`). The frontend triggers this via `supabase.functions.invoke()`.

**Edge Function Interface (`ai-proxy`)**
* **Purpose:** Process LLM requests securely.
* **Request Format:**
  ```json
  {
    "messages": [
      { "role": "system", "content": "..." },
      { "role": "user", "content": "..." }
    ],
    "response_format": { "type": "json_object" } // Optional
  }
  ```
* **Authentication:** Automatically securely injects the user's Supabase JWT via the client wrapper.

## 7. Data Flow

1. **Client Action:** User initiates an action (e.g., "Analyze Resume").
2. **Sanitization:** Input is stripped of XML tags and truncated.
3. **Execution:** UI calls `services/gemini.ts`, which dispatches a request to the `ai-proxy` Edge Function.
4. **LLM Processing:** The proxy authenticates the request and forwards it to the private LLM provider (Groq/Gemini).
5. **Validation:** Response returns to the frontend, is sanitized from Markdown wrappers, and structurally validated with Zod.
6. **Persistence:** The parsed data is sent asynchronously to Supabase Postgres via `src/lib/db.ts` to update the user's dashboard history.
7. **UI Update:** React state updates to display the results.

## 8. Data & Storage

### Database Schema (Supabase Postgres)
* **`interview_sessions`**: Tracks metadata about an interview attempt (mode, duration, config parameters, completion status).
* **`interview_questions`**: Stores the AI-generated questions mapped to a specific session.
* **`interview_answers`**: Maps user responses, bookmarks, and skip status to specific questions.
* **`interview_feedback`**: Stores final AI grading (overall score, technical rating, aggregated takeaways, ideal answers).
* **`resume_analyses`**: Stores resume ATS scores, job description pairings, strengths/weaknesses, and the rewritten structured JSON output.

### Storage (Supabase Buckets)
* **`resumes` & `documents`**: Private buckets. Files are validated by MIME type (`application/pdf`, `text/plain`) and size (<10MB). Access requires generating short-lived (1-hour) signed URLs, preventing public exposure of sensitive candidate data.

## 9. Technology Stack

* **Frontend Framework:** React 19, react-router-dom
* **Build Tool:** Vite
* **Styling:** Tailwind CSS v4 (Oxide engine)
* **Backend / Auth / DB / Storage:** Supabase (Postgres, Edge Functions, Auth, Storage)
* **Type Safety / Validation:** TypeScript, Zod
* **PDF Generation:** HTML2Canvas (DOM rendering), jsPDF (PDF scaffolding), PDF.js (text extraction from PDFs)
* **Animations:** Canvas-confetti (UI delight) 
* **Error Tracking:** Sentry (configured via `@sentry/react`)

## 10. Error Handling & Edge Cases

* **Rate Limiting:** `withRetry` in `gemini.ts` catches HTTP 429 quota errors and implements exponential backoff automatically up to 3 times.
* **Malformed AI Outputs:** Multi-tier regex and Zod parsing ensures the UI doesn't crash if the AI hallucinates bad JSON formatting. Fallback dummy objects are returned if all parsing fails.
* **Microphone Permissions/Failure:** The SpeechService alerts the user if microphone access is denied or if the browser lacks support (e.g., Firefox doesn't natively support Web Speech STT). Auto-reconnect logic handles intermittent network drops during dictation.
* **PDF Rendering Constraints:** HTML2Canvas crashes on modern CSS functions like `oklch`. The code actively scans and replaces `oklch` tags in the cloned DOM before capturing the canvas payload to ensure PDF generation doesn't silently fail.

## 11. Performance & Scalability Observations

* **Inefficiencies:** HTML2Canvas for PDF generation is notoriously heavy on the main thread and can cause UI locks on complex resume templates or lower-end devices.
* **Lazy Loading:** `React.lazy` and `Suspense` are actively used for main route components (`Login`, `Signup`, `Dashboard`) minimizing the initial bundle size. 
* **State Management:** Complex objects (like the 50k character limit resume string) reside in localized component state rather than a global context, reducing unnecessary re-renders application-wide.

## 12. Security Observations

* **Auth Mechanisms:** JWT-based authentication heavily relying on Supabase. Edge Functions leverage these tokens implicitly to restrict API usage to authenticated actors only.
* **Prompt Injection Protection:** Inputs are strictly truncated (`MAX_RESUME_CHARS = 50,000`) and regex-stripped of HTML/XML-like syntax (`<[^>]*>`) to prevent users from overriding system prompts by injecting custom `<RESUME>` closing tags.
* **Data Privacy:** Uses secure, time-boxed Signed URLs for storage rather than public URL buckets.

## 13. Known Issues / Gaps

* **Browser Dependency for STT:** Web Speech API is essentially locked to Chrome and Edge. Safari and Firefox users have degraded experiences or outright failures.
* **Incomplete Features:** "Custom Mode" in Interview Coach is visible in the UI but explicitly disabled (`enabled: false`).
* **AI Hallucinations:** Despite strict schemas, LLMs occasionally invent details when rewriting resumes if the user's original data is too sparse.
* **No PDF Parsing on Edge:** PDF.js runs client-side to extract text. A corrupted PDF can cause a high-CPU client loop.

## 14. Improvement Opportunities

* **Code/Architecture:** Move PDF generation to a cloud service (e.g., a headless browser on AWS Lambda/Supabase Edge) instead of `html2canvas`. This improves fidelity, selects text perfectly (not an image-based PDF), and solves mobile memory crashing issues.
* **Feature Enhancements:** Replace native Web Speech API with a dedicated websocket STT service (e.g., Deepgram or AssemblyAI) for higher accuracy, cross-browser compatibility, and to eliminate the arbitrary network drops native APIs suffer from.
* **UI/UX:** Add a "Retry Question" button during the live mock interview so users do not have to restart the entire session if they stumble. Add an intermediate "Edit" state before rendering the final PDF so users can manually correct AI rewrite mistakes directly in the JSON data structure.
