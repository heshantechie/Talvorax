import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InterviewConfig, InterviewQuestion, InterviewFeedback } from '../types';
import { generateInterviewAnalysis } from '../services/gemini';
import { SpeechService, speakText } from '../services/speechService';

interface InterviewSessionProps {
    config: InterviewConfig;
    questions: InterviewQuestion[];
    onFinish: (feedback: InterviewFeedback, bookmarkedIds: number[]) => void;
    onBack: () => void;
}

export const InterviewSession: React.FC<InterviewSessionProps> = ({ config, questions, onFinish, onBack }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(questions[0]?.timeAllocationSeconds || 60);
    const [answers, setAnswers] = useState<{ [id: number]: string }>({});
    const [bookmarked, setBookmarked] = useState<number[]>([]);
    const [skipped, setSkipped] = useState<number[]>([]);
    const [transcript, setTranscript] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [showLanguageWarning, setShowLanguageWarning] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false);
    const [questionStatus, setQuestionStatus] = useState<('pending' | 'answered' | 'skipped')[]>(
        questions.map(() => 'pending')
    );

    const speechServiceRef = useRef<SpeechService>(new SpeechService());
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasSpokenRef = useRef<Set<number>>(new Set());

    const currentQuestion = questions[currentIndex];
    const totalQuestions = questions.length;
    const isLastQuestion = currentIndex === totalQuestions - 1;

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // ─── Timer ───
    useEffect(() => {
        if (!currentQuestion || isSpeaking || isFinishing) return;

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // Time's up — auto advance
                    handleNextQuestion();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentIndex, isSpeaking, isFinishing]);

    // ─── Speak question when it changes ───
    useEffect(() => {
        if (!currentQuestion) return;

        // Don't re-speak a question
        if (hasSpokenRef.current.has(currentQuestion.id)) {
            startRecording();
            return;
        }

        hasSpokenRef.current.add(currentQuestion.id);
        setIsSpeaking(true);
        setTranscript('');

        speakText(currentQuestion.question, () => {
            setIsSpeaking(false);
            startRecording();
        });
    }, [currentIndex]);

    const startRecording = async () => {
        try {
            await speechServiceRef.current.startRecording(
                (text) => setTranscript(text),
                () => showLanguageAlert()
            );
            setIsRecording(true);
        } catch (err) {
            console.error('Recording start failed:', err);
        }
    };

    const stopRecording = async (): Promise<string> => {
        try {
            const finalText = await speechServiceRef.current.stopRecording();
            setIsRecording(false);
            return finalText;
        } catch (err) {
            setIsRecording(false);
            return transcript;
        }
    };

    const showLanguageAlert = () => {
        setShowLanguageWarning(true);
        setTimeout(() => setShowLanguageWarning(false), 4000);
    };

    const handleNextQuestion = useCallback(async () => {
        if (timerRef.current) clearInterval(timerRef.current);

        // Save current answer
        const finalTranscript = await stopRecording();
        window.speechSynthesis.cancel();

        if (finalTranscript.trim()) {
            setAnswers(prev => ({ ...prev, [currentQuestion.id]: finalTranscript }));
            setQuestionStatus(prev => {
                const n = [...prev];
                n[currentIndex] = 'answered';
                return n;
            });
        } else {
            // If no answer, it's a skip
            setSkipped(prev => [...prev, currentQuestion.id]);
            setQuestionStatus(prev => {
                const n = [...prev];
                n[currentIndex] = 'skipped';
                return n;
            });
        }

        if (isLastQuestion) {
            finishInterview(finalTranscript);
        } else {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            setTimeLeft(questions[nextIdx]?.timeAllocationSeconds || 60);
            setTranscript('');
        }
    }, [currentIndex, transcript, currentQuestion]);

    const handleSkip = useCallback(async () => {
        if (timerRef.current) clearInterval(timerRef.current);

        await stopRecording();
        window.speechSynthesis.cancel();

        setSkipped(prev => [...prev, currentQuestion.id]);
        setQuestionStatus(prev => {
            const n = [...prev];
            n[currentIndex] = 'skipped';
            return n;
        });

        if (isLastQuestion) {
            finishInterview('');
        } else {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            setTimeLeft(questions[nextIdx]?.timeAllocationSeconds || 60);
            setTranscript('');
        }
    }, [currentIndex, currentQuestion]);

    const toggleBookmark = () => {
        setBookmarked(prev =>
            prev.includes(currentQuestion.id)
                ? prev.filter(id => id !== currentQuestion.id)
                : [...prev, currentQuestion.id]
        );
    };

    const finishInterview = async (lastTranscript: string) => {
        setIsFinishing(true);
        if (timerRef.current) clearInterval(timerRef.current);

        const finalAnswers = { ...answers };
        if (lastTranscript.trim()) {
            finalAnswers[currentQuestion.id] = lastTranscript;
        }

        try {
            const feedback = await generateInterviewAnalysis(
                questions, finalAnswers, bookmarked, skipped, config
            );
            onFinish(feedback, bookmarked);
        } catch (err) {
            console.error('Failed to generate analysis:', err);
            onFinish({
                overallScore: 0,
                communicationRating: 0,
                technicalRating: 0,
                problemSolvingRating: 0,
                keyTakeaways: ['Failed to generate analysis. Please try again.'],
                focusTopics: [],
                suggestedAnswers: []
            }, bookmarked);
        }
    };

    // ─── Timer visual calculations ───
    const maxTime = currentQuestion?.timeAllocationSeconds || 60;
    const circumference = 2 * Math.PI * 28;
    const dashOffset = circumference - (timeLeft / maxTime) * circumference;

    const timerClass = timeLeft <= 10 ? 'timer-danger' : timeLeft <= 20 ? 'timer-warning' : '';

    if (isFinishing) {
        return (
            <div className="interview-session-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spin-animation" style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>⚙️</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Analyzing Your Interview...</h2>
                    <p style={{ color: '#64748b' }}>Our AI is evaluating your responses. This may take a moment.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="interview-session-container">
            {/* Language Warning Toast */}
            {showLanguageWarning && (
                <div className="language-warning">
                    ⚠️ Please speak in English only. Other languages are not supported.
                </div>
            )}

            {/* ─── Header ─── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 2rem',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(15,23,42,0.8)'
            }}>
                {/* Left: App name + role + date */}
                <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6366f1', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        HIREREADY AI
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.125rem' }}>
                        Role: {config.domain || config.jobRole || config.companyName || 'Interview'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Date: {dateStr}</div>
                </div>

                {/* Center: Timer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="recording-dot"></div>
                    <div className={`interview-timer-circle ${timerClass}`}>
                        <svg viewBox="0 0 60 60">
                            <circle className="timer-bg" cx="30" cy="30" r="28" />
                            <circle
                                className="timer-progress"
                                cx="30" cy="30" r="28"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                            />
                        </svg>
                        <span style={{ position: 'relative', zIndex: 1, fontSize: '1rem' }}>
                            {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                        </span>
                    </div>
                </div>

                {/* Right: User name + question progress */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{config.candidateName || 'Candidate'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.375rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                            Question {currentIndex + 1}/{totalQuestions}
                        </span>
                    </div>
                    <div className="question-progress" style={{ justifyContent: 'flex-end', marginTop: '0.375rem' }}>
                        {questions.map((_, i) => (
                            <div
                                key={i}
                                className={`question-rect ${i === currentIndex ? 'active' :
                                    questionStatus[i] === 'answered' ? 'filled' :
                                        questionStatus[i] === 'skipped' ? 'skipped' : ''
                                    }`}
                                title={`Q${i + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Main Chat Area ─── */}
            <div className="interview-chat-area" style={{ flex: 1 }}>
                {/* Bookmark Star */}
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                        className={`bookmark-star ${bookmarked.includes(currentQuestion.id) ? 'bookmarked' : ''}`}
                        onClick={toggleBookmark}
                        title="Bookmark this question for review"
                    >
                        {bookmarked.includes(currentQuestion.id) ? '★' : '☆'}
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '2rem', flex: 1, alignItems: 'flex-start' }}>
                    {/* Left: AI Question */}
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.25rem'
                            }}>
                                🤖
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>AI Interviewer</div>
                                <div style={{ fontSize: '0.75rem', color: isSpeaking ? '#10b981' : '#64748b' }}>
                                    {isSpeaking ? 'Asking now...' : 'Listening...'}
                                </div>
                            </div>
                        </div>

                        <div className="ai-question-card">
                            <div className="question-text">
                                "{currentQuestion.question}"
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                {currentQuestion.tags.map((tag, i) => (
                                    <span key={i} className="topic-tag">{tag}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: User Transcript */}
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', justifyContent: 'flex-end' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', textAlign: 'right' }}>{config.candidateName || 'You'}</div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: isRecording ? '#10b981' : '#64748b',
                                    textAlign: 'right'
                                }}>
                                    {isRecording ? 'Recording...' : isSpeaking ? 'Waiting...' : 'Idle'}
                                </div>
                            </div>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.25rem'
                            }}>
                                👤
                            </div>
                        </div>

                        <div className="user-transcript-card">
                            {transcript || (
                                <span style={{ color: '#475569', fontStyle: 'italic' }}>
                                    {isSpeaking ? 'Listen to the question...' : isRecording ? 'Start speaking your answer...' : 'Waiting...'}
                                </span>
                            )}
                        </div>

                        {/* Recording indicator bar */}
                        {isRecording && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                marginTop: '0.75rem', justifyContent: 'flex-end'
                            }}>
                                <div className="recording-dot" style={{ width: '8px', height: '8px' }}></div>
                                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>REC</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Bottom Bar ─── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 2rem',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(15,23,42,0.6)'
            }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                </div>

                <button className="skip-btn" onClick={handleSkip}>
                    {isLastQuestion ? 'Finish Interview →' : 'Skip Question →'}
                </button>
            </div>
        </div>
    );
};
