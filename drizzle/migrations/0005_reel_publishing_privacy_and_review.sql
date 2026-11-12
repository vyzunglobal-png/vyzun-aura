-- Reel publishing: storage paths, privacy, tags, and a review gate creators cannot bypass.
ALTER TABLE public.reels
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','secret_drop','friends')),
  ADD COLUMN tagged_usernames TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN video_path TEXT,
  ADD COLUMN cover_path TEXT;

CREATE OR REPLACE FUNCTION public.guard_reel_moderation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_staff(auth.uid()) THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.moderation_state := 'pending';
    NEW.is_sponsored := false;
    NEW.views_count := 0;
    NEW.watch_seconds := 0;
  ELSE
    NEW.moderation_state := OLD.moderation_state;
    NEW.is_sponsored := OLD.is_sponsored;
    NEW.views_count := OLD.views_count;
    NEW.watch_seconds := OLD.watch_seconds;
    NEW.creator_id := OLD.creator_id;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_reel_moderation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reels_guard_moderation BEFORE INSERT OR UPDATE ON public.reels FOR EACH ROW EXECUTE FUNCTION public.guard_reel_moderation();

DROP POLICY IF EXISTS "reels public read" ON public.reels;
CREATE POLICY "reels public read" ON public.reels FOR SELECT TO anon, authenticated
  USING (is_published = true AND moderation_state <> 'removed' AND visibility = 'public');
CREATE POLICY "reels friends read" ON public.reels FOR SELECT TO authenticated
  USING (is_published = true AND moderation_state <> 'removed' AND visibility = 'friends'
    AND EXISTS (SELECT 1 FROM public.social_connections c WHERE c.follower_id = auth.uid() AND c.following_id = reels.creator_id AND c.state = 'active'));

-- Storage: creators upload into their own folder; viewers can read media of reels they may see.
CREATE POLICY "reel media upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reel-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "reel media read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reel-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "reel media delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'reel-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "reel media read published" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'reel-media' AND EXISTS (
    SELECT 1 FROM public.reels r
    WHERE (r.video_path = storage.objects.name OR r.cover_path = storage.objects.name)
      AND r.is_published = true AND r.moderation_state = 'approved' AND r.visibility = 'public'));
CREATE POLICY "reel media read friends" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reel-media' AND EXISTS (
    SELECT 1 FROM public.reels r
    JOIN public.social_connections c ON c.following_id = r.creator_id AND c.follower_id = auth.uid() AND c.state = 'active'
    WHERE (r.video_path = storage.objects.name OR r.cover_path = storage.objects.name)
      AND r.is_published = true AND r.moderation_state = 'approved' AND r.visibility = 'friends'));