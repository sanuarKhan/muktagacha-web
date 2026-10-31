"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatSocket } from "@/lib/use-chat-socket";
import { api } from "@/lib/api";
import type { GroupPost } from "@/lib/types";

export default function TopicPageWrapper() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-5 sm:px-8 py-10 text-[var(--color-ink-500)]">Loading…</div>}>
      <TopicPage />
    </Suspense>
  );
}

function TopicPage() {
  const { groupId, topicId } = useParams<{ groupId: string; topicId: string }>();
  const { user, token } = useAuth();
  const socketRef = useChatSocket(token);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [draft, setDraft] = useState("");
  const [anonPost, setAnonPost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messagedIds, setMessagedIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .get<GroupPost[]>(`/groups/topics/${topicId}/posts`, token)
      .then(setPosts)
      .finally(() => setLoading(false));

    const socket = socketRef.current;
    if (socket) {
      socket.emit("topic:join", { topicId });
      const handler = (post: GroupPost) => {
        if (post.topicId === topicId) setPosts((prev) => [...prev, post]);
      };
      socket.on("topic:post", handler);
      return () => {
        socket.off("topic:post", handler);
        socket.emit("topic:leave", { topicId });
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [posts]);

  async function handleSend() {
    if (!draft.trim() || !token) return;
    const body = draft.trim();
    const isAnonymous = anonPost;
    setDraft("");
    setAnonPost(false);
    try {
      const post = await api.post<GroupPost>(`/groups/topics/${topicId}/posts`, { body, isAnonymous }, token);
      setPosts((prev) => [...prev, post]);
    } catch {
      setDraft(body);
    }
  }

  async function handleMessage(recipientId: string) {
    if (!token) return;
    await api.post(
      "/direct-messages/conversations",
      { recipientId, body: "Hi! Saw your post in the community." },
      token
    );
    setMessagedIds((prev) => new Set(prev).add(recipientId));
  }

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10 flex flex-col h-[calc(100vh-4rem)]">
      <Link href={`/community/${groupId}`} className="text-sm text-[var(--color-ink-500)] mb-3 inline-block">
        ← Back to topics
      </Link>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading ? (
          <p className="text-sm text-[var(--color-ink-500)]">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-500)]">No posts yet — start the conversation.</p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="bg-white rounded-[var(--radius-sm)] shadow-card px-3.5 py-2.5">
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <div className="flex items-baseline gap-2">
                  <span className={`text-sm font-medium ${p.isAnonymous ? "italic text-[var(--color-ink-500)]" : "text-[var(--color-ink-900)]"}`}>
                    {p.isAnonymous ? "Anonymous" : p.author?.fullName ?? "Someone"}
                  </span>
                  {!p.isAnonymous && p.authorId === user?.id && (
                    <span className="text-[10px] text-[var(--color-emerald-700)]">you</span>
                  )}
                </div>
                {!p.isAnonymous && p.authorId !== user?.id && (
                  <button
                    onClick={() => handleMessage(p.authorId)}
                    className="text-xs text-[var(--color-emerald-700)] font-medium shrink-0"
                  >
                    {messagedIds.has(p.authorId) ? "Sent ✓" : "Message"}
                  </button>
                )}
              </div>
              <p className="text-sm text-[var(--color-ink-700)]">{p.body}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="pt-3 border-t border-[var(--color-border)] mt-2">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Write something…"
            className="flex-1 text-sm rounded-[var(--radius-pill)] border border-[var(--color-border)] px-4 py-2 outline-none focus:border-[var(--color-emerald-500)]"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className="bg-[var(--color-emerald-600)] text-white text-sm font-medium rounded-[var(--radius-pill)] px-5 py-2 disabled:opacity-40"
          >
            Post
          </button>
        </div>
        <label className="flex items-center gap-1.5 mt-1.5 text-xs text-[var(--color-ink-500)] cursor-pointer">
          <input
            type="checkbox"
            checked={anonPost}
            onChange={(e) => setAnonPost(e.target.checked)}
            className="w-3.5 h-3.5"
          />
          Post anonymously
        </label>
      </div>
    </div>
  );
}
