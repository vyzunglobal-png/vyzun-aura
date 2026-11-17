import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/vyzun/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — VYZUN" },
      { name: "description", content: "How VYZUN collects, uses, protects and deletes your data, and how to exercise your privacy rights." },
      { property: "og:title", content: "Privacy Policy — VYZUN" },
      { property: "og:description", content: "How VYZUN handles your data and your privacy rights." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="November 15, 2026"
      intro="This policy explains what information VYZUN handles when you use the app, why, and the choices and rights you have."
      sections={[
        {
          heading: "Information we handle",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Account details you give us: sign-in email or phone number, username, display name, bio and profile photo.</li>
              <li>Content you create: Reels, captions, posts, anonymous secrets, chat messages and Aura Cards.</li>
              <li>Settings and preferences, such as theme, language and who can contact you.</li>
              <li>Face scans: the live camera frame used for an Aura scan is processed on your device and kept on your device. Gallery uploads are not used for scans.</li>
              <li>Basic technical data needed to run and secure the service, such as device type and error reports.</li>
            </ul>
          ),
        },
        {
          heading: "How we use it",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>To provide the app's features and keep your account signed in.</li>
              <li>To keep the community safe: anonymous secrets and uploaded Reels go through moderation before they are delivered or published.</li>
              <li>To answer VYZUN AI questions. Only the question you send is shared with our AI provider, never your private chats.</li>
              <li>We do not sell your personal information.</li>
            </ul>
          ),
        },
        {
          heading: "Anonymous secrets",
          body: <p>Recipients never see who sent an anonymous secret. Sender identity is kept only to enforce blocks and safety rules.</p>,
        },
        {
          heading: "Your rights",
          body: (
            <>
              <p>Depending on where you live (for example under the GDPR in the EU and UK, or the CCPA in California), you can ask to access, correct, export or delete your data, and object to or restrict some uses.</p>
              <p>You can delete your account at any time in Settings → Delete account permanently. This removes your profile and the content linked to it.</p>
            </>
          ),
        },
        {
          heading: "Security",
          body: <p>Data is sent over encrypted connections. Access rules on our servers ensure people can only read and change what they are allowed to. Uploaded Reels are stored privately and shared only according to the privacy option you choose.</p>,
        },
        {
          heading: "Age requirement",
          body: <p>VYZUN is not intended for anyone under 13. If you believe a child under 13 has an account, contact us and we will remove it.</p>,
        },
        {
          heading: "Changes",
          body: <p>If this policy changes in a meaningful way, we will update the date above and tell you in the app.</p>,
        },
      ]}
    />
  );
}
