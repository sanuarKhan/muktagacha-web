"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Group, GroupTopic } from "@/lib/types";
import ShareGroupButton from "@/components/ShareGroupButton";
import GroupManagePanel from "@/components/GroupManagePanel";

export default function GroupPageWrapper() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 text-[var(--color-ink-500)]">Loading…</div>}>
      <GroupPage />
    </Suspense>
  );
}

function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, token } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [topics, setTopics] = useState<GroupTopic[]>([]);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [topicName, setTopicName] = useState("");
  const [topicOwnerOnly, setTopicOwnerOnly] = useState(false);
  const [justCreated, setJustCreated] = useState(false);
  const [invite, setInvite] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setJustCreated(sp.get("created") === "1");
    setInvite(sp.get("invite"));
  }, []);

  function loadGroup() {
    // Without a catch, any failure left `group` null and the page stuck on
    // its loading state forever with no explanation.
    const inv = invite ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("invite") : null);
    api
      .get<Group>(`/groups/${groupId}${inv ? `?invite=${encodeURIComponent(inv)}` : ""}`, token ?? undefined)
      .then((g) => {
        setGroup(g);
        setNotFound(false);
      })
      .catch((e: { statusCode?: number; status?: number }) => {
        if (e?.statusCode === 404 || e?.status === 404) setNotFound(true);
        else setError("Couldn't load this group. Please refresh and try again.");
      });
  }

  function loadTopics() {
    if (!token) return;
    api
      .get<GroupTopic[]>(`/groups/${groupId}/topics`, token)
      .then((t) => {
        setTopics(t);
        setJoined(true);
      })
      .catch(() => setJoined(false));
  }

  useEffect(() => {
    loadGroup();
    loadTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, token]);

  async function handleJoin() {
    if (!token) {
      setError("Log in to join this group.");
      return;
    }
    try {
      await api.post(`/groups/${groupId}/join`, invite ? { invite } : {}, token);
      loadTopics();
      loadGroup();
    } catch (e: any) {
      setError((Array.isArray(e?.message) ? e.message[0] : e?.message) || "Could not join");
    }
  }

  async function handleCreateTopic() {
    if (!topicName.trim() || !token) return;
    try {
      await api.post(`/groups/${groupId}/topics`, { name: topicName.trim(), ownerPostsOnly: topicOwnerOnly }, token);
      setTopicName("");
      setTopicOwnerOnly(false);
      setShowTopicForm(false);
      loadTopics();
    } catch (err) {
      const e = err as { message?: string | string[] };
      setError(Array.isArray(e.message) ? e.message[0] : e.message ?? "Could not create topic");
    }
  }

  if (notFound)
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
        <Link href="/community" className="text-sm text-[var(--color-ink-500)] mb-4 inline-block">← All groups</Link>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)]">Group not available</h1>
        <p className="text-[var(--color-ink-500)] mt-2">
          This group doesn&apos;t exist, or it&apos;s a private group. Ask the group owner for an invite link
          {!token ? " and log in first" : ""}.
        </p>
      </div>
    );
  if (!group) return <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 text-[var(--color-ink-500)]">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
      <Link href="/community" className="text-sm text-[var(--color-ink-500)] mb-4 inline-block">
        ← All groups
      </Link>
      <div className="flex items-start justify-between mb-2 gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)] flex items-center gap-2 flex-wrap">
            {group.name}
            {group.isPrivate && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-ink-900)] text-white"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="inline -mt-0.5 mr-1"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>Private</span>
            )}
          </h1>
          {group.description && <p className="text-[var(--color-ink-500)] mt-1">{group.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 justify-end">
          {!group.isPrivate && <ShareGroupButton groupId={group.id} groupName={group.name} />}
          {!joined && (
            <button
              onClick={handleJoin}
              className="text-sm font-medium bg-[var(--color-emerald-700)] text-white px-4 py-2 rounded-[var(--radius-pill)]"
            >
              Join group
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-[var(--color-ink-500)] mb-2">{group._count?.members ?? 0} member{(group._count?.members ?? 0) === 1 ? "" : "s"}</p>
      {(group.myRole === "OWNER" || group.myRole === "MODERATOR") && token && user && (
        <GroupManagePanel
          groupId={group.id}
          groupName={group.name}
          isPrivate={!!group.isPrivate}
          myRole={group.myRole}
          myUserId={user.id}
          token={token}
          onChanged={loadGroup}
        />
      )}
      {invite && !joined && (
        <p className="text-sm text-[var(--color-emerald-700)] bg-[var(--color-emerald-50)] rounded-lg px-3 py-2 my-3">
          You&apos;ve been invited to this group. {token ? "Tap Join group." : "Log in, then tap Join group."}
        </p>
      )}
      {justCreated && (
        <p className="text-sm text-[var(--color-emerald-700)] bg-[var(--color-emerald-50)] rounded-lg px-3 py-2 mb-3">
          Your group is ready. Tap <b>Share group</b> to invite people on WhatsApp or Facebook.
        </p>
      )}
      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

      {!joined ? (
        <p className="text-sm text-[var(--color-ink-500)] mt-6">
          Join this group to see its topics and start discussing.
        </p>
      ) : (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-ink-900)]">Topics</h2>
            <button
              onClick={() => setShowTopicForm((v) => !v)}
              className="text-xs font-medium text-[var(--color-emerald-700)]"
            >
              {showTopicForm ? "Cancel" : "+ New topic"}
            </button>
          </div>
          {showTopicForm && (
            <div className="flex gap-2 mb-4">
              <input
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTopic()}
                placeholder="Topic name — e.g. Buy & Sell"
                className="flex-1 text-sm rounded-[var(--radius-pill)] border border-[var(--color-border)] px-3 py-1.5 outline-none focus:border-[var(--color-emerald-500)]"
              />
              <button
                onClick={handleCreateTopic}
                disabled={!topicName.trim()}
                className="text-sm font-medium bg-[var(--color-emerald-600)] text-white px-4 py-1.5 rounded-[var(--radius-pill)] disabled:opacity-40"
              >
                Create
              </button>
            </div>
          )}
          {showTopicForm && (group.myRole === "OWNER" || group.myRole === "MODERATOR") && (
            <label className="flex items-center gap-2 text-xs text-[var(--color-ink-500)] -mt-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={topicOwnerOnly} onChange={(e) => setTopicOwnerOnly(e.target.checked)} className="w-3.5 h-3.5" />
              Announcements topic — only owner &amp; moderators can post (good for lessons)
            </label>
          )}
          <div className="space-y-2">
            {topics.map((t) => (
              <Link
                key={t.id}
                href={`/community/${groupId}/${t.id}`}
                className="block bg-white rounded-[var(--radius-sm)] shadow-card hover:shadow-hover-card transition-shadow px-4 py-3"
              >
                <span className="font-medium text-[var(--color-ink-900)]"># {t.name}</span>
                {t.ownerPostsOnly && (
                  <span className="text-[10px] font-medium ml-2 px-2 py-0.5 rounded-full bg-[var(--color-gold-50)] text-[var(--color-gold-600)]">Announcements</span>
                )}
                <span className="text-xs text-[var(--color-ink-500)] ml-2">
                  {t._count?.posts ?? 0} posts
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
