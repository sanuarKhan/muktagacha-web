"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Group, GroupTopic } from "@/lib/types";

export default function GroupPageWrapper() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 text-[var(--color-ink-500)]">Loading…</div>}>
      <GroupPage />
    </Suspense>
  );
}

function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { token } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [topics, setTopics] = useState<GroupTopic[]>([]);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [topicName, setTopicName] = useState("");

  function loadGroup() {
    api.get<Group>(`/groups/${groupId}`).then(setGroup);
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
    await api.post(`/groups/${groupId}/join`, {}, token);
    loadTopics();
    loadGroup();
  }

  async function handleCreateTopic() {
    if (!topicName.trim() || !token) return;
    try {
      await api.post(`/groups/${groupId}/topics`, { name: topicName.trim() }, token);
      setTopicName("");
      setShowTopicForm(false);
      loadTopics();
    } catch (err) {
      const e = err as { message?: string | string[] };
      setError(Array.isArray(e.message) ? e.message[0] : e.message ?? "Could not create topic");
    }
  }

  if (!group) return <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 text-[var(--color-ink-500)]">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
      <Link href="/community" className="text-sm text-[var(--color-ink-500)] mb-4 inline-block">
        ← All groups
      </Link>
      <div className="flex items-start justify-between mb-2 gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)]">{group.name}</h1>
          {group.description && <p className="text-[var(--color-ink-500)] mt-1">{group.description}</p>}
        </div>
        {!joined && (
          <button
            onClick={handleJoin}
            className="shrink-0 text-sm font-medium bg-[var(--color-emerald-700)] text-white px-4 py-2 rounded-[var(--radius-pill)]"
          >
            Join group
          </button>
        )}
      </div>
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
          <div className="space-y-2">
            {topics.map((t) => (
              <Link
                key={t.id}
                href={`/community/${groupId}/${t.id}`}
                className="block bg-white rounded-[var(--radius-sm)] shadow-card hover:shadow-hover-card transition-shadow px-4 py-3"
              >
                <span className="font-medium text-[var(--color-ink-900)]"># {t.name}</span>
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
