import React, { useState, useEffect, useRef } from 'react';
import { InterviewMode, InterviewConfig, InterviewQuestion, InterviewFeedback } from '../types';
import { generateInterviewQuestions } from '../services/gemini';
import { InterviewSetupForm } from './InterviewSetup';
import { InterviewSession } from './InterviewSession';

type CoachView = 'mode_select' | 'setup' | 'loading' | 'session' | 'results_summary' | 'results_detail';
import confetti from 'canvas-confetti';

const INTERVIEW_MODES = [
    {
        id: InterviewMode.DOMAIN_BASED,
        title: 'Domain Based',
        desc: 'Select a domain and topic for targeted questions from your field of expertise.',
        icon: '🎯',
        color: '#6366f1',
        enabled: true
    },
    {
        id: InterviewMode.JD_BASED,
        title: 'Job Description Based',
        desc: 'Paste a JD and get questions tailored to the specific role requirements.',
        icon: '📋',
        color: '#10b981',
        enabled: true
    },
    {
        id: InterviewMode.RESUME_BASED,
        title: 'Resume Based',
        desc: 'Upload your resume and face questions about your own skills and projects.',
        icon: '📄',
        color: '#f59e0b',
        enabled: true
    },
    {
        id: InterviewMode.COMPANY_SPECIFIC,
        title: 'Company Specific',
        desc: 'Practice with questions commonly asked by top MNCs and startups.',
        icon: '🏢',
        color: '#ec4899',
        enabled: true
    },
    {
        id: InterviewMode.PREVIOUS_EXPERIENCE,
        title: 'Previous Interview Experience',
        desc: 'Revisit and improve on questions from your past interviews.',
        icon: '🔄',
        color: '#14b8a6',
        enabled: true
    },
    {
        id: InterviewMode.CUSTOM,
        title: 'Custom Mode',
        desc: 'Combine Resume + JD + more for a fully customized mock interview.',
        icon: '⚡',
        color: '#8b5cf6',
        enabled: false
    }
];

