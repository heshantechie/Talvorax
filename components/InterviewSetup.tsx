import React, { useState, useRef } from 'react';
import { InterviewConfig, InterviewMode, ExperienceLevel, InterviewLimitType } from '../types';

// ─── Data Constants ───

const DOMAINS = [
    'Frontend Development', 'Backend Development', 'Full Stack Development',
    'Data Science', 'Machine Learning', 'DevOps', 'Cloud Computing',
    'Mobile Development', 'Cybersecurity', 'Database Administration',
    'System Design', 'Embedded Systems', 'Blockchain', 'Game Development',
    'Quality Assurance', 'UI/UX Design', 'Networking', 'AI/NLP'
];

const DOMAIN_TOPICS: { [key: string]: string[] } = {
    'Frontend Development': ['React', 'Angular', 'Vue.js', 'HTML/CSS', 'JavaScript', 'TypeScript', 'Next.js', 'Performance Optimization', 'Web APIs', 'State Management'],
    'Backend Development': ['Node.js', 'Python/Django', 'Java/Spring Boot', 'REST APIs', 'GraphQL', 'Microservices', 'Authentication', 'Databases', 'Caching', 'Message Queues'],
    'Full Stack Development': ['MERN Stack', 'MEAN Stack', 'System Architecture', 'API Design', 'Database Design', 'Deployment', 'Testing', 'Security'],
    'Data Science': ['Python', 'Pandas/NumPy', 'Data Visualization', 'Statistics', 'SQL', 'Feature Engineering', 'A/B Testing', 'ETL Pipelines'],
    'Machine Learning': ['Supervised Learning', 'Unsupervised Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Model Deployment', 'TensorFlow/PyTorch', 'MLOps'],
    'DevOps': ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Azure', 'GCP', 'Terraform', 'Linux', 'Monitoring', 'Jenkins'],
    'Cloud Computing': ['AWS Services', 'Azure Services', 'GCP Services', 'Serverless', 'Cloud Architecture', 'IAM', 'Networking', 'Cost Optimization'],
    'Mobile Development': ['React Native', 'Flutter', 'iOS/Swift', 'Android/Kotlin', 'Mobile UI', 'Push Notifications', 'App Security', 'Performance'],
    'Cybersecurity': ['Network Security', 'Application Security', 'Cryptography', 'Threat Modeling', 'Penetration Testing', 'OWASP', 'Incident Response', 'Compliance'],
    'Database Administration': ['SQL', 'NoSQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Query Optimization', 'Replication', 'Sharding', 'Backup & Recovery'],
    'System Design': ['Scalability', 'Load Balancing', 'Caching', 'Database Design', 'Distributed Systems', 'API Gateway', 'Message Queues', 'CDN'],
    'Embedded Systems': ['C/C++', 'RTOS', 'Microcontrollers', 'IoT', 'Protocols', 'Firmware', 'Signal Processing', 'Hardware Interfaces'],
    'Blockchain': ['Ethereum', 'Solidity', 'Smart Contracts', 'DeFi', 'Web3', 'Consensus', 'Cryptography', 'NFTs'],
    'Game Development': ['Unity', 'Unreal Engine', 'C++', 'Game Physics', '3D Math', 'Rendering', 'Multiplayer', 'Game AI'],
    'Quality Assurance': ['Manual Testing', 'Automation', 'Selenium', 'Cypress', 'Performance Testing', 'Test Strategy', 'CI/CD', 'API Testing'],
    'UI/UX Design': ['User Research', 'Wireframing', 'Prototyping', 'Figma', 'Design Systems', 'Accessibility', 'Responsive Design', 'Usability Testing'],
    'Networking': ['TCP/IP', 'DNS', 'HTTP/HTTPS', 'Firewalls', 'VPN', 'Load Balancing', 'SDN', 'Wireless Networks'],
    'AI/NLP': ['Transformers', 'BERT/GPT', 'Text Classification', 'Named Entity Recognition', 'Sentiment Analysis', 'RAG', 'LLM Fine-tuning', 'Prompt Engineering']
};

const MNC_COMPANIES = [
    'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta (Facebook)', 'Netflix',
    'TCS', 'Infosys', 'Wipro', 'HCL Technologies', 'Tech Mahindra', 'Cognizant',
    'Accenture', 'IBM', 'Oracle', 'Adobe', 'Salesforce', 'SAP',
    'Deloitte', 'Capgemini', 'PwC', 'EY', 'KPMG',
    'Uber', 'Airbnb', 'Spotify', 'Twitter/X', 'LinkedIn',
    'Goldman Sachs', 'JP Morgan', 'Morgan Stanley', 'Flipkart', 'Swiggy', 'Zomato',
    'Zoho', 'Freshworks', 'Stripe', 'PayPal', 'Samsung', 'Intel', 'NVIDIA',
    'Other'
];

