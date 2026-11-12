/**
 * Built-in VYZUN AI guide answers. These are instant and work for guests;
 * free-form questions go to the signed-in AI guide.
 */
export type GuideAction = "map" | "scan" | "halo" | "reels" | "secrets";

export type GuideAnswer = { text: string; actions: GuideAction[] };

export const GUIDE_STARTERS = ["How to reveal crush?", "What is Aura Score?", "How to pin on Campus Map?"] as const;

export const GUIDE_ANSWERS: Record<(typeof GUIDE_STARTERS)[number], GuideAnswer> = {
  "How to reveal crush?": {
    text: "Open the Scan tab and add your crush in the Double-Blind Crush card. Nobody is told unless they pick you too. When it's mutual, tap \"$4.99 · Reveal Identity & Instant Chat\" to unlock who it is and start chatting.",
    actions: ["scan"],
  },
  "What is Aura Score?": {
    text: "Your Aura Score (40–99) comes from a live face scan. It sets your rarity — up to ULTRA RARE — plus your 4 stat gauges and Aura colour palette on your 3D Aura Card. Share it and dare friends to beat it. It's for fun, not a prediction.",
    actions: ["scan"],
  },
  "How to pin on Campus Map?": {
    text: "Go to Secrets → Campus Map and tap \"Pin Yours - $5\" to drop your glowing pin on campus. Add a VIP Halo ($4.99/mo) to make your pin stand out, or try a Loot Box ($1.99) for a surprise.",
    actions: ["map", "halo"],
  },
};

/** Facts the AI guide may rely on. Keep prices in sync with the screens that sell them. */
export const GUIDE_FACTS = [
  "Tabs: SCAN, SECRETS, REELS, PROFILE.",
  "Scan: live face scan creates a 3D Aura Card with an Aura Score from 40 to 99, rarity, 4 stat gauges, a 4-colour palette and an AI vibe quote. A $2.99 Boost is offered on the card. The QR button in the Scan header scans friends' VYZUN QR codes or shows your own.",
  "Crush: the Double-Blind Crush card only matches when both people pick each other; '$4.99 · Reveal Identity & Instant Chat' unlocks a mutual match.",
  "Secrets: an Anonymous Inbox with your link vyzun.app/ask/@username; secrets burn after 24 hours; every secret is AI-moderated and can be reported or the sender blocked.",
  "Campus Map: 'Pin Yours - $5', 'Loot Box - $1.99', VIP Halo $4.99/mo and an Inter-Campus Battle Pass for $1.99.",
  "Reels: For You, Vibe With and Trending feeds; double-tap to like; the + button opens the Reel Creator Studio with camera, timer, music, filters, text and stickers; privacy can be Public, Secret Drop or Friends Only.",
  "Profile: Trophy Cabinet badges; the Settings gear holds the VYZUN Platinum Pass and Creator Dashboard.",
  "Safety and help: report or block from any message menu; support email vyzun.global@gmail.com.",
].join("\n");
