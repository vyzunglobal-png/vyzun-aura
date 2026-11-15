ALTER POLICY "campaigns own update" ON public.brand_campaigns
  WITH CHECK ((brand_owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "calls participants update" ON public.calls
  WITH CHECK ((caller_id = auth.uid()) OR (callee_id = auth.uid()));

ALTER POLICY "applications update" ON public.campaign_applications
  WITH CHECK ((creator_id = auth.uid()) OR (EXISTS (SELECT 1 FROM public.brand_campaigns c WHERE c.id = campaign_applications.campaign_id AND c.brand_owner_id = auth.uid())));

ALTER POLICY "messages update own" ON public.chat_messages
  USING (sender_id = auth.uid())
  WITH CHECK ((sender_id = auth.uid()) AND public.is_chat_member(chat_id, auth.uid()));

ALTER POLICY "chats member update" ON public.chats
  WITH CHECK (public.is_chat_member(id, auth.uid()));

ALTER POLICY "challenges own update" ON public.creator_challenges
  WITH CHECK ((created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "reels update own" ON public.reels
  WITH CHECK ((creator_id = auth.uid()) OR public.is_staff(auth.uid()));

ALTER POLICY "vibe feed update own" ON public.vibe_feed
  WITH CHECK ((author_id = auth.uid()) OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "social read" ON public.social_connections;
CREATE POLICY "social read own" ON public.social_connections
  FOR SELECT TO authenticated
  USING ((follower_id = auth.uid()) OR (following_id = auth.uid()));