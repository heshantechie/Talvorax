import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ProfilePictureManager } from '../components/ProfilePictureManager';
import { Mail, Lock, ShieldCheck, CheckCircle2, AlertCircle, FileText, Download } from 'lucide-react';
import { getLegalDocuments } from '../lib/documents';
import { Link } from 'react-router-dom';

export const EditProfile: React.FC = () => {
  const { user } = useAuth();
  const documents = getLegalDocuments();
  
  // States for Profile update
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.full_name);
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!displayName || displayName === user?.user_metadata?.full_name) return;
    
    setProfileLoading(true);
    setProfileStatus(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName }
      });
      if (error) throw error;
      
      setProfileStatus({ type: 'success', msg: 'Profile updated successfully!' });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      setProfileStatus({ type: 'error', msg: err.message || 'Failed to update profile.' });
    } finally {
      setProfileLoading(false);
    }
  };

  // States for Email Change
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);

  // States for Password Change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === user?.email) return;
    
    setEmailLoading(true);
    setEmailStatus(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      
      setEmailStatus({
        type: 'success', 
        msg: 'Verification emails sent! Please check both your old and new email inboxes to confirm the change.'
      });
      setNewEmail(''); // Reset field
    } catch (err: any) {
      setEmailStatus({ type: 'error', msg: err.message || 'Failed to update email.' });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;

    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', msg: 'New password must be at least 6 characters.' });
      return;
    }

    setPasswordLoading(true);
    setPasswordStatus(null);

    try {
      // Very strict! First we MUST re-authenticate them using the OLD password to prove identity
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: oldPassword,
      });

      if (signInError) {
        throw new Error("The previous password you entered is incorrect.");
      }

      // If that succeeded, they know the old password. Now we force the update to the new one!
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setPasswordStatus({
        type: 'success',
        msg: 'Password updated successfully!'
      });
      setOldPassword('');
      setNewPassword('');

    } catch (err: any) {
      setPasswordStatus({ type: 'error', msg: err.message || 'Failed to update password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 mb-16 space-y-8 animate-fade-in">
      
      <div>
        <h1 className="text-3xl font-[800] text-slate-900 tracking-tight">Edit Profile</h1>
        <p className="text-slate-500 font-medium mt-2">Manage your personal information, security, and preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Section 1: Avatar & Display Name */}
        <section className="bg-white border border-slate-100 p-6 md:p-8 rounded-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border-t-4 border-t-emerald-500">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            Public Profile
          </h2>
          
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <ProfilePictureManager />
            
            <div className="flex-1 w-full space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Display Name</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-700 font-semibold outline-none transition-all"
                    placeholder="Enter your full name"
                  />
                  <button 
                    onClick={handleUpdateProfile}
                    disabled={profileLoading || !displayName || displayName === user?.user_metadata?.full_name}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50"
                  >
                    {profileLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {profileStatus && (
                  <p className={`text-xs font-medium ${profileStatus.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {profileStatus.msg}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Associated Email</label>
                <div className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-emerald-700 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                  {user?.email}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Email Management */}
        <section className="bg-white border border-slate-100 p-6 md:p-8 rounded-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
          <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-500" />
            Change Email Address
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-2xl">
            For security reasons, changing your email requires verifying *both* your current address and the new address.
          </p>

          <form onSubmit={handleUpdateEmail} className="max-w-xl space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">New Email Address</label>
              <input 
                type="email" 
                placeholder="Enter new email..."
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-slate-800 outline-none transition-all"
                required
              />
            </div>
            
            {emailStatus && (
              <div className={`p-3 rounded-xl text-sm font-semibold flex items-start gap-2 ${emailStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {emailStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                <p>{emailStatus.msg}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={emailLoading || !newEmail || newEmail === user?.email}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {emailLoading ? 'Sending Verifications...' : 'Request Email Change'}
            </button>
          </form>
        </section>

        {/* Section 3: Password Management */}
        <section className="bg-white border border-slate-100 p-6 md:p-8 rounded-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border-b-4 border-b-red-400">
          <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Lock className="w-5 h-5 text-red-500" />
            Change Password
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-2xl">
            You must enter your current password to authorize this security change.
          </p>

          <form onSubmit={handleUpdatePassword} className="max-w-xl space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Current Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl text-slate-800 outline-none transition-all"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">New Password</label>
              <input 
                type="password" 
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 rounded-xl text-slate-800 outline-none transition-all"
                required
                minLength={6}
              />
            </div>

            {passwordStatus && (
              <div className={`p-3 rounded-xl text-sm font-semibold flex items-start gap-2 ${passwordStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {passwordStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                <p>{passwordStatus.msg}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={passwordLoading || !oldPassword || !newPassword}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(239,68,68,0.3)] transition-all disabled:opacity-50"
            >
              {passwordLoading ? 'Verifying & Updating...' : 'Update Password'}
            </button>
          </form>
        </section>

        {/* Section 4: Legal & Consent */}
        <section className="bg-white border border-slate-100 p-6 md:p-8 rounded-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border-b-4 border-b-blue-400">
          <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Legal & Consent
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-2xl">
            Review the legal documents and policies you have agreed to.
          </p>

          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6">
              <div>
                <p className="text-sm font-semibold text-slate-700">Consent Status</p>
                <p className="text-xs text-slate-500 mt-1">
                  Accepted on: {user?.user_metadata?.accepted_at ? new Date(user.user_metadata.accepted_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              <div className="mt-2 md:mt-0">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Version {user?.user_metadata?.consent_version || '1.0'}
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {documents.map(doc => (
                <div key={doc.id} className="p-4 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{doc.title}</p>
                      <p className="text-xs text-slate-500">
                        {user?.user_metadata?.accepted_documents?.[doc.id] ? 'Accepted' : 'Document available'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link to="/legal" className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="View Document">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </Link>
                    <a href={doc.url} download={doc.filename} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Download Document">
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
