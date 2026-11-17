import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/vyzun/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — VYZUN" },
      { name: "description", content: "The rules for using VYZUN: eligibility, your content, community safety, purchases and account deletion." },
      { property: "og:title", content: "Terms of Service — VYZUN" },
      { property: "og:description", content: "The rules for using VYZUN." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="November 15, 2026"
      intro="By using VYZUN you agree to these terms. Please read them together with our Privacy Policy."
      sections={[
        { heading: "Who can use VYZUN", body: <p>You must be at least 13 years old, and old enough to agree to these terms where you live. If you are under the age of majority, use VYZUN with a parent's or guardian's permission.</p> },
        { heading: "Your account", body: <p>Keep your sign-in details safe. You are responsible for activity on your account. You can delete your account at any time in Settings.</p> },
        { heading: "Your content", body: <p>You own what you post. You give VYZUN permission to store and show it to the audience you choose so the app can work. Only post content you have the right to share.</p> },
        {
          heading: "Community rules",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>No harassment, bullying, threats, hate or sexual content involving minors.</li>
              <li>No sharing anyone's private information (doxxing).</li>
              <li>No impersonation, spam or misleading content.</li>
              <li>Anonymous secrets must still follow these rules; abusive senders can be blocked and removed.</li>
            </ul>
          ),
        },
        { heading: "AI features", body: <p>Aura scans, Aura Cards and VYZUN AI answers are for entertainment. They are not predictions or professional advice.</p> },
        { heading: "Purchases", body: <p>Paid features show their price before you pay. A paid feature is only unlocked after payment is confirmed. Refunds follow the rules of the store or payment provider you used and the law where you live.</p> },
        { heading: "Ending access", body: <p>We may remove content or suspend accounts that break these terms. You can stop using VYZUN and delete your account at any time.</p> },
        { heading: "Changes", body: <p>We may update these terms. If changes are significant, we will update the date above and let you know in the app.</p> },
      ]}
    />
  );
}
