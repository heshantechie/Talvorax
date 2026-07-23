import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, FileText, Timer, Users, Send, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, Theme } from '../contexts/ThemeContext';
import talvoraxLogo from '../assets/logo.png';

export const Navbar: React.FC = () => {
  const { session, user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Shadow on scroll and click outside profile
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    // Click outside profile handler
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const navLinks = [
    { name: 'Upskill', path: '/upskill' },
    { name: 'Job Alerts', path: '/job-alerts' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const upskillItems = [
    { name: 'Resume Analyzer', path: '/resume-analyzer', icon: <FileText className="w-5 h-5 text-emerald-500" />, desc: 'AI-driven resume feedback' },
    { name: 'Interview Coach', path: '/interview-coach', icon: <Users className="w-5 h-5 text-emerald-500" />, desc: 'Mock interviews & scoring' },
    { name: 'Minute Talk', path: '/minute-talk', icon: <Timer className="w-5 h-5 text-emerald-500" />, desc: 'Elevator pitch practice' },
    { name: 'Auto Apply (Coming Soon)', path: '/auto-apply', icon: <Send className="w-5 h-5 text-emerald-500" />, desc: 'Automated job applications — launching soon' },
    { name: 'Communication Skills', path: '/communication-skills', icon: <MessageSquare className="w-5 h-5 text-emerald-500" />, desc: 'Improve verbal fluency' },
  ];

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled || location.pathname !== '/' ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200' : 'bg-transparent'}`}>
      <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-center cursor-pointer hover:opacity-90 transition-opacity">
          <img src={talvoraxLogo} alt="Talvorax" className="h-10 lg:h-12 w-auto object-contain mix-blend-multiply" />
        </Link>
        
        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-8 text-[15px] font-semibold text-slate-600">
          

          {navLinks.map((link) => (
             <Link 
              key={link.name} 
              to={link.path} 
              className={`hover:text-emerald-600 transition-colors py-2 ${location.pathname === link.path ? 'text-emerald-600' : ''}`}
            >
              {link.name}
             </Link>
          ))}
        </div>

        {/* Right Nav (Auth) */}
        <div className="flex items-center gap-5">
          {session ? (
            <>
              <Link to="/dashboard" className="text-[15px] font-bold text-slate-600 hover:text-emerald-600 transition-colors">
                Dashboard
              </Link>
              <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>
              <div className="relative cursor-pointer hidden md:block" ref={profileRef}>
                <div 
                  className="flex items-center gap-2" 
                  onClick={() => setProfileOpen(!profileOpen)}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold border-2 border-white shadow-sm ring-2 ring-emerald-50 overflow-hidden">
                    {user?.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user?.email?.charAt(0).toUpperCase()
                    )}
                  </div>
                </div>
                {/* Profile dropdown */}
                <div 
                  className={`absolute transition-all top-[120%] right-0 w-48 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-xl bg-white border border-gray-100 p-2 z-50 ${profileOpen ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none -translate-y-2'}`}
                >
                    <div className="px-3 py-2 border-b border-gray-100 mb-1">
                      <p className="text-sm font-bold text-slate-700 truncate">{user?.user_metadata?.full_name || 'Candidate'}</p>
                      <p className="text-xs font-medium text-slate-400 truncate">{user?.email}</p>
                    </div>
                    
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-bold text-slate-400 mb-2">Theme</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setTheme('light')} className={`text-xs py-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-emerald-100 text-emerald-700 font-bold shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Light</button>
                        <button onClick={() => setTheme('dark')} className={`text-xs py-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-emerald-100 text-emerald-700 font-bold shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Dark</button>
                        <button onClick={() => setTheme('glassy')} className={`text-xs py-1.5 rounded-md transition-all ${theme === 'glassy' ? 'bg-emerald-100 text-emerald-700 font-bold shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Glassy</button>
                        <button onClick={() => setTheme('neon-blue')} className={`text-xs py-1.5 rounded-md transition-all ${theme === 'neon-blue' ? 'bg-emerald-100 text-emerald-700 font-bold shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Neon</button>
                      </div>
                    </div>
                    
                    <Link to="/dashboard/edit-profile" onClick={() => setProfileOpen(false)} className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2">
                       Edit Profile
                    </Link>

                    <button onClick={handleSignOut} className="w-full text-left px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1 border-t border-gray-100 pt-2">
                       Sign Out
                    </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-[15px] font-bold text-slate-600 hover:text-emerald-600 transition-colors">
                Log in
              </Link>
              <Link to="/signup" className="flex items-center justify-center font-bold px-6 py-2.5 rounded-full text-[15px] bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_4px_14px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] transition-all hover:-translate-y-0.5">
                Get Started
              </Link>
            </>
          )}
        </div>
        
      </div>
    </nav>
  );
};
