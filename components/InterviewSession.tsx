import React, { useState, useEffect, useRef } from 'react';
import { InterviewConfig, InterviewQuestion, InterviewFeedback } from '../types';
import { generateInterviewAnalysis } from '../services/gemini';
import { SpeechService, speakText } from '../services/speechService';

interface InterviewSessionProps {
    config: InterviewConfig;
    questions: InterviewQuestion[];
    onFinish: (feedback: InterviewFeedback, bookmarkedIds: number[], durationSecs: number, sessionAnswers: Record<number, string>) => void;
    onBack: () => void;
}

export const InterviewSession: React.FC<InterviewSessionProps> = ({ config, questions, onFinish, onBack: _onBack }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(questions[0]?.timeAllocationSeconds || 60);
    const [_answers, setAnswers] = useState<{ [id: number]: string }>({}); // kept for future UI rendering
    const answersRef = useRef<{ [id: number]: string }>({});
    const [bookmarked, setBookmarked] = useState<number[]>([]);
    const bookmarkedRef = useRef<number[]>([]);
    const [_skipped, setSkipped] = useState<number[]>([]); // kept for future UI rendering
    const skippedRef = useRef<number[]>([]);
    const [transcript, setTranscript] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [showLanguageWarning, setShowLanguageWarning] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false);
    const totalTimeSpentRef = useRef(0);
    const questionStartTimeRef = useRef(Date.now());
    const [questionStatus, setQuestionStatus] = useState<('pending' | 'answered' | 'skipped')[]>(
        questions.map(() => 'pending')
    );

    const speechServiceRef = useRef<SpeechService>(new SpeechService());
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

        let isActive = true;
        setIsSpeaking(true);
        setTranscript('');

        const textToSpeak = currentIndex === 0 
            ? `Hello ${config.candidateName || 'there'}. Let's start the interview. ${currentQuestion.question}` 
            : currentQuestion.question;

        speakText(textToSpeak, () => {
            if (!isActive) return;
            setIsSpeaking(false);
            setTimeout(() => {
                if (!isActive) return;
                startRecording();
            }, 1000);
        });

        return () => {
            isActive = false;
            window.speechSynthesis.cancel();
        };
    }, [currentIndex]);

    const startRecording = async () => {
        questionStartTimeRef.current = Date.now();
        setTranscript(''); // Hard reset transcript right before recording begins
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

    const toggleBookmark = () => {
        setBookmarked(prev => {
            const next = prev.includes(currentQuestion.id)
                ? prev.filter(id => id !== currentQuestion.id)
                : [...prev, currentQuestion.id];
            bookmarkedRef.current = next;
            return next;
        });
    };

    const finishInterview = async () => {
        setIsFinishing(true);
        if (timerRef.current) clearInterval(timerRef.current);

        speakText("That concludes our interview. Have a great day!");

        try {
            const feedback = await generateInterviewAnalysis(
                questions, answersRef.current, bookmarkedRef.current, skippedRef.current, config
            );
            onFinish(feedback, bookmarkedRef.current, totalTimeSpentRef.current, answersRef.current);
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
            }, bookmarkedRef.current, totalTimeSpentRef.current, answersRef.current);
        }
    };

    const handleNextQuestion = async () => {
        if (timerRef.current) clearInterval(timerRef.current);

        const maxTime = currentQuestion?.timeAllocationSeconds || 60;
        let timeSpent = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
        if (timeSpent < 0) timeSpent = 0;
        if (timeSpent > maxTime) timeSpent = maxTime;
        totalTimeSpentRef.current += timeSpent;

        // Save current answer
        const finalTranscript = await stopRecording();
        setTranscript('');
        window.speechSynthesis.cancel();

        if (finalTranscript.trim()) {
            answersRef.current[currentQuestion.id] = finalTranscript;
            setAnswers({ ...answersRef.current });
            setQuestionStatus(prev => {
                const n = [...prev];
                n[currentIndex] = 'answered';
                return n;
            });
        } else {
            // If no answer, it's a skip
            skippedRef.current.push(currentQuestion.id);
            setSkipped([...skippedRef.current]);
            setQuestionStatus(prev => {
                const n = [...prev];
                n[currentIndex] = 'skipped';
                return n;
            });
        }

        if (isLastQuestion) {
            finishInterview();
        } else {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            setTimeLeft(questions[nextIdx]?.timeAllocationSeconds || 60);
        }
    };

    const handleSkip = async () => {
        if (timerRef.current) clearInterval(timerRef.current);

        const maxTime = currentQuestion?.timeAllocationSeconds || 60;
        let timeSpent = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
        if (timeSpent < 0) timeSpent = 0;
        if (timeSpent > maxTime) timeSpent = maxTime;
        totalTimeSpentRef.current += timeSpent;

        await stopRecording();
        setTranscript('');
        window.speechSynthesis.cancel();

        skippedRef.current.push(currentQuestion.id);
        setSkipped([...skippedRef.current]);
        setQuestionStatus(prev => {
            const n = [...prev];
            n[currentIndex] = 'skipped';
            return n;
        });

        if (isLastQuestion) {
            finishInterview();
        } else {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            setTimeLeft(questions[nextIdx]?.timeAllocationSeconds || 60);
        }
    };

    // ─── Timer visual calculations ───
    const maxTime = currentQuestion?.timeAllocationSeconds || 60;
    const circumference = 2 * Math.PI * 28;
    const dashOffset = circumference - (timeLeft / maxTime) * circumference;

    const timerClass = timeLeft <= 10 ? 'timer-danger' : timeLeft <= 20 ? 'timer-warning' : '';

    if (isFinishing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[85vh] bg-gray-50/50 p-6 rounded-2xl">
                <div className="bg-white text-center p-12 rounded-2xl border border-green-100 shadow-xl max-w-[500px] w-full">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-3xl font-bold mb-3 text-gray-900">Interview Complete!</h2>
                    <p className="text-lg text-green-600 mb-10 font-semibold">That concludes our interview. Have a great day!</p>
                    
                    <div className="animate-spin flex justify-center text-5xl mb-6 mx-auto w-fit">⚙️</div>
                    <p className="text-gray-500 text-sm">Our AI is evaluating your responses and generating personalized insights...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-[90vh] bg-gray-50 rounded-2xl overflow-hidden shadow-sm border border-gray-100 mt-2 mx-auto max-w-[1400px]">
            {/* Language Warning Toast */}
            {showLanguageWarning && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-full shadow-lg font-medium text-sm animate-bounce">
                    ⚠️ Please speak in English only. Other languages are not supported.
                </div>
            )}

            {/* ─── Header ─── */}
            <div className="flex items-center justify-between px-6 lg:px-10 py-5 border-b border-green-100 bg-white relative z-10">
                {/* Left: App name + role + date */}
                <div>
                    <div className="text-xs font-bold text-green-600 tracking-widest uppercase">
                        HIREREADY AI
                    </div>
                    <div className="font-bold text-lg text-gray-900 mt-1">
                        Role: {config.domain || config.jobRole || config.companyName || 'Interview'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 font-medium">Date: {dateStr}</div>
                </div>

                {/* Center: Timer */}
                <div className="flex items-center gap-4">
                    {isRecording && <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse outline outline-4 outline-red-100"></div>}
                    <div className={`relative flex items-center justify-center w-[60px] h-[60px] rounded-full ${timerClass}`}>
                        <svg viewBox="0 0 60 60" className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="30" cy="30" r="28" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                            <circle
                                cx="30" cy="30" r="28" fill="none" 
                                stroke={timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f59e0b' : '#16A34A'} 
                                strokeWidth="4"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                className="transition-all duration-1000 ease-linear"
                                strokeLinecap="round"
                            />
                        </svg>
                        <span className="relative z-10 text-[15px] font-bold text-gray-800">
                            {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                        </span>
                    </div>
                </div>

                {/* Right: User name + question progress */}
                <div className="text-right">
                    <div className="font-bold text-base text-gray-900">{config.candidateName || 'Candidate'}</div>
                    <div className="flex items-center gap-2 justify-end mt-1.5">
                        <span className="text-sm font-semibold text-gray-500">
                            Question {currentIndex + 1}/{totalQuestions}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 justify-end mt-2">
                        {questions.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 w-6 rounded-full transition-all ${i === currentIndex ? 'bg-green-500 w-8' :
                                    questionStatus[i] === 'answered' ? 'bg-green-200' :
                                        questionStatus[i] === 'skipped' ? 'bg-gray-300' : 'bg-gray-200'
                                    }`}
                                title={`Q${i + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── Main Chat Area ─── */}
            <div className="flex-1 w-full flex flex-col overflow-y-auto p-4 md:p-10 custom-scrollbar relative bg-gray-50/50">
                <div className="w-full max-w-5xl mx-auto relative">
                    {/* Bookmark Star */}
                    <div className="absolute -left-2 top-0 z-10">
                        <button
                            className={`text-3xl transition-transform hover:scale-110 ${bookmarked.includes(currentQuestion.id) ? 'text-amber-400 drop-shadow-sm' : 'text-gray-300 hover:text-amber-200'}`}
                            onClick={toggleBookmark}
                            title="Bookmark this question for review"
                        >
                            {bookmarked.includes(currentQuestion.id) ? '★' : '☆'}
                        </button>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 w-full px-2 lg:px-6 mt-2">
                        {/* Left: AI Question */}
                        <div className="w-full lg:w-1/2 flex flex-col">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-xl shadow-sm border border-green-200 text-white shrink-0">
                                    🤖
                                </div>
                                <div>
                                    <div className="font-bold text-base text-gray-900">AI Interviewer</div>
                                    <div className={`text-xs ${isSpeaking ? 'text-green-600 font-semibold animate-pulse' : 'text-gray-500'}`}>
                                        {isSpeaking ? 'Asking now...' : 'Listening...'}
                                    </div>
                                </div>
                            </div>

                            {currentIndex === 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 flex gap-4 items-center shadow-sm">
                                    <span className="text-4xl drop-shadow-sm animate-bounce" style={{ animationDuration: '2s' }}>👋</span>
                                    <span className="text-base text-green-900 font-medium leading-relaxed">
                                        Hello {config.candidateName || 'there'}. Let's start the interview.
                                    </span>
                                </div>
                            )}

                            <div className="bg-white border border-green-100 rounded-2xl p-6 shadow-sm mb-4">
                                <div className="text-lg text-gray-800 font-medium leading-relaxed">
                                    "{currentQuestion.question}"
                                </div>
                                <div className="flex gap-2 mt-4 flex-wrap">
                                    {currentQuestion.tags.map((tag, i) => (
                                        <span key={i} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-200">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right: User Transcript */}
                        <div className="w-full lg:w-1/2 flex flex-col mt-4 lg:mt-0">
                            <div className="flex items-center gap-3 mb-4 justify-end">
                                <div>
                                    <div className="font-bold text-base text-gray-900 text-right">{config.candidateName || 'You'}</div>
                                    <div className={`text-xs text-right ${isRecording ? 'text-green-600 font-semibold animate-pulse' : isSpeaking ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {isRecording ? 'Recording...' : isSpeaking ? 'Waiting...' : 'Idle'}
                                    </div>
                                </div>
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center text-xl shadow-sm text-gray-600">
                                    👤
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-gray-700 leading-relaxed min-h-[140px] relative w-full">
                                {transcript || (
                                    <span className="text-gray-400 font-medium italic">
                                        {isSpeaking ? 'Listen to the question...' : isRecording ? 'Start speaking your answer...' : 'Waiting...'}
                                    </span>
                                )}
                                
                                {/* Recording indicator inside card */}
                                {isRecording && (
                                    <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 shadow-sm">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                                        <span className="text-xs text-red-600 font-bold tracking-widest">REC</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Bottom Bar ─── */}
            <div className="flex items-center justify-between px-6 lg:px-10 py-5 border-t border-green-100 bg-white relative z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                <div className="flex gap-3 items-center">
                    <button 
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-gray-100 text-gray-600 border border-gray-200 shadow-sm outline-none focus:ring-2 focus:ring-gray-200"
                        onClick={handleSkip} 
                    >
                        Skip Question
                    </button>
                </div>

                <button 
                    onClick={handleNextQuestion}
                    className="px-8 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 shadow-[0_4px_12px_rgba(22,163,74,0.3)] disabled:opacity-50 flex items-center gap-2"
                    style={{ background: 'linear-gradient(90deg,#16A34A,#22C55E)' }}
                >
                    {isLastQuestion ? 'Submit & Finish ✔' : 'Submit & Next →'}
                </button>
            </div>
        </div>
    );
};
