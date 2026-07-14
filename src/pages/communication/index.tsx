import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Trophy, Star, Flame, ArrowRight, Zap, Clock, Bot,
  ChevronRight, X, Globe, TrendingUp, CheckCircle
} from "lucide-react";
import { CommNav } from "./CommNav";
import { WORLDS_DATA } from "./worldsConfig";
import { apiCall } from "../../lib/communicationApi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5)  return "Good Night";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

const WORLDS = Object.values(WORLDS_DATA).map(w => ({
  id: w.id, title: w.title,
  subtitle: w.subtitle.split("—")[0].split(".")[0].trim(),
  emoji: w.emoji, gradient: w.gradient, glow: w.glow,
  path: w.returnPath, total: w.missions.length, accentColor: w.accentColor,
}));

const STUDIO_TOOLS = [
  { id: "speech",       title: "Speech Analyzer",    emoji: "🎙️", path: "/communication/pronunciation",      gradient: "from-emerald-500 to-teal-600",  bg: "bg-emerald-50",  border: "border-emerald-200", accent: "text-emerald-700", desc: "Grammar · Fluency · Vocab · Confidence",           xp: 50, time: "5 min", improves: "fluency" },
  { id: "filler",       title: "Filler Word Coach",  emoji: "🧹", path: "/communication/filler-words",       gradient: "from-green-500 to-emerald-600",  bg: "bg-green-50",    border: "border-green-200",   accent: "text-green-700",   desc: "Detects um, uh, like, basically in real time",     xp: 30, time: "3 min", improves: "fluency" },
  { id: "clarity",      title: "Voice Clarity",      emoji: "🎧", path: "/communication/voice-analysis",     gradient: "from-teal-500 to-cyan-600",      bg: "bg-teal-50",     border: "border-teal-200",    accent: "text-teal-700",    desc: "Clarity · Pace · Volume live meters",              xp: 50, time: "5 min", improves: "tone" },
  { id: "pronunciation",title: "Pronunciation Coach",emoji: "📖", path: "/communication/pronunciation-coach",gradient: "from-emerald-500 to-green-600",  bg: "bg-emerald-50",  border: "border-emerald-200", accent: "text-emerald-700", desc: "Listen · Repeat · AI comparison scoring",           xp: 40, time: "4 min", improves: "pronunciation" },
  { id: "confidence",   title: "Confidence Builder", emoji: "💪", path: "/communication/confidence",         gradient: "from-green-600 to-teal-700",     bg: "bg-green-50",    border: "border-green-200",   accent: "text-green-700",   desc: "Impromptu questions · 3 rounds · AI coaching",     xp: 60, time: "8 min", improves: "confidence" },
];

const WEEK_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const CHALLENGES_BY_DAY: Record<number,{type:string;emoji:string;xp:number}> = {
  0:{type:"Opinion Challenge",emoji:"💬",xp:50},1:{type:"Explain a Concept",emoji:"💡",xp:55},
  2:{type:"Debate Challenge",emoji:"🥊",xp:70},3:{type:"Impromptu Speaking",emoji:"🎯",xp:65},
  4:{type:"Story Completion",emoji:"📖",xp:50},5:{type:"30 Second Speech",emoji:"⏱️",xp:60},
  6:{type:"Scene Description",emoji:"🖼️",xp:55},
};

