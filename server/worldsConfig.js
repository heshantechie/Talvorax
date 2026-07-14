// ─── Worlds and Missions Configuration ────────────────────────────────────────
// Scalable registry of all 4 worlds and their respective missions.
// New missions can be added here without editing code or prompt logic.
// ─────────────────────────────────────────────────────────────────────────────

export const WORLDS_CONFIG = {
  campus: {
    title: "Campus World",
    emoji: "🎓",
    description: "Academic life, student discussions, and oral examinations",
    missions: {
      campus_introduce_yourself: {
        title: "Introduce Yourself",
        difficulty: "easy",
        duration: "5 min",
        xp: 80,
        objective: "Help the user practice introducing themselves to a professor and establishing a positive first impression.",
        communicationGoal: "Introduce name, program, background, and academic interests clearly and politely.",
        character: {
          name: "Prof. Emma",
          role: "University Computer Science Professor",
          tone: "Warm, encouraging, professional, and intellectually curious."
        },
        skills: ["Self-introduction", "Politeness", "First impressions"],
        successCriteria: [
          "Shared full name and program",
          "Explained background/hometown",
          "Stated why they chose this program or class"
        ]
      },
      campus_ask_doubt: {
        title: "Ask a Doubt in Class",
        difficulty: "easy",
        duration: "5 min",
        xp: 80,
        objective: "Teach the user to explain a technical confusion and ask for clarification after class.",
        communicationGoal: "Frame a clear, concise question about a complex lecture topic (e.g. Data Structures).",
        character: {
          name: "Prof. Emma",
          role: "Busy but helpful Professor",
          tone: "Slightly rushed but academic, analytical, and supportive."
        },
        skills: ["Question framing", "Technical clarity", "Assertiveness"],
        successCriteria: [
          "Greeted the professor politely",
          "Explained the exact concept they are struggling with",
          "Understood the analogy or explanation given by the professor"
        ]
      },
      campus_assignment_extension: {
        title: "Request Assignment Extension",
        difficulty: "medium",
        duration: "8 min",
        xp: 120,
        objective: "Practice negotiating deadline extensions professionally when facing personal or academic emergencies.",
        communicationGoal: "Negotiate a 2-day extension by presenting a genuine, logical reason without sounding demanding.",
        character: {
          name: "Prof. Emma",
          role: "Strict but fair Professor",
          tone: "Firm, values deadlines, evaluates reasoning logically, and requires professional behavior."
        },
        skills: ["Negotiation", "Professional tone", "Logical reasoning"],
        successCriteria: [
          "Explained the emergency/situation clearly",
          "Proposed a realistic new submission date",
          "Maintained high respect and politeness under pushback"
        ]
      },
      campus_project_discussion: {
        title: "Discuss Project with Professor",
        difficulty: "medium",
        duration: "10 min",
        xp: 130,
        objective: "Help the user present a project proposal, gather feedback, and defend their choices.",
        communicationGoal: "Explain the project abstract, tech stack, and scope logically to a faculty advisor.",
        character: {
          name: "Prof. Emma",
          role: "Research Advisor",
          tone: "Curious, highly academic, detailed, and challenges weak assumptions."
        },
        skills: ["Technical explanation", "Assumptions defense", "Active listening"],
        successCriteria: [
          "Described project concept and problem solved",
          "Justified tech stack or methodology choice",
          "Addressed potential project timeline risks"
        ]
      },
      campus_group_discussion: {
        title: "Group Discussion",
        difficulty: "medium",
        duration: "10 min",
        xp: 130,
        objective: "Improve argumentative speaking, active listening, and collaboration during a academic discussion.",
        communicationGoal: "State stance, respond to counterarguments, and constructively contribute to a group debate.",
        character: {
          name: "Ryan",
          role: "Discussion Moderator & Classmate",
          tone: "Energetic, argumentative, slightly provocative, and tests the user's opinions."
        },
        skills: ["Argumentation", "Critical thinking", "Respectful debating"],
        successCriteria: [
          "Stated clear stance on teachers vs AI",
          "Responded directly to the moderator's counterargument",
          "Synthesized points into a neat concluding summary"
        ]
      },
      campus_seminar_presentation: {
        title: "Seminar Presentation",
        difficulty: "hard",
        duration: "12 min",
        xp: 160,
        objective: "Train the user to present research slides and answer tough questions from the audience.",
        communicationGoal: "Introduce topic structure, explain technical concepts, and field hostile or difficult questions.",
        character: {
          name: "Prof. Emma",
          role: "Senior Evaluation Committee Member",
          tone: "Formal, critical, values evidence, and expects precise professional language."
        },
        skills: ["Oral presentation", "Q&A handling", "Technical vocabulary"],
        successCriteria: [
          "Presented slide topics in structured order",
          "Addressed real-world implications or applications",
          "Maintained composure when asked a challenging question"
        ]
      },
      campus_research_proposal: {
        title: "Research Proposal Discussion",
        difficulty: "hard",
        duration: "12 min",
        xp: 180,
        objective: "Practice PhD-level proposal defense, literature review defense, and sample size justification.",
        communicationGoal: "Defend research methodology and sample selection criteria to a strict board member.",
        character: {
          name: "Prof. Emma",
          role: "PhD Research Supervisor",
          tone: "Highly formal, rigorous, detail-oriented, and skeptical of poor methodologies."
        },
        skills: ["Academic rigor", "Methodology defense", "Research articulation"],
        successCriteria: [
          "Defined precise research question",
          "Identified the specific research gap in literature",
          "Justified sample sizes or data sources"
        ]
      },
      campus_final_viva: {
        title: "Final Viva Conversation",
        difficulty: "hard",
        duration: "15 min",
        xp: 220,
        objective: "Simulate a thesis defense or major viva voce examination.",
        communicationGoal: "Summarize a large piece of work, address its limitations, and outline future enhancements.",
        character: {
          name: "Prof. Emma",
          role: "Chief Viva Examiner",
          tone: "Stately, formal, uncompromising, but fair and respects deep knowledge."
        },
        skills: ["Composure", "Thesis defense", "Self-reflection"],
        successCriteria: [
          "Summarized thesis in 2-3 sentences",
          "Defended a controversial claim or result",
          "Acknowledged specific project limitations"
        ]
      }
    }
  },

  workplace: {
    title: "Workplace World",
    emoji: "💼",
    description: "Corporate communication, standups, client meetings, and salary negotiations",
    missions: {
      workplace_standup: {
        title: "Team Standup Meeting",
        difficulty: "easy",
        duration: "5 min",
        xp: 80,
        objective: "Practice giving concise status updates and communicating blockers in a standard standup format.",
        communicationGoal: "Summarize yesterday's work, today's plans, and outline any dependencies.",
        character: {
          name: "Ryan",
          role: "Agile Project Manager",
          tone: "Friendly, fast-paced, collaborative, and values efficiency."
        },
        skills: ["Conciseness", "Status reporting", "Blocker articulation"],
        successCriteria: [
          "Structured update: Completed, Doing, Blocked",
          "Stated blocker clearly with its impact",
          "Avoided rambling or going off-topic"
        ]
      },
      workplace_feedback: {
        title: "Ask for Feedback",
        difficulty: "easy",
        duration: "6 min",
        xp: 90,
        objective: "Learn to proactively solicit constructive feedback from a supervisor.",
        communicationGoal: "Ask specific questions about work performance and receive advice gracefully.",
        character: {
          name: "David",
          role: "Engineering Manager",
          tone: "Professional, direct, busy, but supportive."
        },
        skills: ["Proactive feedback", "Listening skills", "Growth mindset"],
        successCriteria: [
          "Asked for specific feedback on a recent task",
          "Accepted criticism politely and took notes",
          "Proposed an actionable item to improve"
        ]
      },
      workplace_performance_review: {
        title: "Performance Review",
        difficulty: "medium",
        duration: "12 min",
        xp: 130,
        objective: "Prepare users for formal mid-year or annual performance evaluations.",
        communicationGoal: "Articulate accomplishments, handle critical feedback, and align on next career steps.",
        character: {
          name: "David",
          role: "Senior Engineering Manager",
          tone: "Analytical, formal, reviews metrics, and expects professional evidence."
        },
        skills: ["Value articulation", "Receptiveness", "Goal alignment"],
        successCriteria: [
          "Summarized top 2 achievements with metrics",
          "Handled a constructive weakness item professionally",
          "Outlined goals for the next quarters"
        ]
      },
      workplace_salary_negotiation: {
        title: "Salary Negotiation",
        difficulty: "hard",
        duration: "12 min",
        xp: 180,
        objective: "Build confidence in negotiating job offer packages or promotions.",
        communicationGoal: "Politely request a 15% increase based on market standards and achievements.",
        character: {
          name: "David",
          role: "Senior Hiring Manager",
          tone: "Firm, budget-conscious, polite, but defends the company's financial bounds."
        },
        skills: ["Salary negotiation", "Market justification", "Professional assertiveness"],
        successCriteria: [
          "Stated target salary cleanly without hesitation",
          "Justified value based on skills and contributions",
          "Remained polite and collaborative under pushback"
        ]
      },
      workplace_client_presentation: {
        title: "Client Presentation",
        difficulty: "hard",
        duration: "15 min",
        xp: 200,
        objective: "Learn to present technical deliverables and handle tricky scope or budget questions.",
        communicationGoal: "Walk a client through a demo, address concerns, and handle requests for extra features.",
        character: {
          name: "Sophia",
          role: "Important Enterprise Client",
          tone: "Skeptical, demanding, pays close attention to value, and is sensitive to delays."
        },
        skills: ["Client communication", "Demo presentation", "Scope negotiation"],
        successCriteria: [
          "Explained current delivery status clearly",
          "Handled feature request by negotiating scope/budget",
          "Restored client confidence in the partnership"
        ]
      }
    }
  },

  social: {
    title: "Social World",
    emoji: "🤝",
    description: "Networking events, small talk, dinner parties, and casual peer discussions",
    missions: {
      social_self_introduction: {
        title: "Self Introduction",
        difficulty: "easy",
        duration: "5 min",
        xp: 80,
        objective: "Practice introducing yourself to a new colleague or contact in a friendly, conversational manner.",
        communicationGoal: "Provide a quick background of who you are, what you do, and ask a warm follow-up question.",
        character: {
          name: "Ryan",
          role: "Senior Developer",
          tone: "Friendly, casual, approachable, and welcomes new members."
        },
        skills: ["First impressions", "Self-branding", "Confidence"],
        successCriteria: [
          "Introduced name and role clearly",
          "Shared brief interesting detail about background",
          "Asked an engaging question back to Ryan"
        ]
      },
      social_small_talk: {
        title: "Small Talk",
        difficulty: "easy",
        duration: "5 min",
        xp: 80,
        objective: "Build casual relationships via spontaneous small talk in social contexts.",
        communicationGoal: "Discuss weather, transit, or event atmosphere, keeping the interaction balanced.",
        character: {
          name: "Sophia",
          role: "Product Designer",
          tone: "Talkative, cheerful, observant, and friendly."
        },
        skills: ["Small talk", "Active listening", "Rapport building"],
        successCriteria: [
          "Responded to local environment observations",
          "Shared a short personal anecdote relating to the topic",
          "Kept questions open-ended to continue flow"
        ]
      },
      social_networking: {
        title: "Networking Event",
        difficulty: "medium",
        duration: "8 min",
        xp: 120,
        objective: "Learn to strike up conversations, pitch background, and request contacts at professional gatherings.",
        communicationGoal: "Exchange introductions, talk about hobbies/interests, and ask for a LinkedIn connect.",
        character: {
          name: "Ryan",
          role: "Senior Developer at a top firm",
          tone: "Approachable, conversational, enjoys tech discussions, and is open to networking."
        },
        skills: ["Small talk", "Elevator pitch", "Contact exchange"],
        successCriteria: [
          "Broke the ice naturally",
          "Shared a brief, interesting pitch about themselves",
          "Politely asked for a contact or follow-up connect"
        ]
      },
      social_asking_for_help: {
        title: "Asking for Help",
        difficulty: "medium",
        duration: "8 min",
        xp: 130,
        objective: "Ask for professional assistance without appearing dependent or unprepared.",
        communicationGoal: "Explain what has already been attempted and ask for specific direction or assistance.",
        character: {
          name: "Prof. Emma",
          role: "Faculty Mentor",
          tone: "Academic, busy, helpful if the student shows proactive effort."
        },
        skills: ["Asking for help", "Clarity", "Vulnerability with confidence"],
        successCriteria: [
          "Defined the exact roadblock clearly",
          "Explained steps taken so far to solve it",
          "Responded constructively to suggested guidance"
        ]
      },
      social_founder_pitch: {
        title: "Pitching a Co-founder",
        difficulty: "hard",
        duration: "10 min",
        xp: 200,
        objective: "Convince a talented peer to join your startup venture.",
        communicationGoal: "Present a business idea, explain the opportunity, and handle tough skepticism about validation.",
        character: {
          name: "Sophia",
          role: "Talented Full-Stack Engineer",
          tone: "Pragmatic, cautious, values proof/traction, and needs a strong reason to join."
        },
        skills: ["Venture pitching", "Vision setting", "Objection handling"],
        successCriteria: [
          "Stated the problem and solution clearly",
          "Explained the exact role and value of the co-founder",
          "Addressed technical or traction skepticism convincingly"
        ]
      }
    }
  },

  leadership: {
    title: "Leadership World",
    emoji: "🎤",
    description: "Town halls, crisis control, public coaching, and venture capitalist pitching",
    missions: {
      leadership_team_meeting: {
        title: "Lead a Team Meeting",
        difficulty: "medium",
        duration: "10 min",
        xp: 130,
        objective: "Facilitate planning meetings to achieve group alignment.",
        communicationGoal: "Introduce agenda items, invite contributions, handle conflicting opinions, and summarize outcomes.",
        character: {
          name: "Ryan",
          role: "Tech Lead",
          tone: "Direct, collaborative, values efficiency, defends engineer constraints."
        },
        skills: ["Meeting facilitation", "Decision making", "Team alignment"],
        successCriteria: [
          "Clearly stated meeting objective first",
          "Invited Ryan to share technical concerns",
          "Synthesized conflicting points into a single decision outline"
        ]
      },
      leadership_giving_feedback: {
        title: "Giving Feedback",
        difficulty: "medium",
        duration: "8 min",
        xp: 140,
        objective: "Deliver constructive performance feedback to a direct report.",
        communicationGoal: "Explain performance shortfalls, outline impact, and collaborate on a resolution path.",
        character: {
          name: "Ryan",
          role: "Mid-Level Engineer",
          tone: "Self-conscious, slightly defensive, willing to learn if handled respectfully."
        },
        skills: ["Constructive feedback", "Empathy", "Directness", "Growth framing"],
        successCriteria: [
          "Opened with constructive framing",
          "Stated specific examples of lower code quality",
          "Collaborated on concrete next actions to improve"
        ]
      },
      leadership_townhall: {
        title: "Town Hall Speech",
        difficulty: "hard",
        duration: "12 min",
        xp: 180,
        objective: "Practice addressing a large team, sharing company progress, and answering questions from employees.",
        communicationGoal: "Present a team update, address an internal concern, and deliver motivational closing remarks.",
        character: {
          name: "Ryan",
          role: "Skeptical Employee Representative",
          tone: "Respectful but direct, asks tough questions about layoffs, updates, or salaries."
        },
        skills: ["Town hall address", "Transparency", "Motivational speaking"],
        successCriteria: [
          "Delivered structured update on state of project/firm",
          "Addressed layoffs/concern transparently",
          "Closed with a high-energy morale booster"
        ]
      },
      leadership_vc_pitch: {
        title: "Pitching VCs for Funding",
        difficulty: "hard",
        duration: "15 min",
        xp: 220,
        objective: "Simulate a high-stakes startup funding pitch to Venture Capitalists.",
        communicationGoal: "Explain business model, market size, and defend valuations under severe investor pressure.",
        character: {
          name: "David",
          role: "Managing Director at Venture Fund",
          tone: "Sharp, financially-minded, quick to spot weaknesses, and challenges assumptions.",
        },
        skills: ["Investor pitching", "Value estimation", "Composure"],
        successCriteria: [
          "Articulated target addressable market (TAM) clearly",
          "Defended business model validation",
          "Politely managed valuation skepticism"
        ]
      },
      leadership_crisis: {
        title: "Crisis Communication",
        difficulty: "hard",
        duration: "15 min",
        xp: 210,
        objective: "Manage stakeholder communication during severe tech outages or brand incidents.",
        communicationGoal: "Explain the blocker, take accountability, state corrective steps, and rebuild confidence.",
        character: {
          name: "Sophia",
          role: "Chief Technology Officer",
          tone: "Stressed, direct, wants direct answers, values accountability and composure."
        },
        skills: ["Crisis communication", "Accountability", "Recovery planning", "Composure"],
        successCriteria: [
          "Took clear responsibility for failure",
          "Stated immediate mitigation actions taken",
          "Presented concrete future prevention measures"
        ]
      }
    }
  }
};
