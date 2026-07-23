import React, { useMemo, useState } from 'react';
import {
  JobFitAnalysis, SkillAssessment, GapConfidence, RoadmapItem,
  VerifiedImprovement, RecommendedPortfolioProject, RecruiterInsightType,
} from '../types';
import { ConfirmDialog } from './ConfirmDialog';

// ─── Confidence tier presentation ────────────────────────────────────────────

const CONFIDENCE_META: Record<GapConfidence, { label: string; dot: string; chip: string }> = {
  EXPLICITLY_VERIFIED: { label: 'Verified', dot: '#16A34A', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  IMPLICITLY_SUPPORTED: { label: 'Implicit', dot: '#0D9488', chip: 'bg-teal-50 text-teal-700 border-teal-200' },
  POSSIBLY_KNOWN: { label: 'Possibly Known', dot: '#D97706', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  MISSING: { label: 'Missing', dot: '#DC2626', chip: 'bg-red-50 text-red-700 border-red-200' },
  CANNOT_VERIFY: { label: 'Cannot Verify', dot: '#6B7280', chip: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const CONFIDENCE_ORDER: GapConfidence[] = [
  'MISSING', 'CANNOT_VERIFY', 'POSSIBLY_KNOWN', 'IMPLICITLY_SUPPORTED', 'EXPLICITLY_VERIFIED',
];

type TabId = 'gaps' | 'improvements' | 'projects' | 'roadmap' | 'recruiter';

const TABS: { id: TabId; label: string }[] = [
  { id: 'gaps', label: 'Gap Analysis' },
  { id: 'improvements', label: 'Improvements' },
  { id: 'projects', label: 'Projects' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'recruiter', label: 'Recruiter View' },
];

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: '#16A34A' }}>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#16A34A' }}></span> {children}
  </h4>
);

const MatchBar: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div>
    <div className="flex justify-between text-sm mb-1.5">
      <span className="font-medium text-gray-600">{label}</span>
      <span className="font-bold text-gray-900">{Math.round(value)}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }}></div>
    </div>
  </div>
);

