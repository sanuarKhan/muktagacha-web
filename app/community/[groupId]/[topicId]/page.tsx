"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useChatSocket } from "@/lib/use-chat-socket";
import { api } from "@/lib/api";
import type { Group, GroupPost, GroupTopic } from "@/lib/types";
import PostContent from "@/components/PostContent";
import { uploadToCloudinary, uploadRawToCloudinary } from "@/lib/image-upload";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [topic, setTopic] = useState<GroupTopic | null>(null);
  const [myRole, setMyRole] = useState<Group["myRole"]>(null);
  const canManage = myRole === "OWNER" || myRole === "MODERATOR";
  const canPost = !topic?.ownerPostsOnly || canManage;

  useEffect(() => {
    if (!token) return;
    api.get<Group>(`/groups/${groupId}`, token).then((g) => setMyRole(g.myRole ?? null)).catch(() => {});
    api
      .get<GroupTopic[]>(`/groups/${groupId}/topics`, token)
      .then((ts) => setTopic(ts.find((t) => t.id === topicId) ?? null))
      .catch(() => {});
  }, [groupId, topicId, token]);

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
        if (post.topicId === topicId) setPosts((prev) => (prev.some((x) => x.id === post.id) ? prev : [...prev, post]));
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

  function pickFile(f: File | null) {
    setSendError("");
    if (!f) return setFile(null);
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    const isImg = f.type.startsWith("image/");
    if (!isPdf && !isImg) return setSendError("Only photos or PDF files can be attached.");
    if (isPdf && f.size > 10 * 1024 * 1024) return setSendError("PDF is too big (max 10 MB).");
    setFile(f);
  }

  async function handleSend() {
    if ((!draft.trim() && !file) || !token) return;
    const body = draft.trim();
    const isAnonymous = anonPost;
    setSendError("");
    setUploading(true);
    try {
      let attachment: Record<string, string> = {};
      if (file) {
        const getSig = () => api.get<any>(`/groups/${groupId}/upload-signature`, token);
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (isPdf) {
          const { publicId } = await uploadRawToCloudinary(file, getSig);
          attachment = { attachmentKind: "PDF", attachmentRef: publicId, attachmentName: file.name };
        } else {
          const url = await uploadToCloudinary(file, getSig);
          attachment = { attachmentKind: "IMAGE", attachmentRef: url, attachmentName: file.name };
        }
      }
      const post = await api.post<GroupPost>(`/groups/topics/${topicId}/posts`, { body, isAnonymous, ...attachment }, token);
      setPosts((prev) => (prev.some((x) => x.id === post.id) ? prev : [...prev, post]));
      setDraft("");
      setAnonPost(false);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      setSendError((Array.isArray(e?.message) ? e.message[0] : e?.message) || "Could not post. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function toggleOwnerOnly() {
    if (!token || !topic) return;
    const t = await api.patch<GroupTopic>(`/groups/topics/${topicId}`, { ownerPostsOnly: !topic.ownerPostsOnly }, token);
    setTopic({ ...topic, ownerPostsOnly: t.ownerPostsOnly });
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
    <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-10 pb-24 sm:pb-10 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between gap-2 mb-3">
        <Link href={`/community/${groupId}`} className="text-sm text-[var(--color-ink-500)]">
          ← Back to topics
        </Link>
        {topic && (
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--color-ink-900)]"># {topic.name}</span>
            {topic.ownerPostsOnly && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-gold-50)] text-[var(--color-gold-600)]">Announcements</span>
            )}
          </span>
        )}
      </div>
      {canManage && topic && (
        <label className="flex items-center gap-2 text-xs text-[var(--color-ink-500)] mb-3 cursor-pointer">
          <input type="checkbox" checked={!!topic.ownerPostsOnly} onChange={toggleOwnerOnly} className="w-3.5 h-3.5" />
          Only owner &amp; moderators can post here (for lessons / announcements)
        </label>
      )}
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
              <PostContent post={p} token={token} />
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      {!canPost ? (
        <p className="pt-3 border-t border-[var(--color-border)] mt-2 text-xs text-[var(--color-ink-500)] text-center">
          Only the group owner and moderators post in this topic. Ask questions in another topic.
        </p>
      ) : (
      <div className="pt-3 border-t border-[var(--color-border)] mt-2">
        {file && (
          <div className="flex items-center justify-between gap-2 mb-2 text-xs bg-[var(--color-cream-100)] rounded-lg px-3 py-1.5">
            <span className="truncate">📎 {file.name}</span>
            <button onClick={() => pickFile(null)} className="text-[var(--color-ink-500)]">Remove</button>
          </div>
        )}
        {sendError && <p className="text-xs text-red-700 mb-2">{sendError}</p>}
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Attach a photo or PDF"
            aria-label="Attach a photo or PDF"
            className="w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-ink-500)] hover:bg-[var(--color-cream-100)] shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" /></svg>
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !uploading && handleSend()}
            placeholder="Write, paste a YouTube link, or attach a file…"
            className="flex-1 text-sm rounded-[var(--radius-pill)] border border-[var(--color-border)] px-4 py-2 outline-none focus:border-[var(--color-emerald-500)]"
          />
          <button
            onClick={handleSend}
            disabled={uploading || (!draft.trim() && !file)}
            className="bg-[var(--color-emerald-600)] text-white text-sm font-medium rounded-[var(--radius-pill)] px-5 py-2 disabled:opacity-40"
          >
            {uploading ? "Posting…" : "Post"}
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
      )}
    </div>
  );
}
