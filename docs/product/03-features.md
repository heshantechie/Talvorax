# Features

This document describes every user-facing feature currently present in Talvorax.

---

## 1. Resume Analyzer

**Purpose**
Evaluate how well a candidate's resume matches a target role and the automated screening systems (ATS) used by employers.

**User Benefit**
Candidates learn, before applying, whether their resume will pass filters — and exactly what to fix if it will not.

**How users interact with it**
- Upload a resume as a PDF, Word document, or plain text file.
- Choose a professional domain from a list (Software Engineering, Data Science, AI/ML, Cybersecurity, Cloud Computing, DevOps, UI/UX, Product Management, Business Analysis, Marketing, Digital Marketing, Sales, Finance, HR) or pick "Auto Select" to let the system detect the domain from the resume itself.
- Describe the desired role or paste key requirements (limited to fifty words, with a live word counter).
- Click "Analyze My Resume."

**Expected outcome**
A full analysis report containing:

- A **Job Match Score** from 0 to 100, shown on a visual gauge, with an ATS compatibility rating (for example, High).
- A **detailed score breakdown** across five dimensions — semantic skill match, experience relevance, impact and achievements, project or work depth, and ATS optimization — each with points, a reason, and supporting evidence quoted from the resume. A keyword-stuffing penalty is shown when detected.
- **Missing critical skills**, including a clearly flagged "gatekeeper" penalty when a hard requirement of the role is absent.
- **Actionable improvements** — concrete edits the candidate can make.
- **Strengths and general weaknesses** of the resume.
- **Suggested job roles** that fit the candidate's profile.

## 2. Role-Based Skill Suggestions

**Purpose**
Help candidates enrich their resume with the skills a chosen role actually requires.

**User Benefit**
Removes guesswork about which keywords and competencies to add.

**How users interact with it**
After analysis, the user clicks one of the suggested job roles. The system produces a list of skills required for that role. The user clicks skills to add them to an optimization list, removes any they do not want, and can also type skills in manually.

**Expected outcome**
A curated skill list that is applied during resume optimization.

## 3. AI Resume Optimization and Templates

**Purpose**
Rewrite the resume so it is better aligned with the target role, then present it in a professional layout.

**User Benefit**
A stronger, recruiter-ready resume without hours of manual editing or formatting.

**How users interact with it**
- Choose one of three templates: **Classic** (traditional, formal, suited to corporate and enterprise roles), **Modern** (clean design with color accents, suited to technology roles), or **Minimal** (simple and spacious, suited to startups). Each template can be previewed at full page size before or after optimization.
- Click "Auto-Optimize My Resume." The system rewrites the content, incorporating any selected skills.
- Preview the finished resume and download it as a PDF.

**Expected outcome**
A downloadable, professionally formatted PDF resume with optimized content, structured into summary, education, experience, projects and extracurriculars, leadership, and categorized skills sections.

## 4. Interview Coach — Mock Interviews

**Purpose**
Simulate a real interview: spoken questions, spoken answers, a running timer, and a camera.

**User Benefit**
Candidates rehearse under realistic pressure and receive a detailed evaluation, instead of walking into their first real interview cold.

**How users interact with it**
The user chooses one of five available interview modes (a sixth, Custom Mode, is shown as coming soon):

- **Domain Based** — pick from eighteen domains (such as Frontend Development, Data Science, DevOps, Cybersecurity, System Design, UI/UX Design) and optionally a specific topic within the domain.
- **Job Description Based** — paste a job description; questions are tailored to that role.
- **Resume Based** — upload a resume (PDF); questions target the candidate's own skills and projects.
- **Company Specific** — select from a list of well-known multinational companies and startups (or enter another company) to practice commonly asked questions.
- **Previous Interview Experience** — enter a past company and role, choose technical topics (such as Data Structures, Algorithms, System Design) and behavioral topics (such as Leadership, Teamwork, Conflict Resolution), and optionally supply questions and answers from a past interview to revisit and improve on.

Common setup for every mode: the candidate's name, experience level (fresher or experienced, with years of experience), and interview length — either by duration (5 or 10 minutes) or by number of questions (1 to 10). Each question carries its own time allowance based on complexity, up to sixty seconds.

During the live session:

- Questions are read aloud to the candidate, who answers by speaking; the answer is transcribed live on screen.
- The camera is on and the session is video recorded.
- The system monitors the camera and shows alerts if the candidate's face is not visible or if more than one person appears on screen.
- A warning is displayed if non-English speech is detected.
- The candidate can bookmark a question for later review or skip it; when time runs out, the session advances automatically. Unanswered questions are marked as skipped.

**Expected outcome**
See "Interview Results and Analysis" below.

## 5. Interview Results and Analysis

**Purpose**
Turn each mock interview into a personalized study plan.

**User Benefit**
Candidates see exactly which answers were weak, what a strong answer looks like, and which topics need reinforcement.

**How users interact with it**
After the closing message, a celebration screen shows the overall score with an encouraging summary. From there the candidate opens the full analysis report, which includes:

- Session details: date, total duration, and number of questions.
- A question list, filterable to bookmarked questions only, each labeled Good, Improve, or Needs Work based on its score.
- **Answer comparison** for every question: the candidate's transcribed answer side by side with an ideal answer.
- A **knowledge gaps map**: questions grouped by topic with an average score per topic and related subtopic tags, highlighting the areas that need the most work.
- The option to download the full video recording of the session.
- One-click restart to take another interview.

**Expected outcome**
A clear picture of performance and a prioritized list of topics to study before the next attempt.

## 6. Minute Talk — Speaking Practice

**Purpose**
Build spoken fluency and confidence through rapid, timed practice on surprise topics.

