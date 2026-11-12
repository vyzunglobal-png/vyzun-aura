import { Bell, QrCode, Search } from "lucide-react";
import { Logo, Wordmark } from "./Logo";

export function AppHeader({ onSearch, onQr }: { onSearch?: () => void; onQr?: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-background/70 px-5 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <Logo className="h-9 w-9" />
        <Wordmark className="text-xl" />
      </div>
      <div className="flex items-center gap-2">
        {onQr && (
          <button
            onClick={onQr}
            aria-label="Scan or show QR code"
            className="qr-header-btn grid h-10 w-10 place-items-center rounded-xl tap active:tap-active"
          >
            <QrCode className="h-4.5 w-4.5" />
          </button>
        )}
        <button
          onClick={onSearch}
          aria-label="Search VYZUN"
          className="grid h-10 w-10 place-items-center rounded-xl border border-glass-border tap active:tap-active"
        >
          <Search className="h-4.5 w-4.5" />
        </button>
        <button
          aria-label="Notifications"
          className="grid h-10 w-10 place-items-center rounded-xl border border-glass-border tap active:tap-active"
        >
          <Bell className="h-4.5 w-4.5" />
        </button>
      </div>
    </header>
  );
}
