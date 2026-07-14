import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AILoader } from './src/components/AILoader';

// Fix 15: Lazy load heavy route components for code splitting
const Login = lazy(() => import('./src/pages/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./src/pages/Signup').then(m => ({ default: m.Signup })));
const Legal = lazy(() => import('./src/pages/Legal').then(m => ({ default: m.Legal })));
const Dashboard = lazy(() => import('./src/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const HomeLanding = lazy(() => import('./src/pages/HomeLanding').then(m => ({ default: m.HomeLanding })));
const ResumeAnalyzerLanding = lazy(() => import('./src/pages/ResumeAnalyzerLanding').then(m => ({ default: m.ResumeAnalyzerLanding })));
const InterviewCoachLanding = lazy(() => import('./src/pages/InterviewCoachLanding').then(m => ({ default: m.InterviewCoachLanding })));
const MinuteTalkLanding = lazy(() => import('./src/pages/MinuteTalkLanding').then(m => ({ default: m.MinuteTalkLanding })));
const JobAlertsLanding = lazy(() => import('./src/pages/JobAlertsLanding').then(m => ({ default: m.JobAlertsLanding })));
const PricingLanding = lazy(() => import('./src/pages/PricingLanding').then(m => ({ default: m.PricingLanding })));
const AboutLanding = lazy(() => import('./src/pages/AboutLanding').then(m => ({ default: m.AboutLanding })));
const ContactLanding = lazy(() => import('./src/pages/ContactLanding').then(m => ({ default: m.ContactLanding })));
const AutoApplyLanding = lazy(() => import('./src/pages/AutoApplyLanding').then(m => ({ default: m.AutoApplyLanding })));
const CommunicationDashboard = lazy(() => import('./src/pages/communication/index').then(m => ({ default: m.CommunicationDashboard })));
const ConversationPractice = lazy(() => import('./src/pages/communication/ConversationPractice').then(m => ({ default: m.ConversationPractice })));
const CampusWorld = lazy(() => import('./src/pages/communication/CampusWorld').then(m => ({ default: m.CampusWorld })));
const WorkplaceWorld = lazy(() => import('./src/pages/communication/WorkplaceWorld').then(m => ({ default: m.WorkplaceWorld })));
const SocialWorld = lazy(() => import('./src/pages/communication/SocialWorld').then(m => ({ default: m.SocialWorld })));
const LeadershipWorld = lazy(() => import('./src/pages/communication/LeadershipWorld').then(m => ({ default: m.LeadershipWorld })));
const PronunciationFluency = lazy(() => import('./src/pages/communication/PronunciationFluency').then(m => ({ default: m.PronunciationFluency })));
const FillerWordDetection = lazy(() => import('./src/pages/communication/FillerWordDetection').then(m => ({ default: m.FillerWordDetection })));
const VoiceClarity = lazy(() => import('./src/pages/communication/VoiceClarity').then(m => ({ default: m.VoiceClarity })));
const ProgressDashboard = lazy(() => import('./src/pages/communication/ProgressDashboard').then(m => ({ default: m.ProgressDashboard })));
const WorldsHub = lazy(() => import('./src/pages/communication/WorldsHub').then(m => ({ default: m.WorldsHub })));
const StudioHub = lazy(() => import('./src/pages/communication/StudioHub').then(m => ({ default: m.StudioHub })));
const PronunciationCoach = lazy(() => import('./src/pages/communication/PronunciationCoach').then(m => ({ default: m.PronunciationCoach })));
const ConfidenceBuilder = lazy(() => import('./src/pages/communication/ConfidenceBuilder').then(m => ({ default: m.ConfidenceBuilder })));
const DailyChallenge = lazy(() => import('./src/pages/communication/DailyChallenge').then(m => ({ default: m.DailyChallenge })));
const AchievementsPage = lazy(() => import('./src/pages/communication/AchievementsPage').then(m => ({ default: m.AchievementsPage })));
const UpskillLanding = lazy(() => import('./src/pages/UpskillLanding').then(m => ({ default: m.UpskillLanding })));
const LoadingFallback = () => (
  <AILoader fullScreen messages={["Initializing Talvorax OS...", "Authenticating...", "Loading Modules..."]} />
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { session, loading } = useAuth();
  
  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <HomeLanding />} />
        <Route path="/resume-analyzer" element={<ResumeAnalyzerLanding />} />
        <Route path="/interview-coach" element={<InterviewCoachLanding />} />
        <Route path="/minute-talk" element={<MinuteTalkLanding />} />
        <Route path="/job-alerts" element={<JobAlertsLanding />} />
        <Route path="/pricing" element={<PricingLanding />} />
        <Route path="/about" element={<AboutLanding />} />
        <Route path="/contact" element={<ContactLanding />} />
        <Route path="/auto-apply" element={<AutoApplyLanding />} />
        <Route path="/communication-skills" element={<Navigate to="/communication" replace />} />
        <Route path="/communication" element={<ProtectedRoute><CommunicationDashboard /></ProtectedRoute>} />
        <Route path="/communication/conversation" element={<ProtectedRoute><ConversationPractice /></ProtectedRoute>} />
        <Route path="/communication/campus" element={<ProtectedRoute><CampusWorld /></ProtectedRoute>} />
        <Route path="/communication/workplace" element={<ProtectedRoute><WorkplaceWorld /></ProtectedRoute>} />
        <Route path="/communication/social" element={<ProtectedRoute><SocialWorld /></ProtectedRoute>} />
        <Route path="/communication/leadership" element={<ProtectedRoute><LeadershipWorld /></ProtectedRoute>} />
        <Route path="/communication/pronunciation" element={<ProtectedRoute><PronunciationFluency /></ProtectedRoute>} />
        <Route path="/communication/filler-words" element={<ProtectedRoute><FillerWordDetection /></ProtectedRoute>} />
        <Route path="/communication/voice-analysis" element={<ProtectedRoute><VoiceClarity /></ProtectedRoute>} />
        <Route path="/communication/progress" element={<ProtectedRoute><ProgressDashboard /></ProtectedRoute>} />
        <Route path="/communication/worlds" element={<ProtectedRoute><WorldsHub /></ProtectedRoute>} />
        <Route path="/communication/studio" element={<ProtectedRoute><StudioHub /></ProtectedRoute>} />
        <Route path="/communication/pronunciation-coach" element={<ProtectedRoute><PronunciationCoach /></ProtectedRoute>} />
        <Route path="/communication/confidence" element={<ProtectedRoute><ConfidenceBuilder /></ProtectedRoute>} />
        <Route path="/communication/daily-challenge" element={<ProtectedRoute><DailyChallenge /></ProtectedRoute>} />
        <Route path="/communication/achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
        <Route path="/upskill" element={<UpskillLanding />} />
        
        <Route path="/legal" element={<Legal />} />
        <Route path="/documents" element={<Navigate to="/legal" replace />} />
        
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={session ? <Navigate to="/dashboard" replace /> : <Signup />} />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;