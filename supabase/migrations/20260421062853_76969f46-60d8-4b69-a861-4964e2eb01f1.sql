-- Schedule classes
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  class_name TEXT NOT NULL,
  class_id TEXT NOT NULL,
  day TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT NOT NULL,
  meeting_link TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own classes" ON public.classes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own classes" ON public.classes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own classes" ON public.classes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own classes" ON public.classes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_classes_user ON public.classes(user_id);

-- Templates
CREATE TABLE public.schedule_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  classes JSONB NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own templates" ON public.schedule_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own templates" ON public.schedule_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own templates" ON public.schedule_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own templates" ON public.schedule_templates FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_templates_user ON public.schedule_templates(user_id);

-- User settings (notifications)
CREATE TABLE public.user_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  minutes_before INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own settings" ON public.user_settings FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at on classes
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER classes_set_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER settings_set_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();