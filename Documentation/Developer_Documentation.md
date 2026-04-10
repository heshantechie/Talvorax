# Developer Documentation: HireReadyAI

This document provides a comprehensive guide for developers to understand, run, and contribute to the Talvorax project. It covers everything from project setup to deployment instructions, explicitly tailored to get new engineers onboarded within an hour.

---

## 1. Project Overview

Talvorax is a web-based artificial intelligence platform designed to help candidates prepare for job interviews and optimize their resumes. It bridges the gap between candidates and their target job roles by:
- Simulating real-world interviews using voice and text.
- Evaluating candidate responses mathematically against "ideal answers".
- Analyzing resumes for ATS compatibility.
- Auto-rewriting resumes to better align with target Job Descriptions utilizing aesthetic templates rendering directly to high-resolution PDFs.

Its unique strength lies in utilizing private edge functions to securely proxy LLM requests (Groq/Gemini), mitigating prompt injection, and employing multi-tier parsing fallbacks to guarantee strict UI-friendly structured responses.

---

## 2. Prerequisites

Before setting up the project locally, ensure your system has the following tools installed and accounts configured:

1. **Node.js**: v18.0.0 or higher.
2. **Package Manager**: `npm` is configured (or `pnpm`/`yarn` equivalent).
3. **Supabase CLI**: Required for local database operations and deploying Edge Functions.
4. **Accounts**:
   - Supabase (for Auth, Database, Storage, and Edge Functions).
   - Groq or Google Gemini API Key (depending on the configured LLM backbone).
   - Sentry Account (for error tracking).

---

## 3. Installation & Setup

Follow these specific steps to run the application locally without introducing configuration drift:

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd HirereadyAI
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure the Environment**
   Duplicate `.env.development` or `.env` and configure your frontend keys:
   ```bash
   # Add your specific VITE_ prefixes pointing to your local/dev Supabase instance.
   VITE_SUPABASE_URL=YOUR_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   VITE_SENTRY_DSN=YOUR_SENTRY_DSN
   ```

4. **Set Up Server-side Secrets (Edge Functions)**
   *DO NOT* put backend keys in your `.env`. They are dynamically loaded into edge functions.
   ```bash
   # Make sure you are authenticated with the Supabase CLI: supabase login
   # Link your project: supabase link --project-ref your_project_ref
   supabase secrets set GROQ_API_KEY=your_groq_api_key
   supabase secrets set STT_API_KEY=your_stt_api_key
   ```

5. **Start the Development Server**
   ```bash
   npm run dev
   ```
   The application will be running at `http://localhost:3000`.

---

## 4. Project Structure

This application follows a domain and feature-driven folder structure for maintainability:

- `/src/pages/`: Contains the top-level route views (`Dashboard.tsx`, `Login.tsx`, `Signup.tsx`). These are lazy-loaded via `React.lazy` and `Suspense` for performance.
- `/src/components/`: The core feature UI components.
  - `InterviewCoach.tsx`: Entry point and state manager for the mock interview flows.
  - `InterviewSession.tsx`: The active live-interview interface handling audio recording and timing.
  - `InterviewSetup.tsx`: The configuration forms for the various interview modes.
  - `ResumeAnalyzer.tsx`: The end-to-end resume evaluation, iterative rewriting engine, and PDF rendering component.
- `/src/services/`: External integrations and complex local APIs.
  - `gemini.ts`: The central AI communication service handling prompts, JSON parsing, retries, and proxy invocation.
  - `speechService.ts`: A wrapper abstracting the browser's native Web Speech API (STT) and SpeechSynthesis API (TTS).
- `/src/lib/`: Infrastructure wrappers and clients.
  - `db.ts`: Supabase database operations (SQL inserts/updates) abstracting query semantics for session persistence.
  - `storage.ts`: Supabase storage operations (managing private buckets and short-lived signed URLs).
  - `supabase.ts`: Supabase client initialization.
- `/src/contexts/`: React contexts for shared state (e.g., `AuthContext.tsx` for global user authentication).

---

## 5. Core Modules Explanation

### AI Interaction Layer (`services/gemini.ts`)
This is the central bridge coordinating React interactions to our backend LLMs safely. It sanitizes XML-like tags (`<[^>]*>`) from user inputs to prevent prompt injection and enforces hard character limits. Crucially, it dictates strict prompts and forces the UI to validate returning output structures via Zod (e.g., `InterviewFeedbackSchema`). It intrinsically handles 429 quota errors via an automatic 3x exponential backoff retry.

### Speech Engine (`services/speechService.ts`)
Manages live audio transcription. Instantiates `webkitSpeechRecognition`, continuously aggregating interim and final transcripts for fluid UI feedback. It holds core logic differentiating English interactions and auto-recovers gracefully if a native browser network error halts the microphone pipeline mid-session.

### Robust JSON Parsing (`components/ResumeAnalyzer.tsx`)
LLMs often hallucinate formatting when generating high-complexity deeply nested JSON responses. A dedicated parsing utility acts as a 4-tier fallback shield protecting the application from crashing:
1. Direct `JSON.parse`.
2. Stripping injected Markdown block wrappers (` ```json ... ``` `).
3. Regex extraction dynamically locating the outermost `{}` braces.
4. Auto-escaping mid-string newline characters (`\n`) which classically break `JSON.parse`.

---

## 6. API Documentation

Most of the heavy lifting avoids local API calls by invoking a Supabase Edge Function directly via `supabase.functions.invoke()`.

