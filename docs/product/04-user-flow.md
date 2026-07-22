# User Flows

This document traces the complete journeys a user takes through Talvorax, from first visit to results.

---

## Flow 1: Visitor to Active User

```
Visitor lands on home page
        |
        v
Explores feature pages (Resume Analyzer, Interview Coach,
Minute Talk, Job Alerts, Upskill, Pricing, About, Contact)
        |
        v
Clicks "Start Your Free Prep" or "Get Started"
        |
        v
Sign Up: name, email, password (strong password required),
reads and accepts Terms of Service and Privacy Policy
        |
        v
Receives confirmation email and verifies the account
        |
        v
Logs in (redirected to the Dashboard)
        |
        v
Dashboard greets the new user: "Let's Skill Up!"
with two starting points — Analyze My Resume
or Start Mock Interview
```

Notes:
- Users who are already signed in are taken straight to the dashboard when they open the login or sign-up pages.
- All dashboard tools require an account; visitors who try to open the dashboard are redirected to log in.

---

## Flow 2: Resume Analysis and Optimization

```
Dashboard
   |
   v
Open Resume Analyzer
   |
   v
Upload resume (PDF, Word, or text) — content is extracted automatically
   |
   v
Select a domain (or "Auto Select" for automatic detection)
   |
   v
Enter desired-role keywords (up to 50 words)
   |
   v
Click "Analyze My Resume"
   |
   v
Review results:
  - Job Match Score gauge and ATS compatibility
  - Detailed score breakdown with evidence
  - Missing critical skills and improvements
  - Strengths and weaknesses
  - Suggested job roles
   |
   v
(Optional) Click a suggested role -> review required skills ->
add skills to the optimization list (click or type manually)
   |
   v
Choose a template: Classic, Modern, or Minimal (preview available)
   |
   v
Click "Auto-Optimize My Resume"
   |
   v
Preview the rewritten resume in the chosen template
   |
   v
Download the finished resume as a PDF
```

Result: a scored diagnosis of the current resume and a polished, role-optimized PDF ready to send. Analyses are saved to the user's account.

---

## Flow 3: Mock Interview

```
Dashboard
   |
   v
Open Interview Coach
   |
   v
Choose an interview mode:
  Domain Based / Job Description Based / Resume Based /
  Company Specific / Previous Interview Experience
   |
   v
Complete setup:
  - Name
  - Experience level (fresher or experienced + years)
  - Length: duration (5 or 10 min) or 1-10 questions
  - Mode-specific input (domain and topic, pasted job
    description, uploaded resume, company, or past
    interview details)
   |
   v
Questions are generated ("Preparing Your Interview...")
   |
   v
Live session begins:
  - Camera turns on; the session is recorded
  - Each question is read aloud
  - The candidate answers by voice; words appear live on screen
  - A per-question timer counts down (up to 60 seconds)
  - Candidate may bookmark or skip; timeouts advance automatically
  - On-screen alerts if the face is not visible, if more than
    one person appears, or if non-English speech is detected
   |
   v
Closing message and celebration screen with overall score
   |
   v
"View My Results" -> full analysis report:
  - Per-question scores (Good / Improve / Needs Work)
  - Candidate's answer vs. ideal answer, side by side
  - Knowledge gaps grouped by topic
  - Bookmarked-questions filter
  - Video recording download
   |
   v
Retake ("Test My Skills Again") or return to Dashboard
```

Result: a scored, reviewable interview with a personalized list of topics to strengthen. Sessions and feedback are saved to the user's account and feed the dashboard summary.

---

## Flow 4: Minute Talk Speaking Practice

```
Dashboard
   |
   v
Open Minute Talk
   |
   v
A random topic appears with its category and difficulty
(skip for a new topic at any time)
   |
   v
Tap the microphone to start
   |
   v
Speak for up to 60 seconds; a countdown runs and the
transcript streams live on screen
   |
   v
Stop early or let the timer finish
   |
   v
Performance Report:
  - Overall score out of 100
  - Content, structure, fluency, confidence (each out of 10)
  - Words per minute with pace label
  - Filler-word count and top filler
  - Actionable tips
   |
   v
Best score / last score / total sessions update
   |
   v
New topic -> practice again
```

Result: measurable speaking feedback and a running personal record that encourages repeat practice.

---

## Flow 5: Job Alerts and AI Job Matching

```
Open Job Alerts page (sign-in required)
   |
   v
Tab 1 — Job Alerts:
  Create an alert (role title, location, remote-only,
  skills, frequency: instant / daily / weekly)
   |
   v
Alerts can be paused, edited, or deleted;
jobs synchronize automatically every 6 hours
   |
   v
Tab 2 — AI Resume Match:
  Upload resume PDF (click or drag-and-drop)
   |
   v
Profile is parsed: name, skills, target roles, seniority,
experience, and a completeness percentage
   |
   v
AI scores the user against live job listings
("Force Sync Jobs" fetches the latest on demand)
   |
   v
Browse recommendation cards:
  - Match score and shortlist verdict
  - Matched and missing skills
  - Written reasoning
  - Resume tweak tips per job
   |
   v
Filter by verdict; sort by match score or recency
   |
   v
Per job: Apply Now (opens the original posting),
Save for later, or Dismiss
```

Result: a continuously refreshed, ranked pipeline of realistic job opportunities with a per-job improvement plan.

---

## Flow 6: Returning User

```
Log in
   |
   v
Dashboard shows "Recent Interview Performance":
  - Last interview score with rating
    (Great / Moderate / Needs Work)
  - Areas to Improve: communication, technical accuracy,
    problem solving — averaged across all sessions
  - Focus topics gathered from every interview
  - Interview Analysis Summary with key takeaways
  - Average score across all attempts
   |
   v
"Take another interview" or continue to any tool
```

Result: progress is visible at a glance, and the next practice session is one click away.

---

## Flow 7: Account Management

```
Profile menu (top navigation)
   |
   +-- Choose a theme: Light, Dark, Glassy, or Neon
   |
   +-- Edit Profile:
   |     - Update display name
   |     - Manage profile picture
   |     - Change email (verification sent to both
   |       old and new addresses)
   |     - Change password (current password required)
   |
   +-- Sign Out
```
