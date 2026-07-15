-- public.communication_sessions
CREATE TABLE IF NOT EXISTS public.communication_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scenario_type TEXT,
    mission_id TEXT,
    world_id TEXT,
    title TEXT,
    difficulty TEXT,
    estimated_duration TEXT,
    scenario_description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'ended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    overall_score INT,
    grammar_score INT,
    fluency_score INT,
    vocabulary_score INT,
    confidence_score INT,
    professional_tone_score INT,
    pronunciation_score INT,
    xp_earned INT,
    overall_feedback JSONB
);

-- Enable RLS
ALTER TABLE public.communication_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for communication_sessions
CREATE POLICY "Users can manage their own communication sessions"
    ON public.communication_sessions
    FOR ALL USING (auth.uid() = user_id);

-- public.communication_messages
CREATE TABLE IF NOT EXISTS public.communication_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.communication_sessions(id) ON DELETE CASCADE,
    sender TEXT CHECK (sender IN ('user', 'ai')) NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.communication_messages ENABLE ROW LEVEL SECURITY;

-- Policies for communication_messages
CREATE POLICY "Users can view messages in their own sessions"
    ON public.communication_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.communication_sessions s
            WHERE s.id = session_id AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in their own sessions"
    ON public.communication_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.communication_sessions s
            WHERE s.id = session_id AND s.user_id = auth.uid()
        )
    );

-- public.communication_daily_challenges
CREATE TABLE IF NOT EXISTS public.communication_daily_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_type TEXT NOT NULL,
    transcript TEXT NOT NULL,
    score INT NOT NULL,
    xp_earned INT NOT NULL,
    date_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.communication_daily_challenges ENABLE ROW LEVEL SECURITY;

-- Policies for communication_daily_challenges
CREATE POLICY "Users can manage their own daily challenges"
    ON public.communication_daily_challenges
    FOR ALL USING (auth.uid() = user_id);