export const InterviewCoach: React.FC = () => {
    const [view, setView] = useState<CoachView>('mode_select');
    const [selectedMode, setSelectedMode] = useState<InterviewMode | null>(null);
    const [config, setConfig] = useState<InterviewConfig | null>(null);
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
    const [loadingError, setLoadingError] = useState('');

    // Trigger confetti when entering results summary
    useEffect(() => {
        if (view === 'results_summary') {
            const end = Date.now() + 2 * 1000;
            const colors = ['#bb0000', '#ffffff', '#6366f1', '#10b981'];

            (function frame() {
                confetti({
                    particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: colors
                });
                confetti({
                    particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: colors
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
        }
    }, [view]);

    // Results UI states
    const [selectedQIdx, setSelectedQIdx] = useState(0);
    const gapsRef = useRef<HTMLDivElement>(null);
    const compareRef = useRef<HTMLDivElement>(null);
    const [leftTab, setLeftTab] = useState<'all' | 'bookmarked'>('all');
    const [sessionDuration, setSessionDuration] = useState(0);

    const handleSelectMode = (mode: InterviewMode, enabled: boolean) => {
        if (!enabled) return;
        setSelectedMode(mode);
        setView('setup');
    };

    const handleStartInterview = async (interviewConfig: InterviewConfig) => {
        setConfig(interviewConfig);
        setView('loading');
        setLoadingError('');

        try {
            const generatedQuestions = await generateInterviewQuestions(interviewConfig);
            setQuestions(generatedQuestions);
            setView('session');
        } catch (err: any) {
            console.error('Failed to generate questions:', err);
            setLoadingError(err?.message || 'Failed to generate interview questions. Please try again.');
            setView('setup');
        }
    };

    const handleFinish = (interviewFeedback: InterviewFeedback, bookmarks: number[], durationSecs: number, sessionAnswers: Record<number, string>) => {
        setFeedback(interviewFeedback);
        setBookmarkedIds(bookmarks);
        setSessionDuration(durationSecs);
        setAnswers(sessionAnswers);
        setView('results_summary');
    };

    const handleRestart = () => {
        setView('mode_select');
        setSelectedMode(null);
        setConfig(null);
        setQuestions([]);
        setFeedback(null);
        setBookmarkedIds([]);
        setLoadingError('');
    };

    // ─── Mode Selection ───
    if (view === 'mode_select') {
        return (
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.75rem'
                    }}>
                        Interview Coach
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto' }}>
                        Choose an interview mode to start practicing. Our AI will generate tailored questions and evaluate your responses in real-time.
                    </p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '1.25rem'
                }}>
                    {INTERVIEW_MODES.map(mode => (
                        <div
                            key={mode.id}
                            className={`interview-mode-card ${!mode.enabled ? 'disabled' : ''}`}
                            onClick={() => handleSelectMode(mode.id, mode.enabled)}
                        >
                            <div className="mode-icon" style={{ background: `${mode.color}20` }}>
                                <span>{mode.icon}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>{mode.title}</h3>
                                {!mode.enabled && <span className="coming-soon-badge">Coming Soon</span>}
                            </div>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                                {mode.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ─── Setup Form ───
    if (view === 'setup' && selectedMode) {
        return (
            <div>
                {loadingError && (
                    <div style={{
                        maxWidth: '680px', margin: '1rem auto', padding: '1rem',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '0.75rem', color: '#fca5a5', fontSize: '0.9rem'
                    }}>
                        ⚠️ {loadingError}
                    </div>
                )}
                <InterviewSetupForm
                    mode={selectedMode}
                    onStart={handleStartInterview}
                    onBack={() => { setView('mode_select'); setSelectedMode(null); setLoadingError(''); }}
                />
            </div>
        );
    }

    // ─── Loading Questions ───
    if (view === 'loading') {
        return (
            <div style={{
                minHeight: 'calc(100vh - 73px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '1.5rem'
            }}>
                <div className="spin-animation" style={{ fontSize: '3rem' }}>🎯</div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Preparing Your Interview...</h2>
                <p style={{ color: '#64748b', maxWidth: '400px', textAlign: 'center' }}>
                    Our AI is generating personalized questions based on your configuration. This may take a few seconds.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            background: '#6366f1',
                            animation: `pulse-recording 1.5s ease-in-out ${i * 0.3}s infinite`
                        }} />
                    ))}
                </div>
            </div>
        );
    }

    // ─── Live Interview Session ───
    if (view === 'session' && config && questions.length > 0) {
        return (
            <InterviewSession
                config={config}
                questions={questions}
                onFinish={handleFinish}
                onBack={handleRestart}
            />
        );
    }

    // ─── Results Summary ───
    if (view === 'results_summary' && feedback) {
        return (
            <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🦾 😎</div>
                
                <div style={{ 
                    display: 'inline-flex', alignItems: 'center', gap: '1rem', 
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2rem', 
                    padding: '0.5rem 1.5rem', marginBottom: '3rem', background: 'rgba(15,23,42,0.4)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                }}>
                    <div style={{ 
                        width: '40px', height: '40px', borderRadius: '50%', 
                        border: '2px solid rgba(255,255,255,0.2)', borderLeftColor: '#f59e0b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700 
                    }}>
                        {feedback.overallScore}
                    </div>
                    <div style={{ color: '#d1d5db', fontSize: '1.1rem', letterSpacing: '0.05em' }}>Solid Effort! 💪</div>
                </div>

                <div style={{
                    background: 'linear-gradient(145deg, rgba(30,41,59,0.7), rgba(15,23,42,0.8))',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '1.5rem', padding: '3rem 2rem', marginBottom: '3rem',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 400, color: '#f1f5f9', fontStyle: 'italic', lineHeight: 1.6, marginBottom: '2rem', fontFamily: 'serif' }}>
                        "You answered questions, identified your blind spots, AND<br/>made it to the end. That is a certified W."
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
                        Not everyone has the guts to face their gaps head-on. You did. Respect. 🫡
                    </p>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2rem' }}>
                    YOU ABSOLUTELY SHOWED UP TODAY, {config?.candidateName?.toUpperCase() || 'CANDIDATE'} 👾 - NOW LET'S DO IT AGAIN.
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem' }}>
                    <button 
                        onClick={() => setView('results_detail')}
                        style={{
                            background: '#d4a373', color: '#1c1917', fontWeight: 700,
                            padding: '1rem 2rem', borderRadius: '0.75rem', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            fontSize: '0.95rem', letterSpacing: '0.05em', transition: 'transform 0.2s',
                            fontFamily: 'monospace'
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'none'}
                    >
                        📊 VIEW MY RESULTS
                    </button>
                    <button 
                        onClick={handleRestart}
                        style={{
                            background: 'rgba(15,23,42,0.6)', color: '#94a3b8', fontWeight: 600,
                            padding: '1rem 2rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            fontSize: '0.95rem', letterSpacing: '0.05em', transition: 'all 0.2s',
                            fontFamily: 'monospace'
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.6)'; e.currentTarget.style.color = '#94a3b8'; }}
                    >
                        🔄 TEST MY SKILLS AGAIN
                    </button>
                </div>

                <div style={{ color: '#475569', fontSize: '0.8rem', fontStyle: 'italic', fontFamily: 'monospace' }}>
                    "The best time to study was yesterday. The second best time is right now." - someone suspiciously wise 🦉
                </div>
            </div>
        );
    }

    // ─── Results Detail ───
    if (view === 'results_detail' && feedback && config && questions.length > 0) {
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        const currentQ = questions[selectedQIdx];
        const currentA = feedback.suggestedAnswers[selectedQIdx];
        const isBookmarked = bookmarkedIds.includes(currentQ?.id);

        const getScoreColor = (score: number) => {
            if (score >= 80) return '#10b981'; // Green
            if (score >= 60) return '#f59e0b'; // Orange
            return '#ef4444'; // Red
        };

        const getScoreLabel = (score: number) => {
            if (score >= 80) return 'GOOD';
            if (score >= 60) return 'IMPROVE';
            return 'NEEDS WORK';
        };

        const getRealScore = (idx: number) => {
            const answer = feedback.suggestedAnswers[idx];
            return answer?.score ?? 0;
        };

        // Compute Topic Groups for Knowledge Gaps
        const topicGroups: Record<string, { questions: InterviewQuestion[], averageScore: number, allTags: string[] }> = {};
        questions.forEach((q, idx) => {
            const mainTopic = q.topic || q.tags?.[0] || 'General';
            if (!topicGroups[mainTopic]) {
                topicGroups[mainTopic] = { questions: [], averageScore: 0, allTags: [] };
            }
            topicGroups[mainTopic].questions.push(q);
            topicGroups[mainTopic].averageScore += getRealScore(idx);
            q.tags?.forEach(tag => {
                if (!topicGroups[mainTopic].allTags.includes(tag) && tag !== mainTopic) {
                    topicGroups[mainTopic].allTags.push(tag);
                }
            });
        });

        Object.keys(topicGroups).forEach(k => {
            topicGroups[k].averageScore /= topicGroups[k].questions.length;
        });

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0b0f19', color: '#e2e8f0' }}>
                {/* Top Navbar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#111827' }}>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', letterSpacing: '0.02em', marginBottom: '0.2rem', fontFamily: 'serif' }}>Interview Analysis</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace' }}>POST-INTERVIEW INSIGHTS REPORT</div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ 
                            width: '60px', height: '60px', borderRadius: '50%', 
                            border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#d4a373',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{feedback.overallScore}</div>
                        </div>
                        <div style={{ fontSize: '0.6rem', color: '#6b7280', marginTop: '4px', letterSpacing: '0.1em' }}>SCORE</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', justifyContent: 'flex-end' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1rem', color: '#fff', fontFamily: 'serif' }}>{config.candidateName || 'Candidate'}</div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280', fontFamily: 'monospace' }}>{config.domain || config.jobRole || 'Interview'}</div>
                        </div>

                        <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'center' }}>
                            <div>
                                <div style={{ fontSize: '1.1rem', color: '#d4a373', fontFamily: 'monospace' }}>{dateStr}</div>
                                <div style={{ fontSize: '0.7rem', color: '#6b7280', letterSpacing: '0.1em' }}>DATE</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.1rem', color: '#d4a373', fontFamily: 'monospace' }}>
                                    {Math.floor(sessionDuration / 60).toString().padStart(2, '0')}:{(sessionDuration % 60).toString().padStart(2, '0')}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#6b7280', letterSpacing: '0.1em' }}>DURATION</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.1rem', color: '#d4a373', fontFamily: 'monospace' }}>{questions.length}</div>
                                <div style={{ fontSize: '0.7rem', color: '#6b7280', letterSpacing: '0.1em' }}>QUESTIONS</div>
                            </div>
                        </div>

                        <button onClick={handleRestart} style={{
                            width: '50px', height: '50px', borderRadius: '0.5rem', background: '#1f2937', 
                            border: '1px solid rgba(255,255,255,0.1)', color: '#60a5fa', cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem'
                        }}>
                            <span style={{ fontSize: '1.2rem', margin: 0, padding: 0 }}>🔄</span>
                            <span style={{ fontSize: '0.55rem', letterSpacing: '0.05em', fontFamily: 'monospace' }}>RETRY</span>
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    
                    {/* Left Sidebar */}
                    <div style={{ width: '320px', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', background: '#0f1423' }}>
                        <div style={{ display: 'flex', padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div onClick={() => setLeftTab('all')} style={{ flex: 1, cursor: 'pointer', fontSize: '0.8rem', color: leftTab === 'all' ? '#d4a373' : '#9ca3af', letterSpacing: '0.1em', fontFamily: 'monospace' }}>ALL QUESTIONS</div>
                            <div onClick={() => setLeftTab('bookmarked')} style={{ cursor: 'pointer', fontSize: '0.8rem', color: leftTab === 'bookmarked' ? '#d4a373' : '#6b7280', letterSpacing: '0.05em', fontFamily: 'monospace' }}>★ BOOKMARKED</div>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {questions.map((q, idx) => {
                                const isBM = bookmarkedIds.includes(q.id);
                                if (leftTab === 'bookmarked' && !isBM) return null;

                                const qScore = getRealScore(idx);
                                const color = getScoreColor(qScore);
                                const label = getScoreLabel(qScore);
                                const isSelected = idx === selectedQIdx;

                                return (
                                    <div key={q.id} 
                                        onClick={() => setSelectedQIdx(idx)}
                                        style={{ 
                                            padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.02)', cursor: 'pointer',
                                            background: isSelected ? 'rgba(255,255,255,0.03)' : 'transparent',
                                            borderLeft: isSelected ? `2px solid ${color}` : '2px solid transparent'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '0.2rem', background: `${color}20`, color: color, fontWeight: 700, letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                                                    {label}
                                                </span>
                                                <span style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace' }}>Q{idx + 1}</span>
                                            </div>
                                            <div style={{ color: isBM ? '#d4a373' : '#374151' }}>{isBM ? '★' : '☆'}</div>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#d1d5db', marginBottom: '0.5rem', fontFamily: 'monospace' }}>{q.tags?.[0] || 'Topic'}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#9ca3af', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4, fontFamily: 'serif' }}>
                                            {q.question}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Pane */}
                    <div style={{ flex: 1, padding: '3rem', overflowY: 'auto', background: '#0b0f19' }}>
                        {currentQ && currentA && (
                            <div style={{ maxWidth: '900px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', borderRadius: '1rem', background: '#10b98120', color: '#10b981', fontWeight: 600, fontFamily: 'monospace' }}>
                                            {getScoreLabel(getRealScore(selectedQIdx))}
                                        </span>
                                        {currentQ.tags.map(t => (
                                            <span key={t} style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontFamily: 'monospace' }}>{t}</span>
                                        ))}
                                    </div>
                                    <div style={{ color: isBookmarked ? '#d4a373' : '#4b5563', fontSize: '1.2rem', cursor: 'pointer' }}
                                         onClick={() => {
                                             setBookmarkedIds(prev => isBookmarked ? prev.filter(id => id !== currentQ.id) : [...prev, currentQ.id]);
                                         }}
                                    >
                                        {isBookmarked ? '★' : '☆'}
                                    </div>
                                </div>
                                
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 400, color: '#f3f4f6', lineHeight: 1.5, marginBottom: '2.5rem', fontFamily: 'serif' }}>
                                    {currentQ.question}
                               </h2>

                               <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem' }}>
                                   <div onClick={() => compareRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{ paddingBottom: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', letterSpacing: '0.05em', color: '#d4a373', borderBottom: '2px solid #d4a373', fontFamily: 'monospace' }}>
                                       ANSWER COMPARISON
                                   </div>
                                   <div onClick={() => gapsRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{ paddingBottom: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', letterSpacing: '0.05em', color: '#6b7280', borderBottom: '2px solid transparent', fontFamily: 'monospace' }}>
                                       KNOWLEDGE GAPS
                                   </div>
                               </div>

                               <div ref={compareRef} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem', marginBottom: '4rem' }}>
                                       {/* Candidate Card */}
                                       <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.5rem', padding: '2rem' }}>
                                           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                               <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></div>
                                               <span style={{ fontSize: '0.75rem', color: '#f59e0b', letterSpacing: '0.1em', fontFamily: 'monospace' }}>CANDIDATE'S ANSWER</span>
                                           </div>
                                           <div style={{ color: '#d1d5db', fontStyle: 'italic', fontSize: '1.05rem', lineHeight: 1.7, fontFamily: 'serif' }}>
                                               "{answers[currentQ.id] || 'No specific answer detected.'}"
                                           </div>
                                       </div>

                                       {/* Ideal Card */}
                                       <div style={{ background: '#064e3b15', border: '1px solid #10b98140', borderRadius: '0.5rem', padding: '2rem' }}>
                                           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                               <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                                               <span style={{ fontSize: '0.75rem', color: '#10b981', letterSpacing: '0.1em', fontFamily: 'monospace' }}>IDEAL ANSWER</span>
                                           </div>
                                           <div style={{ color: '#d1d5db', fontSize: '1.05rem', lineHeight: 1.7, fontFamily: 'serif' }}>
                                               {currentA.improvement}
                                           </div>
                                       </div>
                                   </div>

                                   {/* KNOWLEDGE GAPS SECTION */}
                                   <div ref={gapsRef} style={{ paddingTop: '2rem' }}>
                                       <div style={{ fontSize: '0.75rem', color: '#6b7280', letterSpacing: '0.1em', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                           TOPIC WEAKNESS MAP - ACROSS ALL QUESTIONS
                                       </div>
                                       <div style={{ fontSize: '0.9rem', color: '#9ca3af', marginBottom: '2rem', fontFamily: 'serif' }}>
                                           Knowledge areas that need reinforcement based on the full interview.
                                       </div>

                                       <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
                                           {Object.keys(topicGroups).map(topic => {
                                               const group = topicGroups[topic];
                                               const color = getScoreColor(group.averageScore);
                                               const label = getScoreLabel(group.averageScore);
                                               
                                               return (
                                                   <div key={topic} style={{ 
                                                       background: '#111827', 
                                                       border: '1px solid rgba(255,255,255,0.05)', 
                                                       borderLeft: `3px solid ${color}`,
                                                       borderRadius: '0.5rem', 
                                                       padding: '1.5rem' 
                                                   }}>
                                                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                                           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                               <span style={{ fontSize: '1.2rem', color: '#f3f4f6', fontFamily: 'serif' }}>{topic}</span>
                                                               <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '0.2rem', background: `${color}20`, color: color, fontWeight: 700, letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                                                                   {label}
                                                               </span>
                                                           </div>
                                                           <div style={{ fontSize: '0.8rem', color: '#6b7280', fontFamily: 'monospace' }}>
                                                               {group.questions.length} question{group.questions.length > 1 ? 's' : ''}
                                                           </div>
                                                       </div>
                                                       <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                                           {group.allTags.map(tag => (
                                                               <span key={tag} style={{ 
                                                                   fontSize: '0.85rem', 
                                                                   padding: '0.4rem 1rem', 
                                                                   borderRadius: '2rem', 
                                                                   background: 'transparent', 
                                                                   border: `1px solid ${color}40`,
                                                                   color: color, 
                                                                   fontFamily: 'monospace' 
                                                               }}>
                                                                   {tag}
                                                               </span>
                                                           ))}
                                                           {group.allTags.length === 0 && (
                                                                <span style={{ fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic', fontFamily: 'serif' }}>No specific subtopics recorded</span>
                                                           )}
                                                       </div>
                                                   </div>
                                               );
                                           })}
                                       </div>

                                       {/* Motivational Quote Box */}
                                       <div style={{ 
                                           background: '#111827', 
                                           border: '1px solid rgba(255,255,255,0.05)', 
                                           borderRadius: '0.5rem', 
                                           padding: '2rem',
                                           display: 'flex',
                                           gap: '1.5rem',
                                           alignItems: 'center'
                                       }}>
                                           <div style={{ fontSize: '2.5rem' }}>🚀</div>
                                           <div style={{ flex: 1 }}>
                                               <div style={{ color: '#e2e8f0', fontSize: '1.05rem', fontStyle: 'italic', fontFamily: 'serif', marginBottom: '1rem' }}>
                                                   "Knowledge gaps aren't failures — they're your personalized roadmap to becoming unstoppable."
                                               </div>
                                               <div 
                                                   onClick={handleRestart}
                                                   style={{ 
                                                       color: '#d4a373', 
                                                       fontSize: '0.9rem', 
                                                       fontFamily: 'monospace', 
                                                       cursor: 'pointer',
                                                       display: 'inline-flex',
                                                       alignItems: 'center',
                                                       gap: '0.5rem',
                                                       fontWeight: 600,
                                                       transition: 'opacity 0.2s'
                                                   }}
                                                   onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                                                   onMouseOut={e => e.currentTarget.style.opacity = '1'}
                                               >
                                                   ✨ Feeling ready? Test your skills again ➔
                                               </div>
                                           </div>
                                       </div>
                                   </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Fallback
    return null;
};