const TECHNICAL_TOPICS = [
    'Data Structures', 'Algorithms', 'System Design', 'OOP', 'Database',
    'OS Concepts', 'Networking', 'API Design', 'Cloud', 'Security', 'Custom'
];

const BEHAVIORAL_TOPICS = [
    'Leadership', 'Teamwork', 'Conflict Resolution', 'Problem Solving',
    'Time Management', 'Communication', 'Adaptability', 'Work Ethic', 'Custom'
];

// ─── PDF text extraction for resume upload ───
async function extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text.trim();
}

interface InterviewSetupProps {
    mode: InterviewMode;
    onStart: (config: InterviewConfig) => void;
    onBack: () => void;
}

export const InterviewSetupForm: React.FC<InterviewSetupProps> = ({ mode, onStart, onBack }) => {
    // Common state
    const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('fresher');
    const [yearsOfExperience, setYearsOfExperience] = useState<number>(1);
    const [limitType, setLimitType] = useState<InterviewLimitType>('questions');
    const [durationMinutes, setDurationMinutes] = useState<5 | 10>(5);
    const [numberOfQuestions, setNumberOfQuestions] = useState<number>(5);
    const [candidateName, setCandidateName] = useState('');

    // Domain mode state
    const [domain, setDomain] = useState('');
    const [topic, setTopic] = useState('');

    // JD mode state
    const [jobDescription, setJobDescription] = useState('');

    // Resume mode state
    const [resumeText, setResumeText] = useState('');
    const [resumeFileName, setResumeFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Company mode state
    const [companyName, setCompanyName] = useState('');
    const [customCompanyName, setCustomCompanyName] = useState('');

    // Previous experience state
    const [previousCompany, setPreviousCompany] = useState('');
    const [jobRole, setJobRole] = useState('');
    const [selectedTechTopics, setSelectedTechTopics] = useState<string[]>([]);
    const [selectedBehavioralTopics, setSelectedBehavioralTopics] = useState<string[]>([]);
    const [customTechnicalTopic, setCustomTechnicalTopic] = useState('');
    const [customBehavioralTopic, setCustomBehavioralTopic] = useState('');
    const [previousQuestions, setPreviousQuestions] = useState('');
    const [previousAnswers, setPreviousAnswers] = useState('');

    const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setResumeFileName(file.name);
        try {
            const text = await extractTextFromPDF(file);
            setResumeText(text);
        } catch (err) {
            console.error('Failed to parse resume:', err);
            setResumeText('');
            setResumeFileName('');
        }
    };

    const toggleTechTopic = (t: string) => {
        setSelectedTechTopics(prev =>
            prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
        );
    };

    const toggleBehavioralTopic = (t: string) => {
        setSelectedBehavioralTopics(prev =>
            prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
        );
    };

    const isValid = (): boolean => {
        if (!candidateName.trim()) return false;
        switch (mode) {
            case InterviewMode.DOMAIN_BASED: return !!domain && !!topic;
            case InterviewMode.JD_BASED: return !!jobDescription.trim();
            case InterviewMode.RESUME_BASED: return !!resumeText.trim();
            case InterviewMode.COMPANY_SPECIFIC:
                return companyName === 'Other' ? !!customCompanyName.trim() : !!companyName;
            case InterviewMode.PREVIOUS_EXPERIENCE:
                return !!previousCompany.trim() && !!jobRole.trim();
            default: return false;
        }
    };

    const handleStart = () => {
        const config: InterviewConfig = {
            mode,
            experienceLevel,
            yearsOfExperience: experienceLevel === 'experienced' ? yearsOfExperience : undefined,
            limitType,
            durationMinutes: limitType === 'duration' ? durationMinutes : undefined,
            numberOfQuestions: limitType === 'questions' ? numberOfQuestions : undefined,
            candidateName: candidateName.trim(),
            domain,
            topic,
            jobDescription,
            resumeText,
            companyName: companyName === 'Other' ? customCompanyName : companyName,
            previousCompany,
            jobRole,
            technicalTopics: selectedTechTopics.filter(t => t !== 'Custom'),
            behavioralTopics: selectedBehavioralTopics.filter(t => t !== 'Custom'),
            customTechnicalTopic: selectedTechTopics.includes('Custom') ? customTechnicalTopic : undefined,
            customBehavioralTopic: selectedBehavioralTopics.includes('Custom') ? customBehavioralTopic : undefined,
            previousQuestions,
            previousAnswers
        };
        onStart(config);
    };

    const getModeTitle = () => {
        switch (mode) {
            case InterviewMode.DOMAIN_BASED: return 'Domain Based Interview';
            case InterviewMode.JD_BASED: return 'Job Description Based Interview';
            case InterviewMode.RESUME_BASED: return 'Resume Based Interview';
            case InterviewMode.COMPANY_SPECIFIC: return 'Company Specific Interview';
            case InterviewMode.PREVIOUS_EXPERIENCE: return 'Previous Interview Experience';
            default: return 'Interview Setup';
        }
    };

    const getModeIcon = () => {
        switch (mode) {
            case InterviewMode.DOMAIN_BASED: return '🎯';
            case InterviewMode.JD_BASED: return '📋';
            case InterviewMode.RESUME_BASED: return '📄';
            case InterviewMode.COMPANY_SPECIFIC: return '🏢';
            case InterviewMode.PREVIOUS_EXPERIENCE: return '🔄';
            default: return '💼';
        }
    };

    // ─── Common UI sections ───

    const renderCandidateName = () => (
        <div className="setup-field-group">
            <label>Your Name</label>
            <input
                type="text"
                className="setup-input"
                placeholder="Enter your name"
                value={candidateName}
                onChange={e => setCandidateName(e.target.value)}
            />
        </div>
    );

    const renderExperienceLevel = () => (
        <div className="setup-field-group">
            <label>Experience Level</label>
            <div className="toggle-group">
                <button
                    className={`toggle-option ${experienceLevel === 'fresher' ? 'active' : ''}`}
                    onClick={() => setExperienceLevel('fresher')}
                >
                    🎓 Fresher
                </button>
                <button
                    className={`toggle-option ${experienceLevel === 'experienced' ? 'active' : ''}`}
                    onClick={() => setExperienceLevel('experienced')}
                >
                    💼 Experienced
                </button>
            </div>
            {experienceLevel === 'experienced' && (
                <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem', display: 'block' }}>
                        Years of Experience
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={30}
                        className="setup-input"
                        style={{ width: '120px' }}
                        value={yearsOfExperience}
                        onChange={e => setYearsOfExperience(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                    />
                </div>
            )}
        </div>
    );

    const renderLimitType = () => (
        <div className="setup-field-group">
            <label>Interview Length</label>
            <div className="toggle-group">
                <button
                    className={`toggle-option ${limitType === 'duration' ? 'active' : ''}`}
                    onClick={() => setLimitType('duration')}
                >
                    ⏱️ Duration
                </button>
                <button
                    className={`toggle-option ${limitType === 'questions' ? 'active' : ''}`}
                    onClick={() => setLimitType('questions')}
                >
                    📝 No. of Questions
                </button>
            </div>

            {limitType === 'duration' && (
                <div style={{ marginTop: '0.75rem' }}>
                    <div className="toggle-group" style={{ maxWidth: '260px' }}>
                        <button
                            className={`toggle-option ${durationMinutes === 5 ? 'active' : ''}`}
                            onClick={() => setDurationMinutes(5)}
                        >
                            5 min
                        </button>
                        <button
                            className={`toggle-option ${durationMinutes === 10 ? 'active' : ''}`}
                            onClick={() => setDurationMinutes(10)}
                        >
                            10 min
                        </button>
                    </div>
                </div>
            )}

            {limitType === 'questions' && (
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                        type="number"
                        min={3}
                        max={10}
                        className="question-count-input"
                        value={numberOfQuestions}
                        onChange={e => {
                            const v = parseInt(e.target.value) || 3;
                            setNumberOfQuestions(Math.max(3, Math.min(10, v)));
                        }}
                    />
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>questions (3–10)</span>
                </div>
            )}

            <div className="setup-note" style={{ marginTop: '0.75rem' }}>
                <span>⏰</span>
                <span>Each question has a time frame based on complexity (max 60 sec)</span>
            </div>
        </div>
    );

    // ─── Mode-specific fields ───

    const renderDomainFields = () => (
        <>
            <div className="setup-field-group">
                <label>Select Domain</label>
                <select className="setup-select" value={domain} onChange={e => { setDomain(e.target.value); setTopic(''); }}>
                    <option value="">Choose a domain...</option>
                    {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
            {domain && (
                <div className="setup-field-group">
                    <label>Select Topic</label>
                    <select className="setup-select" value={topic} onChange={e => setTopic(e.target.value)}>
                        <option value="">Choose a topic...</option>
                        {(DOMAIN_TOPICS[domain] || []).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            )}
        </>
    );

    const renderJDFields = () => (
        <div className="setup-field-group">
            <label>Job Description</label>
            <textarea
                className="setup-textarea"
                placeholder="Paste the full job description here..."
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                style={{ minHeight: '160px' }}
            />
        </div>
    );

    const renderResumeFields = () => (
        <div className="setup-field-group">
            <label>Upload Resume (PDF)</label>
            <input
                type="file"
                ref={fileInputRef}
                accept=".pdf"
                onChange={handleResumeUpload}
                style={{ display: 'none' }}
            />
            <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '2px dashed rgba(255,255,255,0.15)',
                    borderRadius: '0.75rem',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
            >
                {resumeFileName ? (
                    <div>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                        <div style={{ color: '#10b981', fontWeight: 600 }}>{resumeFileName}</div>
                        <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>Click to change</div>
                    </div>
                ) : (
                    <div>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📤</div>
                        <div style={{ color: '#94a3b8' }}>Click to upload your resume (PDF)</div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderCompanyFields = () => (
        <>
            <div className="setup-field-group">
                <label>Select Company</label>
                <select className="setup-select" value={companyName} onChange={e => setCompanyName(e.target.value)}>
                    <option value="">Choose a company...</option>
                    {MNC_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            {companyName === 'Other' && (
                <div className="setup-field-group">
                    <label>Company Name</label>
                    <input
                        type="text"
                        className="setup-input"
                        placeholder="Enter company name"
                        value={customCompanyName}
                        onChange={e => setCustomCompanyName(e.target.value)}
                    />
                </div>
            )}
        </>
    );

    const renderPreviousExperienceFields = () => (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="setup-field-group">
                    <label>Previous Company Name</label>
                    <input
                        type="text"
                        className="setup-input"
                        placeholder="e.g., TCS"
                        value={previousCompany}
                        onChange={e => setPreviousCompany(e.target.value)}
                    />
                </div>
                <div className="setup-field-group">
                    <label>Job Role</label>
                    <input
                        type="text"
                        className="setup-input"
                        placeholder="e.g., SDE"
                        value={jobRole}
                        onChange={e => setJobRole(e.target.value)}
                    />
                </div>
            </div>

            <div className="setup-field-group">
                <label>Technical Topics</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {TECHNICAL_TOPICS.map(t => (
                        <button
                            key={t}
                            className={`topic-chip ${selectedTechTopics.includes(t) ? 'selected' : ''}`}
                            onClick={() => toggleTechTopic(t)}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                {selectedTechTopics.includes('Custom') && (
                    <input
                        type="text"
                        className="setup-input"
                        placeholder="Enter custom technical topic"
                        style={{ marginTop: '0.5rem' }}
                        value={customTechnicalTopic}
                        onChange={e => setCustomTechnicalTopic(e.target.value)}
                    />
                )}
            </div>

            <div className="setup-field-group">
                <label>Behavioral Topics</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {BEHAVIORAL_TOPICS.map(t => (
                        <button
                            key={t}
                            className={`topic-chip ${selectedBehavioralTopics.includes(t) ? 'selected' : ''}`}
                            onClick={() => toggleBehavioralTopic(t)}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                {selectedBehavioralTopics.includes('Custom') && (
                    <input
                        type="text"
                        className="setup-input"
                        placeholder="Enter custom behavioral topic"
                        style={{ marginTop: '0.5rem' }}
                        value={customBehavioralTopic}
                        onChange={e => setCustomBehavioralTopic(e.target.value)}
                    />
                )}
            </div>

            <div className="setup-field-group">
                <label>Previous Interview Questions (optional)</label>
                <textarea
                    className="setup-textarea"
                    placeholder="Enter any questions you remember from your previous interview..."
                    value={previousQuestions}
                    onChange={e => setPreviousQuestions(e.target.value)}
                    style={{ minHeight: '100px' }}
                />
            </div>

            <div className="setup-field-group">
                <label>Your Previous Answers (optional)</label>
                <textarea
                    className="setup-textarea"
                    placeholder="Enter your answers from the previous interview if you remember..."
                    value={previousAnswers}
                    onChange={e => setPreviousAnswers(e.target.value)}
                    style={{ minHeight: '100px' }}
                />
            </div>
        </>
    );

    const renderModeFields = () => {
        switch (mode) {
            case InterviewMode.DOMAIN_BASED: return renderDomainFields();
            case InterviewMode.JD_BASED: return renderJDFields();
            case InterviewMode.RESUME_BASED: return renderResumeFields();
            case InterviewMode.COMPANY_SPECIFIC: return renderCompanyFields();
            case InterviewMode.PREVIOUS_EXPERIENCE: return renderPreviousExperienceFields();
            default: return null;
        }
    };

    return (
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1rem' }}>
            <button className="back-btn" onClick={onBack}>
                ← Back to modes
            </button>

            <div style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '2rem' }}>{getModeIcon()}</span>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{getModeTitle()}</h2>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                    Configure your interview settings below and click Start when ready.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {renderCandidateName()}
                {renderModeFields()}
                {renderExperienceLevel()}
                {renderLimitType()}

                <button
                    className="start-interview-btn"
                    disabled={!isValid()}
                    onClick={handleStart}
                    style={{ alignSelf: 'center', marginTop: '1rem' }}
                >
                    🎤 Start Interview
                </button>
            </div>
        </div>
    );
};
