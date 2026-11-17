DROP POLICY IF EXISTS "reel reactions read" ON public.reel_reactions;
CREATE POLICY "reel reactions read own" ON public.reel_reactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "feed reactions read" ON public.feed_reactions;
CREATE POLICY "feed reactions read own" ON public.feed_reactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.reel_like_counts(_reel_ids uuid[])
RETURNS TABLE (reel_id uuid, likes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rr.reel_id, count(*)::bigint AS likes
  FROM public.reel_reactions rr
  JOIN public.reels r ON r.id = rr.reel_id
  WHERE rr.reel_id = ANY (_reel_ids[1:100])
    AND r.is_published = true
    AND r.moderation_state <> 'removed'
  GROUP BY rr.reel_id
$$;

REVOKE ALL ON FUNCTION public.reel_like_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reel_like_counts(uuid[]) TO anon, authenticated;