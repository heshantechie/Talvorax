-- public.user_auto_apply_settings
CREATE TABLE IF NOT EXISTS public.user_auto_apply_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    min_match_score INT DEFAULT 80,
    daily_limit INT DEFAULT 5,
    is_autopilot BOOLEAN DEFAULT false,
    linkedin_url TEXT,
    github_url TEXT,
    portfolio_url TEXT,
    notice_period TEXT DEFAULT 'Immediate',
    expected_salary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.user_auto_apply_settings ENABLE ROW LEVEL SECURITY;

-- Policies for user_auto_apply_settings
CREATE POLICY "Users can manage their own auto-apply settings" 
    ON public.user_auto_apply_settings 
    FOR ALL USING (auth.uid() = user_id);

-- public.auto_apply_applications
CREATE TABLE IF NOT EXISTS public.auto_apply_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs_cache(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'applying', 'applied', 'failed', 'needs_manual_action')),
    error_log TEXT,
    screenshot_url TEXT,
    applied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, job_id)
);

-- Enable Row Level Security
ALTER TABLE public.auto_apply_applications ENABLE ROW LEVEL SECURITY;

-- Policies for auto_apply_applications
CREATE POLICY "Users can view their own applications" 
    ON public.auto_apply_applications 
    FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow inserting application logs
CREATE POLICY "Users can insert application logs"
    ON public.auto_apply_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow updating application logs
CREATE POLICY "Users can update their own application logs"
    ON public.auto_apply_applications
    FOR UPDATE USING (auth.uid() = user_id);
