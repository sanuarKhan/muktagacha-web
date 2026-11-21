// Open the floating chat box from anywhere (e.g. "Message shop" buttons).
// ChatWidget listens for this event; optionally jumps straight into a chat.
export const OPEN_CHAT_EVENT = "mk:open-chat";

export function openChat(opts: { tab?: "shops" | "people"; conversationId?: string } = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT, { detail: opts }));
}
