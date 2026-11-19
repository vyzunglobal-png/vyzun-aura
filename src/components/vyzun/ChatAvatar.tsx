import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chat profile picture in the same square (squircle) shape and neon frame as
 * the Profile page picture, so every chat looks consistent with profiles.
 */
export function ChatAvatar({ username, avatarUrl, className }: { username?: string | null | undefined; avatarUrl?: string | null | undefined; className?: string | undefined }) {
  return (
    <span className={cn("profile-squircle grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[30%] border-2 border-cyan bg-gradient-vyzun text-base font-bold text-primary-foreground", className)}>
      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : username?.[0]?.toUpperCase() ?? <MessageCircle className="h-4 w-4" />}
    </span>
  );
}