const SkillCard: React.FC<{ skill: SkillAssessment }> = ({ skill }) => {
  const meta = CONFIDENCE_META[skill.confidence] || CONFIDENCE_META.MISSING;
  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.dot }}></span>
          <span className="font-bold text-sm text-slate-900">{skill.skillName}</span>
          {skill.isEssential && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 uppercase tracking-wide">Essential</span>
          )}
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${meta.chip}`}>{meta.label}</span>
      </div>
      <div className="text-xs text-slate-500 font-medium">{skill.category} · Importance {Math.round(skill.importanceScore)}/10{skill.projectDemonstrable ? ' · Provable via project' : ''}</div>
      {skill.jdSnippet && (
        <p className="text-xs text-slate-600"><span className="font-bold text-slate-500">JD asks:</span> “{skill.jdSnippet}”</p>
      )}
      {skill.resumeEvidence && (
        <p className="text-xs text-emerald-700"><span className="font-bold">Your evidence:</span> “{skill.resumeEvidence}”</p>
      )}
    </div>
  );
};

const RoadmapPhase: React.FC<{ title: string; timeframe: string; items: RoadmapItem[] }> = ({ title, timeframe, items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h5 className="font-bold text-slate-900 text-sm">{title}</h5>
        <span className="text-xs text-slate-400 font-medium">{timeframe}</span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="p-3.5 rounded-xl border border-gray-200 bg-white flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              {item.detail && <p className="text-xs text-slate-600 mt-0.5">{item.detail}</p>}
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {item.estTime && <span>⏱ {item.estTime}</span>}{item.estTime && item.impact && ' · '}{item.impact && <span>📈 {item.impact}</span>}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const INSIGHT_META: Record<RecruiterInsightType, { badge: string; chip: string; border: string; icon: string }> = {
  STRENGTH: { badge: 'Lead With This', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-emerald-200', icon: '🏆' },
  GAP: { badge: 'Close This Gap', chip: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-amber-200', icon: '🧩' },
  TIP: { badge: 'Positioning Tip', chip: 'bg-blue-50 text-blue-700 border-blue-200', border: 'border-blue-200', icon: '🧭' },
};

interface Props {
  analysis: JobFitAnalysis | null;
  loading: boolean;
  onRun: () => void;
  /** Applies an improved bullet into the parsed resume. Returns true when the original text was found and replaced. */
  onApplyImprovement: (improvement: VerifiedImprovement) => boolean;
  /** Adds a recommended project into the parsed resume (after the user confirms they genuinely built it). Returns true on success. */
  onAddProject: (project: RecommendedPortfolioProject) => boolean;
}

export const GapAnalysisPanel: React.FC<Props> = ({ analysis, loading, onRun, onApplyImprovement, onAddProject }) => {
  const [activeTab, setActiveTab] = useState<TabId>('gaps');
  const [appliedImprovements, setAppliedImprovements] = useState<number[]>([]);
  const [addedProjects, setAddedProjects] = useState<number[]>([]);

  const handleApplyImprovement = (imp: VerifiedImprovement, index: number) => {
    if (appliedImprovements.includes(index)) return;
    if (onApplyImprovement(imp)) {
      setAppliedImprovements(prev => [...prev, index]);
    }
  };

  const [pendingProject, setPendingProject] = useState<{ proj: RecommendedPortfolioProject; index: number } | null>(null);

  const handleAddProject = (proj: RecommendedPortfolioProject, index: number) => {
    if (addedProjects.includes(index)) return;
    setPendingProject({ proj, index });
  };

  const confirmAddProject = () => {
    if (!pendingProject) return;
    if (onAddProject(pendingProject.proj)) {
      setAddedProjects(prev => [...prev, pendingProject.index]);
    }
    setPendingProject(null);
  };

  const confidenceCounts = useMemo(() => {
    const counts = {} as Record<GapConfidence, number>;
    CONFIDENCE_ORDER.forEach(c => { counts[c] = 0; });
    analysis?.skills.forEach(s => { counts[s.confidence] = (counts[s.confidence] || 0) + 1; });
    return counts;
  }, [analysis]);

  const sortedSkills = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.skills].sort((a, b) => {
      const tier = CONFIDENCE_ORDER.indexOf(a.confidence) - CONFIDENCE_ORDER.indexOf(b.confidence);
      if (tier !== 0) return tier;
      return b.importanceScore - a.importanceScore;
    });
  }, [analysis]);

  if (!analysis) {
    return (
      <div className="rounded-xl p-6 text-center space-y-3" style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
        <SectionLabel>Job Fit &amp; Gap Analysis</SectionLabel>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Go deeper than the score: verify which JD skills your resume actually proves, see truth-backed rewrite
          suggestions, portfolio projects that close your gaps, and a phased roadmap to job-fit.
        </p>
        <button
          onClick={onRun}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-[0_4px_14px_rgba(16,185,129,0.3)] disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Verifying evidence &amp; building your plan…
            </span>
          ) : 'Run Job Fit & Gap Analysis'}
        </button>
        {loading && <p className="text-xs text-slate-400">This runs two AI passes and can take ~30 seconds.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionLabel>Job Fit &amp; Gap Analysis</SectionLabel>

      {/* Overview strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 border border-gray-200 bg-white flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-full flex flex-col items-center justify-center text-white shrink-0"
            style={{
              background: analysis.overallMatch >= 70
                ? 'linear-gradient(135deg, oklch(0.68 0.14 163), oklch(0.62 0.13 163))'
                : analysis.overallMatch >= 40
                  ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                  : 'linear-gradient(135deg, #EF4444, #DC2626)',
            }}
          >
            <span className="text-2xl font-black leading-none">{Math.round(analysis.overallMatch)}</span>
            <span className="text-[9px] font-bold uppercase tracking-wide opacity-90">Match</span>
          </div>
          <div className="min-w-0">
            <p className="font-black text-slate-900 text-sm uppercase tracking-wide">{analysis.verdict || 'Analyzed'}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">{analysis.skills.length} JD requirements verified against your resume</p>
          </div>
        </div>
        <div className="rounded-xl p-5 border border-gray-200 bg-white space-y-3">
          <MatchBar label="Hard Skills" value={analysis.matchBreakdown.hardSkills} />
          <MatchBar label="Experience" value={analysis.matchBreakdown.experience} />
          <MatchBar label="Soft Skills" value={analysis.matchBreakdown.softSkills} />
        </div>
        <div className="rounded-xl p-5 border border-gray-200 bg-white">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Confidence Badges</p>
          <div className="flex flex-wrap gap-2">
            {CONFIDENCE_ORDER.slice().reverse().map(c => (
              <span key={c} className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${CONFIDENCE_META[c].chip}`}>
                {CONFIDENCE_META[c].label}: {confidenceCounts[c] || 0}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap bg-slate-100 border border-slate-200 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
              activeTab === tab.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Gap Analysis tab */}
      {activeTab === 'gaps' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedSkills.map((skill, i) => <SkillCard key={i} skill={skill} />)}
          {sortedSkills.length === 0 && <p className="text-sm text-slate-500">No skills could be extracted from this job description.</p>}
        </div>
      )}

      {/* Improvements tab */}
      {activeTab === 'improvements' && (
        <div className="space-y-3">
          {analysis.improvements.map((imp, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500">{imp.section}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{imp.tactic}</span>
                  {imp.estMatchDelta && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{imp.estMatchDelta} match</span>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg p-3 bg-red-50/60 border border-red-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Before</p>
                  <p className="text-sm text-slate-700">{imp.original}</p>
                </div>
                <div className="rounded-lg p-3 bg-emerald-50/60 border border-emerald-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">After</p>
                  <p className="text-sm text-slate-800 font-medium">{imp.improved}</p>
                </div>
              </div>
              {imp.usesEstimatedMetrics && (
                <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠️ The numbers above are realistic estimates — replace them with your real figures before using this bullet.
                </p>
              )}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {imp.rationale ? <p className="text-xs text-slate-500 flex-1 min-w-[200px]">{imp.rationale}</p> : <span />}
                <button
                  onClick={() => handleApplyImprovement(imp, i)}
                  disabled={appliedImprovements.includes(i)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                    appliedImprovements.includes(i)
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
                >
                  {appliedImprovements.includes(i) ? 'Applied to Resume ✓' : 'Apply to Resume'}
                </button>
              </div>
            </div>
          ))}
          {analysis.improvements.length === 0 && <p className="text-sm text-slate-500">No rewrite suggestions were generated.</p>}
        </div>
      )}

      {/* Projects tab */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            💡 <span className="font-bold">Already built something like these?</span> If you have hands-on experience with
            projects using these technologies, add them to your resume — real experience beats plans. Only add projects
            you have genuinely built (or start building one from the steps below and add it when it's done).
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {analysis.projects.map((proj, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h5 className="font-bold text-slate-900">{proj.title}</h5>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">{proj.difficulty}</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">⏱ ~{Math.round(proj.estimatedHours)} hours · Resume value {Math.round(proj.resumeValue)}/10</p>
              <div className="flex flex-wrap gap-1.5">
                {proj.techStack.map((tech, j) => (
                  <span key={j} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{tech}</span>
                ))}
              </div>
              {proj.skillsDemonstrated.length > 0 && (
                <p className="text-xs text-slate-600"><span className="font-bold">Closes gaps:</span> {proj.skillsDemonstrated.join(', ')}</p>
              )}
              {proj.buildSteps.length > 0 && (
                <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                  {proj.buildSteps.map((step, j) => <li key={j}>{step}</li>)}
                </ol>
              )}
              {proj.recruiterSignal && (
                <p className="text-xs text-slate-500 italic mt-auto pt-2 border-t border-gray-100">🎯 {proj.recruiterSignal}</p>
              )}
              <button
                onClick={() => handleAddProject(proj, i)}
                disabled={addedProjects.includes(i)}
                className={`w-full px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                  addedProjects.includes(i)
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                    : 'border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {addedProjects.includes(i) ? 'Added to Resume ✓' : "I've built this — Add to Resume"}
              </button>
            </div>
          ))}
          {analysis.projects.length === 0 && <p className="text-sm text-slate-500">No portfolio projects were recommended — your essential skills look covered.</p>}
          </div>
        </div>
      )}

      {/* Roadmap tab */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6">
          <RoadmapPhase title="Phase 1 · Immediate Quick-Wins" timeframe="< 30 mins" items={analysis.roadmap.quickWins} />
          <RoadmapPhase title="Phase 2 · Resume Optimization" timeframe="1–2 hours" items={analysis.roadmap.resumeEdits} />
          <RoadmapPhase title="Phase 3 · Portfolio Acceleration" timeframe="1–2 weeks" items={analysis.roadmap.portfolioBuilds} />
          <RoadmapPhase title="Phase 4 · Skill Acquisition & Certs" timeframe="1–3 months" items={analysis.roadmap.skillAcquisition} />
          {analysis.roadmap.interviewPrepTopics.length > 0 && (
            <div className="space-y-3">
              <h5 className="font-bold text-slate-900 text-sm">Phase 5 · Interview Prep Topics</h5>
              <div className="flex flex-wrap gap-2">
                {analysis.roadmap.interviewPrepTopics.map((topic, i) => (
                  <span key={i} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{topic}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recruiter View tab */}
      {activeTab === 'recruiter' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {analysis.recruiterInsights.map((ins, i) => {
            const meta = INSIGHT_META[ins.type] || INSIGHT_META.TIP;
            return (
              <div key={i} className={`rounded-xl border-2 ${meta.border} bg-white p-5 space-y-3 flex flex-col`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl leading-none">{meta.icon}</span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${meta.chip}`}>{meta.badge}</span>
                </div>
                <h5 className="font-bold text-slate-900 text-sm leading-snug">{ins.headline || ins.jdRequirement || 'Recruiter insight'}</h5>
                <p className="text-sm text-slate-600 flex-1">{ins.insight}</p>
                {ins.jdRequirement && (
                  <p className="text-xs text-slate-500"><span className="font-bold">Relates to:</span> {ins.jdRequirement}</p>
                )}
                {ins.impactChannels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
                    {ins.impactChannels.map((ch, j) => (
                      <span key={j} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 mt-1.5">{ch}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {analysis.recruiterInsights.length === 0 && <p className="text-sm text-slate-500">No recruiter insights were generated.</p>}
        </div>
      )}

      {/* Honest-add confirmation for portfolio projects */}
      <ConfirmDialog
        open={pendingProject !== null}
        icon="🛠️"
        title="Add this project to your resume?"
        message={
          <>
            Only add <span className="font-bold text-slate-900">“{pendingProject?.proj.title}”</span> if you have
            genuinely built it — or something equivalent using these technologies. Recruiters may ask you about it
            in detail.
          </>
        }
        confirmLabel="Yes, I've built this — Add it"
        cancelLabel="Cancel"
        onConfirm={confirmAddProject}
        onCancel={() => setPendingProject(null)}
      />
    </div>
  );
};
