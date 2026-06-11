"use client";

import { useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CCNotification, CCTone } from "./types";

const TONE_ICON: Record<CCTone, string> = {
  info: "ℹ️",
  warn: "⚠️",
  success: "✅",
  urgent: "🔴",
};

function relative(ts?: number): string {
  if (!ts) return "agora";
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/**
 * NotificationCenter — a glanceable bell that opens a floating panel. Each
 * notification is a signal that can EXPAND into a full MCP App: acting on
 * "3 cotas vencendo" launches the quota board widget inline in the chat.
 */
export function NotificationCenter({
  notifications,
  onLaunch,
  onOpen,
}: {
  notifications: CCNotification[];
  onLaunch: (prompt: string, ref: string) => void;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());

  const unread = useMemo(
    () => notifications.filter((n) => !seen.has(n.id)).length,
    [notifications, seen],
  );

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      onOpen();
      setSeen(new Set(notifications.map((n) => n.id)));
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="cc-bell"
          aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ""}`}
        >
          <span aria-hidden>🔔</span>
          {unread > 0 && (
            <span className="cc-bell-badge" aria-hidden>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={10}
        className="cc-notif-panel"
      >
        <header className="cc-notif-head">
          <strong>Notificações</strong>
          <span className="cc-notif-count">{notifications.length}</span>
        </header>
        {notifications.length === 0 ? (
          <p className="cc-notif-empty">Tudo em dia. Nada pendente. ✨</p>
        ) : (
          <ul className="cc-notif-list">
            {notifications.map((n) => (
              <li key={n.id} className={`cc-notif cc-notif--${n.tone ?? "info"}`}>
                <span className="cc-notif-ic" aria-hidden>
                  {TONE_ICON[n.tone ?? "info"]}
                </span>
                <div className="cc-notif-main">
                  <div className="cc-notif-title">
                    {n.title}
                    {typeof n.count === "number" && (
                      <span className="cc-notif-pill">{n.count}</span>
                    )}
                  </div>
                  {n.body && <p className="cc-notif-body">{n.body}</p>}
                  {n.launchPrompt && (
                    <button
                      className="cc-notif-cta"
                      onClick={() => {
                        onLaunch(n.launchPrompt!, `notif-${n.id}`);
                        setOpen(false);
                      }}
                    >
                      Abrir painel →
                    </button>
                  )}
                </div>
                <time className="cc-notif-time">{relative(n.ts)}</time>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