export const CommunicationDashboard: React.FC = () => {
  const { session, user } = useAuth();
  const token = session?.access_token || null;
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [coachTipDismissed, setCoachTipDismissed] = useState(false);
  const [xpPopVisible, setXpPopVisible] = useState(false);
  const prevXP = useRef(0);

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] ?? "Learner";
  const todayChallenge = CHALLENGES_BY_DAY[new Date().getDay()];

  useEffect(() => { if (token) fetchStats(); }, [token]);

  const fetchStats = async () => {
    try {
      const data = await apiCall('/api/communication/user-stats', token);
      setStats(data);
      if (data.totalXP > prevXP.current && prevXP.current > 0) {
        setXpPopVisible(true);
        setTimeout(() => setXpPopVisible(false), 1500);
      }
      prevXP.current = data.totalXP;
    } catch {}
  };

  const currentLevel = stats?.level || 1;
  const xpCurrent = stats?.levelXP || 0;
  const xpMax = stats?.levelMaxXP || 200;
  const xpPct = Math.min(100, Math.round((xpCurrent / xpMax) * 100));
  const totalXP = stats?.totalXP || 0;
  const streak = stats?.streak || 0;
  const weakestSkill = stats?.weakest || "confidence";
  const weeklyXP: number[] = stats?.weeklyXP || Array(7).fill(0);
  const weeklyMax = Math.max(...weeklyXP, 50);

  const getRecommendation = () => {
    switch (weakestSkill) {
      case "fluency":       return STUDIO_TOOLS.find(t => t.id === "filler")!;
      case "pronunciation": return STUDIO_TOOLS.find(t => t.id === "pronunciation")!;
      case "tone":          return STUDIO_TOOLS.find(t => t.id === "clarity")!;
      case "confidence":    return STUDIO_TOOLS.find(t => t.id === "confidence")!;
      default:              return STUDIO_TOOLS.find(t => t.id === "speech")!;
    }
  };
  const rec = getRecommendation();
  const lastSession = stats?.recentSessions?.[0];
  const WORLD_EMOJIS: Record<string,string> = { campus:"🎓", workplace:"💼", social:"🤝", leadership:"🎤", studio:"⚡" };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <CommNav activeView="home" xp={totalXP} streak={streak}
        onViewChange={view => {
          if (view === "journey") navigate("/communication/worlds");
          else if (view === "progress") navigate("/communication/progress");
          else if (view === "achievements") navigate("/communication/achievements");
        }}
      />
      <main className="max-w-5xl mx-auto px-4 pt-20 space-y-6">

        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 shadow-2xl text-white p-6 sm:p-8 comm-slide-up">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl -translate-y-20 translate-x-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl translate-y-16 -translate-x-16 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1 space-y-5">
              <div>
                <p className="text-emerald-300/80 text-xs font-bold uppercase tracking-widest mb-1">
                  {getGreeting()}, {displayName} 👋
                </p>
                <h1 className="text-2xl sm:text-3xl font-black leading-tight">
                  AI Communication<br />
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Coach</span>
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black leading-none">{currentLevel}</span>
                    <span className="text-[9px] font-black text-emerald-300/70 uppercase tracking-widest mt-0.5">Level</span>
                  </div>
                  {xpPopVisible && (
                    <div className="absolute -top-2 -right-2 text-xs font-black text-emerald-400" style={{animation:"comm-xp-pop 1.5s ease forwards"}}>
                      +XP!
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-bold text-emerald-300/60 mb-1.5">
                    <span>{xpCurrent.toLocaleString()} / {xpMax.toLocaleString()} XP</span>
                    <span>{xpMax - xpCurrent} to Level {currentLevel + 1}</span>
                  </div>
                  <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-1000" style={{width:`${xpPct}%`}} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {streak > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                    <Flame className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-xs font-black text-emerald-200">{streak}-day streak 🔥</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 border border-teal-500/30 rounded-xl">
                  <Zap className="w-3.5 h-3.5 text-teal-300" />
                  <span className="text-xs font-black text-teal-200">{totalXP.toLocaleString()} XP total</span>
                </div>
                {stats?.completedCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-xl">
                    <CheckCircle className="w-3.5 h-3.5 text-green-300" />
                    <span className="text-xs font-black text-green-200">{stats.completedCount} sessions</span>
                  </div>
                )}
              </div>
            </div>
            <div className="hidden md:flex flex-col items-center flex-shrink-0 gap-2">
              <div className="relative">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-green-700 flex items-center justify-center text-5xl shadow-2xl shadow-emerald-900/50 comm-float">
                  👩‍🏫
                </div>
                <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-emerald-400 flex items-center justify-center shadow-lg border-2 border-slate-900">
                  <Star className="w-4 h-4 text-white fill-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-white">Prof. Emma</p>
                <p className="text-[10px] text-emerald-400/70 font-medium">AI Mentor</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 QUICK ACTION CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 comm-slide-up-delay-1">
          {[
            { icon:"🎯", label:"Daily Challenge",  sub:`+${todayChallenge.xp} XP`,    path:"/communication/daily-challenge", cls:"bg-emerald-600 hover:bg-emerald-700 border-emerald-700" },
            { icon:"🌍", label:"Learning Worlds",  sub:"4 worlds · AI roleplay",       path:"/communication/worlds",          cls:"bg-teal-600 hover:bg-teal-700 border-teal-700" },
            { icon:"⚡", label:"Practice Studio",  sub:"5 targeted tools",             path:"/communication/studio",          cls:"bg-green-600 hover:bg-green-700 border-green-700" },
            { icon:"📊", label:"My Progress",      sub:"Stats & analytics",            path:"/communication/progress",        cls:"bg-emerald-700 hover:bg-emerald-800 border-emerald-800" },
          ].map(q => (
            <Link key={q.label} to={q.path}
              className={`relative overflow-hidden rounded-2xl p-4 text-white shadow-md border transition-all hover:-translate-y-0.5 active:scale-95 comm-tool-card ${q.cls}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              <p className="text-2xl mb-2">{q.icon}</p>
              <p className="text-xs font-black leading-tight text-white">{q.label}</p>
              <p className="text-[10px] text-white/80 font-semibold mt-0.5">{q.sub}</p>
            </Link>
          ))}
        </div>

        {/* AI COACH TIP */}
        {!coachTipDismissed && (
          <div className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-sm flex items-start gap-4 relative comm-slide-up">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-xs font-black text-slate-900">AI Coach Recommendation</p>
                <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full uppercase tracking-wider">Live</span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Your {weakestSkill} score has room to grow! Try the{" "}
                <Link to={rec.path} className="text-emerald-700 font-bold hover:underline">{rec.title}</Link>
                {" "}— {rec.desc}.
              </p>
              <Link to={rec.path}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-colors">
                Start now <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <button onClick={() => setCoachTipDismissed(true)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* DAILY CHALLENGE BANNER */}
        <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg comm-slide-up-delay-1 comm-world-card"
          style={{background:"linear-gradient(135deg,#059669,#047857,#065f46)"}}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10 pointer-events-none" />
          <div className="absolute bottom-0 left-20 w-24 h-24 bg-white/5 rounded-full translate-y-8 pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Flame className="w-4 h-4 text-emerald-200" />
                <span className="text-white/80 text-[10px] font-black uppercase tracking-widest">Today's Challenge</span>
              </div>
              <h3 className="text-lg font-black mb-1">{todayChallenge.emoji} {todayChallenge.type}</h3>
              <div className="flex items-center gap-3 text-[10px] text-white/80 font-bold">
                <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" /> +{todayChallenge.xp} XP</span>
                <span>• Resets at midnight</span>
              </div>
            </div>
            <button onClick={() => navigate("/communication/daily-challenge")}
              className="flex-shrink-0 px-5 py-3 bg-white text-emerald-700 font-black text-xs rounded-2xl shadow-lg hover:scale-105 hover:bg-emerald-50 transition-all active:scale-95">
              Accept ⚡
            </button>
          </div>
        </div>

        {/* WORLDS + STUDIO + SIDEBAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">

            {lastSession && (
              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex items-center justify-between gap-4 comm-slide-up">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                    {WORLD_EMOJIS[lastSession.world_id] || "💬"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Continue Where You Left Off</p>
                    <h3 className="text-sm font-black text-slate-900 truncate">{lastSession.title || "Practice Session"}</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Score: <span className="text-emerald-700 font-black">{lastSession.overall_score}/100</span> · +{lastSession.xp_earned} XP earned</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/communication/conversation", {state:{missionId:lastSession.mission_id,worldId:lastSession.world_id,returnPath:`/communication/${lastSession.world_id}`}})}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition-all active:scale-95">
                  Resume <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Learning Worlds */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" /> Learning Worlds
                </h2>
                <Link to="/communication/worlds" className="text-[10px] text-emerald-700 font-black hover:underline flex items-center gap-0.5">
                  View All <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {WORLDS.map(world => {
                  const done = stats?.worldCompletion?.[world.id] || 0;
                  const pct = world.total > 0 ? Math.round((done / world.total) * 100) : 0;
                  return (
                    <Link key={world.id} to={world.path}
                      className="block rounded-2xl overflow-hidden comm-world-card border border-slate-100 group">
                      <div className={`h-16 bg-gradient-to-br ${world.gradient} flex items-center justify-center relative`}>
                        <span className="text-3xl" style={{filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.2))"}}>
                          {world.emoji}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        {done >= world.total && done > 0 && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center text-[10px]">⭐</div>
                        )}
                      </div>
                      <div className="p-3 bg-white">
                        <h4 className="text-xs font-black text-slate-900 mb-0.5">{world.title}</h4>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-slate-400 font-medium">{done}/{world.total} missions</span>
                          <span className="text-[10px] font-black text-emerald-700">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-500 to-teal-500"
                            style={{width:`${pct}%`}} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Practice Studio */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600" /> Practice Studio
                </h2>
                <Link to="/communication/studio" className="text-[10px] text-emerald-700 font-black hover:underline flex items-center gap-0.5">
                  All Tools <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {STUDIO_TOOLS.map(tool => {
                  const isRec = weakestSkill === tool.improves;
                  return (
                    <Link key={tool.id} to={tool.path}
                      className={`flex items-center gap-3 p-3 rounded-2xl border comm-tool-card ${
                        isRec ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-100"
                              : "bg-slate-50 border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/30"
                      }`}>
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-lg shadow-sm flex-shrink-0`}>
                        {tool.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-slate-900">{tool.title}</p>
                          {isRec && <span className="text-[8px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full uppercase tracking-wide">⭐ Rec</span>}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">{tool.desc}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] font-black text-emerald-700">+{tool.xp} XP</p>
                        <p className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5 justify-end">
                          <Clock className="w-2.5 h-2.5" /> {tool.time}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-5">
            {/* Weekly XP */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Weekly Activity
              </h3>
              <div className="flex items-end gap-1.5 h-20 justify-between mb-3">
                {WEEK_DAYS.map((day, idx) => {
                  const val = weeklyXP[idx] || 0;
                  const h = Math.max(4, Math.round((val / weeklyMax) * 60));
                  const isToday = new Date().getDay() === idx;
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="w-full rounded-lg overflow-hidden h-[60px] flex items-end bg-slate-100">
                        <div className={`w-full rounded-t-lg transition-all duration-700 ${isToday ? "bg-emerald-500" : "bg-emerald-300"}`}
                          style={{height:`${h}px`}} />
                      </div>
                      <span className={`text-[8px] font-black uppercase ${isToday ? "text-emerald-700" : "text-slate-400"}`}>{day}</span>
                    </div>
                  );
                })}
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-lg font-black text-slate-900">{weeklyXP.reduce((a,b)=>a+b,0)} XP</p>
                  <p className="text-[10px] text-slate-400 font-medium">this week</p>
                </div>
                {streak > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <Flame className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-black text-emerald-800">{streak}🔥</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Recent Activity</h3>
                <Link to="/communication/progress" className="text-[10px] text-emerald-700 font-black hover:underline">View All</Link>
              </div>
              {stats?.recentSessions?.length > 0 ? (
                <div className="space-y-2.5">
                  {stats.recentSessions.slice(0,4).map((s:any,i:number) => (
                    <div key={s.id||i} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-sm flex-shrink-0">
                        {WORLD_EMOJIS[s.world_id]||"💬"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-800 truncate">{s.title||"Practice Session"}</p>
                        <p className="text-[9px] text-slate-400 font-medium">+{s.xp_earned||0} XP · {s.overall_score||0}/100</p>
                      </div>
                      <div className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${
                        (s.overall_score||0)>=80?"bg-emerald-100 text-emerald-700"
                        :(s.overall_score||0)>=60?"bg-teal-100 text-teal-700":"bg-red-100 text-red-700"
                      }`}>{s.overall_score||0}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-2 text-xl">🚀</div>
                  <p className="text-xs font-bold text-slate-500">No sessions yet</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Complete your first practice!</p>
                  <Link to="/communication/worlds" className="mt-3 inline-flex items-center gap-1 text-[10px] text-emerald-700 font-black hover:underline">
                    Start Now <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>

            {/* Achievements */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Achievements</h3>
                <Link to="/communication/achievements" className="text-[10px] text-emerald-700 font-black hover:underline">View All</Link>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">🏆</div>
                <div>
                  <p className="text-xs font-black text-emerald-900">Keep practicing!</p>
                  <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Unlock rare badges by completing sessions daily</p>
                </div>
              </div>
              <Link to="/communication/achievements"
                className="mt-3 w-full py-2.5 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" /> Explore Achievements
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
