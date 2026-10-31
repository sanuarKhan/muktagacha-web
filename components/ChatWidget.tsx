"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useChatSocket } from "@/lib/use-chat-socket";
import { api } from "@/lib/api";
import type { Conversation, Message } from "@/lib/types";

type DirectConversation = {
  id: string;
  userAId: string;
  userBId: string;
  userA?: { id: string; fullName: string; role: string };
  userB?: { id: string; fullName: string; role: string };
  messages?: Message[];
};

type Tab = "shops" | "people";

// Floating, glassmorphic chat launcher + panel — shown site-wide once a
// user is logged in. Two tabs: "Shops" (buyer<->vendor conversations) and
// "People" (buyer<->buyer direct messenger, like a normal messenger).
// Matches the brief: "transparent... like we did for Skode Digital" — a
// frosted/blurred glass surface rather than a solid opaque panel.
export default function ChatWidget() {
  const { user, token } = useAuth();
  const socketRef = useChatSocket(token);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("shops");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [directConvos, setDirectConvos] = useState<DirectConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isDirect = tab === "people";

  const unreadTotal =
    conversations.reduce((sum, c) => {
      const last = c.messages?.[0];
      return sum + (last && !last.readAt && last.senderId !== user?.id ? 1 : 0);
    }, 0) +
    directConvos.reduce((sum, c) => {
      const last = c.messages?.[0];
      return sum + (last && !last.readAt && last.senderId !== user?.id ? 1 : 0);
    }, 0);

  function loadConversations() {
    if (!token) return;
    api.get<Conversation[]>("/chat/conversations", token).then(setConversations).catch(() => {});
    api
      .get<DirectConversation[]>("/direct-messages/conversations", token)
      .then(setDirectConvos)
      .catch(() => {});
  }

  useEffect(() => {
    if (!token) return;
    loadConversations();
    const interval = setInterval(loadConversations, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!activeId || !token) return;
    const base = isDirect ? "/direct-messages" : "/chat";
    setLoading(true);
    api
      .get<Message[]>(`${base}/conversations/${activeId}/messages`, token)
      .then(setMessages)
      .finally(() => setLoading(false));
    api.post(`${base}/conversations/${activeId}/read`, {}, token).catch(() => {});

    const socket = socketRef.current;
    if (socket) {
      const joinEvent = isDirect ? "direct:join" : "conversation:join";
      const leaveEvent = isDirect ? "direct:leave" : "conversation:leave";
      const msgEvent = isDirect ? "direct:message" : "conversation:message";
      socket.emit(joinEvent, { conversationId: activeId });
      const handler = (msg: Message) => {
        if (msg.conversationId === activeId) {
          setMessages((prev) => [...prev, msg]);
        }
        loadConversations();
      };
      socket.on(msgEvent, handler);
      return () => {
        socket.off(msgEvent, handler);
        socket.emit(leaveEvent, { conversationId: activeId });
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, token, isDirect]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!draft.trim() || !activeId || !token) return;
    const base = isDirect ? "/direct-messages" : "/chat";
    const body = draft.trim();
    setDraft("");
    try {
      const msg = await api.post<Message>(`${base}/conversations/${activeId}/messages`, { body }, token);
      setMessages((prev) => [...prev, msg]);
    } catch {
      setDraft(body);
    }
  }

  function switchTab(next: Tab) {
    setTab(next);
    setActiveId(null);
    setMessages([]);
  }

  if (!user) return null;

  const activeShopConvo = conversations.find((c) => c.id === activeId);
  const activeDirectConvo = directConvos.find((c) => c.id === activeId);
  const directPeerName = (c: DirectConversation | undefined) => {
    if (!c) return "";
    const peer = c.userAId === user.id ? c.userB : c.userA;
    return peer?.fullName ?? "Conversation";
  };

  return (
    <>
      {/* Launcher button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center text-[var(--color-cream-50)] shadow-hover backdrop-blur-xl transition-transform hover:scale-105"
        style={{
          background: "linear-gradient(135deg, rgba(27,107,79,0.85), rgba(11,61,46,0.85))",
          border: "1px solid rgba(255,255,255,0.18)",
        }}
        aria-label="Open chat"
      >
        {unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-gold-500)] text-[10px] font-bold flex items-center justify-center text-[var(--color-ink-900)]">
            {unreadTotal}
          </span>
        )}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-5 z-50 w-[22rem] max-w-[calc(100vw-2.5rem)] h-[32rem] max-h-[calc(100vh-10rem)] rounded-[var(--radius-xl)] overflow-hidden flex flex-col shadow-elevated backdrop-blur-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.12) 100%)",
            backdropFilter: "blur(28px) saturate(170%)",
            WebkitBackdropFilter: "blur(28px) saturate(170%)",
            border: "1.5px solid rgba(255,255,255,0.55)",
            boxShadow: "0 24px 70px -20px rgba(0,0,0,0.35), inset 0 1.5px 0 rgba(255,255,255,0.65)",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between backdrop-blur-xl"
            style={{
              background: "rgba(11,61,46,0.55)",
              borderBottom: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {activeId ? (
              <button
                onClick={() => setActiveId(null)}
                className="flex items-center gap-2 text-[var(--color-cream-50)] text-sm font-medium"
              >
                <span>←</span>
                <span className="truncate max-w-[12rem]">
                  {isDirect
                    ? directPeerName(activeDirectConvo)
                    : user.role === "VENDOR"
                      ? activeShopConvo?.buyer?.fullName
                      : activeShopConvo?.organization?.name}
                </span>
              </button>
            ) : (
              <span className="text-[var(--color-cream-50)] font-semibold text-sm">Messages</span>
            )}
            <button onClick={() => setOpen(false)} className="text-[var(--color-cream-50)]/70 hover:text-[var(--color-cream-50)]">
              ✕
            </button>
          </div>

          {/* Tabs (hidden once a thread is open) */}
          {!activeId && (
            <div className="flex px-2 pt-2 gap-1">
              {(["shops", "people"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-[var(--radius-pill)] transition-colors ${
                    tab === t ? "bg-[var(--color-emerald-700)] text-white" : "text-[var(--color-ink-700)] hover:bg-white/30"
                  }`}
                >
                  {t === "shops" ? "Shops" : "People"}
                </button>
              ))}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {!activeId ? (
              isDirect ? (
                <DirectConversationList
                  conversations={directConvos}
                  currentUserId={user.id}
                  onSelect={setActiveId}
                />
              ) : (
                <ConversationList
                  conversations={conversations}
                  currentUserId={user.id}
                  onSelect={setActiveId}
                />
              )
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                  {loading ? (
                    <p className="text-center text-xs text-[var(--color-ink-500)] mt-6">Loading…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-xs text-[var(--color-ink-500)] mt-6">
                      No messages yet — say hello!
                    </p>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[80%] px-3 py-2 rounded-[var(--radius-md)] text-sm backdrop-blur-md ${
                          m.senderId === user.id ? "ml-auto" : "mr-auto"
                        }`}
                        style={{
                          background:
                            m.senderId === user.id
                              ? "rgba(27,107,79,0.8)"
                              : "rgba(255,255,255,0.55)",
                          color: m.senderId === user.id ? "var(--color-cream-50)" : "var(--color-ink-900)",
                          border: "1px solid rgba(255,255,255,0.3)",
                        }}
                      >
                        {m.body}
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>
                <div
                  className="p-2.5 flex gap-2 backdrop-blur-xl"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.3)" }}
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type a message…"
                    className="flex-1 bg-[var(--color-cream-50)]/60 rounded-[var(--radius-pill)] px-3.5 py-2 text-sm outline-none placeholder:text-[var(--color-ink-500)]"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-cream-50)] disabled:opacity-40 shrink-0"
                    style={{ background: "var(--color-emerald-600)" }}
                  >
                    ➤
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ConversationList({
  conversations,
  currentUserId,
  onSelect,
}: {
  conversations: Conversation[];
  currentUserId: string;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <p className="text-center text-xs text-[var(--color-ink-500)] mt-8 px-4">
        No conversations yet. Visit a shop page and tap &quot;Message shop&quot; to start one.
      </p>
    );
  }
  return (
    <div className="divide-y divide-white/30">
      {conversations.map((c) => {
        const last = c.messages?.[0];
        const unread = last && !last.readAt && last.senderId !== currentUserId;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="w-full text-left px-4 py-3 hover:bg-white/30 transition-colors flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-ink-900)] truncate">
                {c.organization?.name ?? c.buyer?.fullName ?? "Conversation"}
              </p>
              {last && (
                <p className="text-xs text-[var(--color-ink-500)] truncate">{last.body}</p>
              )}
            </div>
            {unread && <span className="w-2 h-2 rounded-full bg-[var(--color-gold-500)] shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

function DirectConversationList({
  conversations,
  currentUserId,
  onSelect,
}: {
  conversations: DirectConversation[];
  currentUserId: string;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <p className="text-center text-xs text-[var(--color-ink-500)] mt-8 px-4">
        No conversations yet. Message someone from the Community page to start one.
      </p>
    );
  }
  return (
    <div className="divide-y divide-white/30">
      {conversations.map((c) => {
        const peer = c.userAId === currentUserId ? c.userB : c.userA;
        const last = c.messages?.[0];
        const unread = last && !last.readAt && last.senderId !== currentUserId;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="w-full text-left px-4 py-3 hover:bg-white/30 transition-colors flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-ink-900)] truncate">
                {peer?.fullName ?? "Conversation"}
              </p>
              {last && (
                <p className="text-xs text-[var(--color-ink-500)] truncate">{last.body}</p>
              )}
            </div>
            {unread && <span className="w-2 h-2 rounded-full bg-[var(--color-gold-500)] shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
