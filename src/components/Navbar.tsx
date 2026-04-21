import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, FileText, Timer, Users, Send, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import talvoraxLogo from '../assets/Logo.png';

export const Navbar: React.FC = () => {
  const { session, user, signOut } = useAuth();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  // Shadow on scroll
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
    { name: 'Auto Apply', path: '/auto-apply', icon: <Send className="w-5 h-5 text-emerald-500" />, desc: 'Automate job applications' },
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
              <div className="relative group cursor-pointer hidden md:block">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold border-2 border-white shadow-sm ring-2 ring-emerald-50">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                </div>
                {/* Profile dropdown */}
                <div className="absolute opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all top-[120%] right-0 w-48 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-xl bg-white border border-gray-100 p-2">
                    <p className="text-xs font-bold text-slate-400 px-3 py-2 truncate">{user?.email}</p>
                    <button onClick={handleSignOut} className="w-full text-left px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors">Sign Out</button>
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