**User Benefit**
Objective, measurable feedback on delivery — something candidates almost never receive elsewhere.

**How users interact with it**
- The system generates a random speaking topic across eight categories (Technology, Career, Economy, Society, Personal Development, Education, Current Trends, Abstract) with a difficulty level from Easy to Extreme. The user may skip to a new topic.
- The user taps the microphone button and speaks for up to sixty seconds while a countdown runs and their words appear on screen in real time.
- They stop early or let the timer finish, then receive an automatic analysis.

**Expected outcome**
A performance report with:

- An overall score out of 100.
- Sub-scores out of 10 for content quality, structure, fluency, and confidence.
- Speaking speed in words per minute, labeled Too Slow, Ideal Pace, or Too Fast.
- Total filler words used and the most frequent filler word.
- A list of actionable tips.

Progress counters show the user's best score, last score, and total sessions completed.

## 7. Job Alerts

**Purpose**
Keep relevant job openings flowing to the candidate automatically.

**User Benefit**
No more manually re-running the same searches every day.

**How users interact with it**
- Create an alert with a role title, optional location, a remote-only toggle, a list of skills, and a frequency (instant, daily, or weekly).
- Pause, resume, edit, or delete alerts at any time; a summary panel shows total, active, and paused alerts.
- Job listings are synchronized automatically every six hours; a "Force Sync Jobs" button fetches the latest listings on demand.

**Expected outcome**
A managed set of alerts that continuously match new openings to the candidate's criteria.

## 8. AI Resume Match — Job Recommendations

**Purpose**
Rank live job openings by how well they fit the candidate's actual resume, with honest reasoning.

**User Benefit**
Candidates focus their applications where they have a real chance, and learn how to improve their odds for each specific job.

**How users interact with it**
- Upload a resume as a PDF (up to 10 MB) by clicking or drag-and-drop. The system parses it into a profile: name, contact, skills, target roles, seniority level, and years of experience, with a profile completeness percentage.
- Browse recommendation cards, each showing the job title, company, location, and source, plus:
  - A **match score** out of 100 on a visual ring.
  - A **shortlist verdict**: Strong, Likely, Possible, or Unlikely.
  - **Matched skills** and **missing skills** for that specific job.
  - A written explanation of the verdict.
  - Expandable **resume tweak tips** tailored to that job.
- Act on each card: open the original posting to apply, save it for later, or dismiss it.
- Filter recommendations by verdict and sort by match score or recency.
- Review the **Market Gap Analysis** panel, which aggregates the skills most frequently missing across all matched jobs.
- Delete the resume profile and all recommendations at any time.

**Expected outcome**
A ranked, continuously updated shortlist of realistic opportunities, each with a concrete plan to strengthen the application.

## 9. Personal Dashboard

**Purpose**
Give each user a home base that reflects their progress.

**User Benefit**
Immediate orientation: new users are guided to a first action; returning users see their trajectory.

**How users interact with it**
Described fully in the dashboard document. In brief: new users see two calls to action (analyze a resume or start a mock interview); returning users see their last interview score, averaged skill ratings, focus topics, and key takeaways drawn from all their sessions.

**Expected outcome**
Users always know their current standing and their next step.

## 10. Accounts and Profile Management

**Purpose**
Secure, personalized access with user-controlled account settings.

**User Benefit**
Progress, history, and preferences are preserved across sessions and devices.

**How users interact with it**
- **Sign up** with full name, email, and password. Passwords must be at least eight characters and include an uppercase letter, a lowercase letter, a number, and a special character. Users must accept the Terms of Service and Privacy Policy, both of which can be read in-app before agreeing. A confirmation email verifies the account.
- **Log in** with email and password. Repeated failed attempts trigger a temporary lockout for security.
- **Edit profile**: change the display name, manage a profile picture, change the email address (verification links are sent to both the old and new address), and change the password (the current password must be re-entered first).
- **Personalize** the interface with four themes: Light, Dark, Glassy, and Neon.
- Sign out from the profile menu.

**Expected outcome**
A protected personal account with full control over identity and appearance settings.

## 11. Public Website and Informational Pages

**Purpose**
Explain the product to visitors before they sign up.

**How users interact with it**
Visitors can browse:

- A **home page** describing the three core preparation tools with testimonials and a frequently-asked-questions section.
- Dedicated pages for the **Resume Analyzer**, **Interview Coach**, **Minute Talk**, and **Job Alerts**.
- An **Upskill** hub listing all practice modules in one place.
- A **Pricing** page with two plans: a Free plan (basic resume analysis at three per month, standard Minute Talk practice, standard job alerts, and limited interview coaching) and a Pro plan at $19 per month (unlimited resume analysis and tracking, advanced interview coaching for all roles, Auto Apply integration, and priority support).
- An **About** page with the company's mission, vision, and team description.
- A **Contact** page with a message form, a support email address, and chat support hours.

**Expected outcome**
Visitors understand the product and can move directly to sign-up.

## 12. Announced Capabilities (Presented, Not Yet Active in the Dashboard)

The following are presented on the public site as part of the product's direction. They currently exist as informational pages that invite users to sign up:

- **Auto Apply** — described as matching the user's profile to top jobs and applying on their behalf, with smart matching, one-time preference setup, and application tracking. Auto Apply integration is listed as a Pro plan benefit.
- **Communication Skills** — described as feedback on tone, pacing, filler words, and clarity. Today, filler-word and pacing feedback is delivered through Minute Talk.
- **Custom Interview Mode** — shown in the Interview Coach as "Coming Soon"; it will combine resume, job description, and other inputs into one fully customized mock interview.
