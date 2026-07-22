# The Dashboard

The dashboard is the signed-in home of Talvorax. It adapts to the user: brand-new candidates get a guided starting point, while returning candidates see a performance summary built from their interview history.

---

## Navigation

A single navigation bar is shared across the site and the dashboard:

- **Logo** — returns to the home page.
- **Upskill** — a menu of all practice modules: Resume Analyzer, Interview Coach, Minute Talk, Auto Apply, and Communication Skills, each with a one-line description.
- **Job Alerts** — the job alerts and AI matching area.
- **Pricing, About, Contact** — informational pages.
- **Dashboard** — returns to the dashboard home from anywhere.
- **Profile menu** — shows the user's name, email, and profile picture (or their initial), and contains:
  - Theme selection: Light, Dark, Glassy, and Neon.
  - Edit Profile.
  - Sign Out.

Within the dashboard, users move between the dashboard home, Resume Analyzer, Interview Coach, Minute Talk, and Edit Profile.

---

## Dashboard Home — New User

When a user has not yet completed an interview, the dashboard shows:

- A personal welcome confirming the signed-in email address.
- A "Let's Skill Up!" section explaining the two recommended starting points.
- Two prominent actions:
  - **Analyze My Resume** — opens the Resume Analyzer.
  - **Start Mock Interview** — opens the Interview Coach.

---

## Dashboard Home — Returning User

Once at least one interview has been completed, the dashboard replaces the starter view with **Recent Interview Performance**, made up of three cards:

### Card 1: Last Interview Score

- A circular gauge showing the most recent interview's overall score as a percentage.
- A color-coded performance label: Great (70 and above), Moderate (50-69), or Needs Work (below 50).
- The date of that interview.

### Card 2: Areas to Improve

- Three skill bars — Communication, Technical Accuracy, and Problem Solving — each averaged across every interview the user has taken and scored out of 10, ordered weakest first.
- A note showing how many interviews the averages are based on.
- **Focus Topics**: tags collected from across all sessions indicating the subjects the user should study.

### Card 3: Interview Analysis Summary

- Key takeaways drawn from the user's interview feedback, presented as short highlighted insights.
- The average score across all attempts.
- A "Take another interview" shortcut leading straight back to the Interview Coach.

---

## Sections Reachable From the Dashboard

### Resume Analyzer

A two-panel workspace — resume upload with domain selection on one side, desired-role keywords on the other — followed by the full analysis results, skill suggestions, template gallery, optimization action, resume preview, and PDF download. Before the first analysis, the results area shows an "ATS Performance Scan" placeholder explaining what to do.

### Interview Coach

A gallery of six interview-mode cards (five active, Custom Mode marked "Coming Soon"), followed by the mode-specific setup form, the live interview room, and the results screens.

### Minute Talk

A practice studio with:

- Three stat cards across the top: Best Score, Last Score, and Total Sessions.
- A topic card showing the current topic, its category, and a color-coded difficulty, with a Skip option.
- A large countdown timer and a single microphone button to start and stop.
- A live transcription panel that streams the user's words as they speak.
- A performance report card that appears after each session with all scores, speech metrics, and tips.

### Edit Profile

Account settings organized into sections:

- **Profile** — display name and profile picture management.
- **Email** — change the account email, with verification sent to both the old and the new address.
- **Password** — change the password after confirming the current one.

---

## Overall User Experience

- A clean, light interface with a green accent color and soft decorative backgrounds.
- Immediate feedback everywhere: loading indicators while content is prepared, live word and time counters, color-coded scores (green for strong, amber for moderate, red for weak).
- Progress framing: gauges, bars, streak-style counters, and a celebratory results screen after interviews.
- All destructive actions (deleting alerts, deleting the resume profile) require an explicit user action, and resume-profile deletion asks for confirmation first.
