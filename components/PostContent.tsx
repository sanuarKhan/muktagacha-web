"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { GroupPost } from "@/lib/types";

// Renders a group post body: plain text with clickable links, YouTube links
// shown as an embedded player, plus an optional photo or PDF attachment.

const YT = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})[^\s]*/g;
const URL_RE = /(https?:\/\/[^\s<]+)/g;

function youtubeIds(text: string) {
  const ids: string[] = [];
  for (const m of text.matchAll(YT)) if (!ids.includes(m[1])) ids.push(m[1]);
  return ids.slice(0, 3);
}

function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        URL_RE.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="text-[var(--color-emerald-700)] underline break-all">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export default function PostContent({ post, token }: { post: GroupPost; token: string | null }) {
  const [opening, setOpening] = useState(false);
  const [err, setErr] = useState("");
  const videos = youtubeIds(post.body || "");

  async function openPdf() {
    if (!token) return;
    setOpening(true);
    setErr("");
    // open the tab first (popup blockers), then point it at the signed link
    const win = window.open("", "_blank");
    try {
      const r = await api.get<{ url: string }>(`/groups/posts/${post.id}/file`, token);
      if (win) win.location.href = r.url;
      else window.location.href = r.url;
    } catch {
      win?.close();
      setErr("Couldn't open the file. Please try again.");
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="space-y-2">
      {post.body && (
        <p className="text-sm text-[var(--color-ink-700)] whitespace-pre-wrap break-words">
          <Linkified text={post.body} />
        </p>
      )}
      {videos.map((id) => (
        <div key={id} className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingTop: "56.25%" }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title="YouTube video"
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ))}
      {post.attachmentKind === "IMAGE" && post.attachmentRef && (
        <a href={post.attachmentRef} target="_blank" rel="noopener noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.attachmentRef} alt={post.attachmentName ?? "Photo"} className="rounded-xl max-h-80 w-auto object-contain bg-[var(--color-cream-100)]" loading="lazy" />
        </a>
      )}
      {post.attachmentKind === "PDF" && (
        <button
          onClick={openPdf}
          disabled={opening}
          className="w-full flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-cream-50,#fffdf8)] px-3 py-2.5 text-left hover:bg-[var(--color-cream-100)]"
        >
          <span className="w-9 h-9 rounded-lg bg-red-50 text-red-700 text-[10px] font-bold flex items-center justify-center shrink-0">PDF</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-[var(--color-ink-900)] truncate">{post.attachmentName || "Document.pdf"}</span>
            <span className="block text-[11px] text-[var(--color-ink-500)]">{opening ? "Opening…" : "Tap to open"}</span>
          </span>
        </button>
      )}
      {err && <p className="text-xs text-red-700">{err}</p>}
    </div>
  );
}
