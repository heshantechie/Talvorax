import React, { useState } from 'react';
import { InterviewMode, InterviewConfig, InterviewQuestion, InterviewFeedback } from '../types';
import { generateInterviewQuestions } from '../services/gemini';
import { InterviewSetupForm } from './InterviewSetup';
import { InterviewSession } from './InterviewSession';

type CoachView = 'mode_select' | 'setup' | 'loading' | 'session' | 'results';

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
    const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
    const [loadingError, setLoadingError] = useState('');

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

    const handleFinish = (interviewFeedback: InterviewFeedback, bookmarks: number[]) => {
        setFeedback(interviewFeedback);
        setBookmarkedIds(bookmarks);
        setView('results');
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

    // ─── Results / Analysis ───
    if (view === 'results' && feedback) {
        const bookmarkedQuestions = questions.filter(q => bookmarkedIds.includes(q.id));

        return (
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Interview Analysis</h1>
                    <p style={{ color: '#64748b' }}>Here's how you performed in your mock interview.</p>
                </div>

                {/* Score Overview */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    {[
                        { label: 'Overall', value: feedback.overallScore, max: 100, color: '#6366f1' },
                        { label: 'Communication', value: feedback.communicationRating, max: 10, color: '#10b981' },
                        { label: 'Technical', value: feedback.technicalRating, max: 10, color: '#f59e0b' },
                        { label: 'Problem Solving', value: feedback.problemSolvingRating, max: 10, color: '#ec4899' }
                    ].map((item, i) => (
                        <div key={i} style={{
                            background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '1rem', padding: '1.25rem', textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: '2rem', fontWeight: 800, color: item.color,
                                marginBottom: '0.25rem'
                            }}>
                                {item.value}<span style={{ fontSize: '0.9rem', color: '#64748b' }}>/{item.max}</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{item.label}</div>
                        </div>
                    ))}
                </div>

                {/* Key Takeaways */}
                <div style={{
                    background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem'
                }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        💡 Key Takeaways
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {feedback.keyTakeaways.map((t, i) => (
                            <li key={i} style={{
                                padding: '0.625rem 1rem', background: 'rgba(15,23,42,0.5)',
                                borderRadius: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1',
                                borderLeft: '3px solid #6366f1'
                            }}>
                                {t}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Focus Topics */}
                {feedback.focusTopics.length > 0 && (
                    <div style={{
                        background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem'
                    }}>
                        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>📚 Topics to Focus On</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {feedback.focusTopics.map((t, i) => (
                                <span key={i} className="topic-tag">{t}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bookmarked Questions */}
                {bookmarkedQuestions.length > 0 && (
                    <div style={{
                        background: 'rgba(250,204,21,0.05)', border: '1px solid rgba(250,204,21,0.15)',
                        borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem'
                    }}>
                        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', color: '#fbbf24' }}>
                            ⭐ Bookmarked Questions
                        </h3>
                        {bookmarkedQuestions.map((q, i) => {
                            const sa = feedback.suggestedAnswers.find(a => a.question === q.question);
                            return (
                                <div key={i} style={{
                                    padding: '1rem', background: 'rgba(15,23,42,0.5)',
                                    borderRadius: '0.75rem', marginBottom: '0.75rem',
                                    borderLeft: '3px solid #fbbf24'
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#f1f5f9' }}>
                                        Q{q.id}: {q.question}
                                    </div>
                                    {sa && (
                                        <>
                                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                                                <strong>Your answer:</strong> {sa.userResponse || '(No answer)'}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#10b981' }}>
                                                <strong>Suggested improvement:</strong> {sa.improvement}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Detailed Q&A Analysis */}
                <div style={{
                    background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem'
                }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>📝 Question-by-Question Analysis</h3>
                    {feedback.suggestedAnswers.map((sa, i) => (
                        <div key={i} style={{
                            padding: '1rem',
                            background: 'rgba(15,23,42,0.5)',
                            borderRadius: '0.75rem',
                            marginBottom: '0.75rem',
                            borderLeft: `3px solid ${bookmarkedIds.includes(questions[i]?.id) ? '#fbbf24' : '#334155'}`
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#e2e8f0', fontSize: '0.95rem' }}>
                                {sa.question}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                <span className="topic-tag">{sa.topicMatch}</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
                                <strong style={{ color: '#cbd5e1' }}>Your answer:</strong> {sa.userResponse || '(Skipped / No answer)'}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#10b981' }}>
                                <strong>Better answer:</strong> {sa.improvement}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Restart Button */}
                <div style={{ textAlign: 'center' }}>
                    <button className="start-interview-btn" onClick={handleRestart}>
                        🔄 Start Another Interview
                    </button>
                </div>
            </div>
        );
    }

    // Fallback
    return null;
};