**Edge Function Interface (`ai-proxy`)**
- **Purpose:** Securely execute generative queries without revealing `GROQ_API_KEY` to the client. Contains logic to authenticate via JWT implicitly passed in the auth header.
- **Request Format (JSON):**
  ```json
  {
    "messages": [
      { "role": "system", "content": "You are an expert HR interviewer..." },
      { "role": "user", "content": "Here is my answer..." }
    ],
    "response_format": { "type": "json_object" } 
  }
  ```
- **Response Format:** A raw JSON string serialized exactly matching the prompt's required structure, ready for local Zod enforcement.

---

## 7. Data Flow

Understanding how states persist will vastly speed up feature development. Here is the Step-by-step pipeline for an action like analyzing an interview response:

1. **Client Action:** The user stops answering the microphone; an end state is triggered.
2. **Sanitization:** Voice transcripts are cleaned of malformed injections and forcibly truncated.
3. **Execution:** The UI invokes `services/gemini.ts`, which sends a payload securely to the `ai-proxy` Edge Function.
4. **LLM Processing:** The edge proxy verifies the frontend's valid session JWT, injects the secret server keys, and relays the request to Groq/Gemini.
5. **Validation:** The payload returns to the frontend where the client strips rogue Markdown wrappers and strictly validates types via Zod schemas.
6. **Persistence:** The parsed telemetry is persisted to Supabase Postgres via asynchronously dispatched queries in `src/lib/db.ts` to log attempt history.
7. **UI Update:** The React application updates local component state, unmounting loaders and displaying the comparative feedback maps.

---

## 8. Configuration & Environment Variables

The application enforces a strict separation between UI secrets and Server secrets. 

**Exposed Client Configuration (`.env.development` / `.env.production`)**
These dictate routing to the correct backend infrastructure instance.
- `VITE_SUPABASE_URL`: The URL to your Supabase project instance.
- `VITE_SUPABASE_ANON_KEY`: The public anonymous JWT.
- `VITE_SENTRY_DSN`: Required for triggering telemetry in production (`@sentry/react`).

**Secured Server Configuration (Supabase Secrets Vault)**
Never place these in a standard source-controlled file.
- `GROQ_API_KEY`: API key for LLM queries.
- `STT_API_KEY`: Fallback Key for future external Speech-to-Text replacements.

---

## 9. Known Issues & Limitations

- **Browser Dependency for STT:** Currently relies completely on the Web Speech API which limits full support natively to Google Chrome and Microsoft Edge. Firefox and Safari experience sporadic dictation failures.
- **HTML2Canvas Bottleneck:** PDF rendering for resumes forces DOM snapshotting using `html2canvas` and `jsPDF`. This locks up main-thread UI components and suffers from color-rendering bugs (e.g., crashing on modern CSS `oklch`).
- **Edge PDF Text Extraction:** Because we execute `pdfjs-dist` on the client to scrape resume texts, manipulating massive or specifically corrupted PDFs can spark CPU throttling client-side instead of a safe server crash.
- **Feature Flags:** The Interview Coach 'Custom Mode' features the UI interface but is explicitly feature-flagged false (`enabled: false`) in the source.
- **AI Hallucinations:** When candidate context is excessively sparse, the Resume Rewrite functionality has a tendency to aggressively "invent" non-factual responsibilities despite prompt instructions avoiding it.

---

## 10. Coding Conventions

Please abide by these principles when issuing Pull Requests:
- **TypeScript First:** Strict type definitions are completely enforced; `any` should be avoided completely unless wrapping a legacy third-party library without an `@types` package.
- **Component Design:** React 19 functional components utilizing extensive local state hooks to minimize unneeded global context re-renders (specifically crucial for large DOM strings like resumes).
- **Styling Standards:** Tailwind CSS v4 (`@tailwindcss/vite`) via Oxide engine. No raw `.css` files unless altering base layer imports (`index.css`). Design aesthetic favors modern UI patterns (glassmorphism, soft gradients) without relying on inline components (`style={{}}`).
- **Validation:** Use `zod` for parsing and inferring complex unstructured external data. Avoid blind casting output as `Type`.

---

## 11. Deployment Guide

To push local code to a production environment (such as Vercel/Netlify):

1. **Build the Application**
   Run the vite build pipeline:
   ```bash
   npm run build
   ```
   *Note: Ensures `TAILWIND_DISABLE_OXIDE` is passed properly if dealing with distinct CI runner bottlenecks.*

2. **UI Environment Variables**
   Ensure your deployment platform has `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SENTRY_DSN` configured within its web portal settings referencing your production Supabase stack.

3. **Deploy the Edge Function**
   Whenever making a structural iteration to `ai-proxy`:
   ```bash
   supabase functions deploy ai-proxy --project-ref your_production_ref
   ```

---

## 12. Contribution Guidelines

When creating features or fixing bugs, adhere strictly to these principles:
- **Branching:** Branch off from `main`. Use semantics: `feature/[new-capacity]`, `fix/[issue]`, or `refactor/[module]`.
- **Commits:** Follow conventional commits (e.g. `feat: updated AI proxy prompt` , `fix: typo in resume parser fallback`).
- **Dependencies:** Try to reuse native hooks and the existing Tailwind ecosystem before importing massive specific libraries. Keep bundle sizes minimal.
- **Pull Requests:** Provide a concise explanation of *Why* the code changed. Attach a before/after screenshot if altering PDF generator templates to ensure aesthetics haven't degraded.
- **Review:** All code requires a test-check against PDF generation fidelity since the core functionality inherently depends on the precise HTML structure for formatting its final output.
