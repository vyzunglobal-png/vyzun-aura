-- Public (signed-out) readers lack EXECUTE on is_staff, so a single policy that calls it
-- rejected every anonymous read. Split into a public policy and a signed-in owner/staff policy.
DROP POLICY IF EXISTS "reels public read" ON public.reels;
CREATE POLICY "reels public read" ON public.reels FOR SELECT TO anon, authenticated USING (is_published = true AND moderation_state <> 'removed');
CREATE POLICY "reels owner or staff read" ON public.reels FOR SELECT TO authenticated USING (creator_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "vibe feed read" ON public.vibe_feed;
CREATE POLICY "vibe feed public read" ON public.vibe_feed FOR SELECT TO anon, authenticated USING (moderation_state <> 'removed');
CREATE POLICY "vibe feed owner or staff read" ON public.vibe_feed FOR SELECT TO authenticated USING (author_id = auth.uid() OR public.is_staff(auth.uid()));