"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { apiFetch } from "@/lib/api";

interface Broadcast {
  id: string;
  name: string;
  message: string;
  status: string;
  platformType: string | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  _count?: { recipients: number };
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

export default function BroadcastsPage() {
  const token = useAuthStore((s) => s.token);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    message: "",
    platformType: "",
    filterTags: [] as string[],
    scheduledAt: "",
    timeZone:
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Bangkok",
  });

  useEffect(() => {
    loadBroadcasts();
    loadTags();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const hasSending = broadcasts.some((b) => b.status === "sending");
    if (!hasSending) return;

    const interval = setInterval(() => {
      loadBroadcasts();
    }, 3000);

    return () => clearInterval(interval);
  }, [broadcasts, token]);

  const loadBroadcasts = async () => {
    if (!token) return;
    try {
      setBroadcasts(await apiFetch("/api/broadcasts", token));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    if (!token) return;
    try {
      setTags(await apiFetch("/api/contacts/tags", token));
    } catch (e) {
      console.error(e);
    }
  };

  const openEdit = (b: Broadcast) => {
    setEditingId(b.id);
    setFormData({
      name: b.name,
      message: b.message,
      platformType: b.platformType || "",
      filterTags: [],
      scheduledAt: b.scheduledAt
        ? new Date(b.scheduledAt).toISOString().slice(0, 16)
        : "",
      timeZone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Bangkok",
    });
    setShowForm(true);
  };

  const saveBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const body: any = {
        name: formData.name,
        message: formData.message,
      };

      if (formData.platformType) body.platformType = formData.platformType;
      if (formData.filterTags.length) body.filterTags = formData.filterTags;
      if (formData.scheduledAt) {
        body.scheduledAt = formData.scheduledAt;
        body.timeZone = formData.timeZone;
      }

      if (editingId) {
        await apiFetch(`/api/broadcasts/${editingId}`, token, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/api/broadcasts", token, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: "",
        message: "",
        platformType: "",
        filterTags: [],
        scheduledAt: "",
        timeZone:
          Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Bangkok",
      });

      loadBroadcasts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const sendBroadcast = async (id: string) => {
    if (
      !confirm("Send this broadcast now? This action cannot be undone.") ||
      !token
    )
      return;
    setSending(id);
    try {
      await apiFetch(`/api/broadcasts/${id}/send`, token, { method: "POST" });
      loadBroadcasts();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(null);
    }
  };

  const deleteBroadcast = async (id: string) => {
    if (!confirm("Delete this broadcast?") || !token) return;
    try {
      await apiFetch(`/api/broadcasts/${id}`, token, { method: "DELETE" });
      loadBroadcasts();
    } catch (err: any) {
      alert(err.message);
    }
  };
  const pauseBroadcast = async (id: string) => {
    if (!token) return;
    await apiFetch(`/api/broadcasts/${id}/pause`, token, {
      method: "PATCH",
    });
    loadBroadcasts();
  };

  const resumeBroadcast = async (id: string) => {
    if (!token) return;
    await apiFetch(`/api/broadcasts/${id}/resume`, token, {
      method: "PATCH",
    });
    loadBroadcasts();
  };

  const statusStyles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    scheduled: "bg-amber-100 text-amber-700",
    sending: "bg-blue-100 text-blue-700",
    sent: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  const toggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      filterTags: prev.filterTags.includes(tagId)
        ? prev.filterTags.filter((t) => t !== tagId)
        : [...prev.filterTags, tagId],
    }));
  };

  const canSendNow = (status: string) =>
    ["draft", "scheduled", "failed"].includes(status);
  const canDelete = (status: string) => status !== "sending";

  return (
    <div className="h-screen bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50 p-4 sm:p-6 lg:p-8 overflow-auto relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-violet-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-fuchsia-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent mb-1">
              Broadcasts
            </h1>
            <p className="text-gray-600">
              Send messages to multiple customers at once
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Broadcast
          </button>
        </div>

        {/* Create Form Modal */}
        {showForm && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingId ? "Edit Broadcast" : "Create Broadcast"}
              </h2>
              <form onSubmit={saveBroadcast} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Campaign Name
                  </label>
                  <input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                    placeholder="e.g. Summer Promotion"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    required
                    rows={4}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none resize-none"
                    placeholder="Type your broadcast message..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Platform (optional)
                  </label>
                  <select
                    value={formData.platformType}
                    onChange={(e) =>
                      setFormData({ ...formData, platformType: e.target.value })
                    }
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                  >
                    <option value="">All Platforms</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Filter by Tags (optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTag(t.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${formData.filterTags.includes(t.id) ? "ring-2 ring-offset-1 ring-violet-400 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        style={
                          formData.filterTags.includes(t.id)
                            ? { backgroundColor: t.color }
                            : {}
                        }
                      >
                        {t.name}
                      </button>
                    ))}
                    {tags.length === 0 && (
                      <p className="text-sm text-gray-400">
                        No tags created yet
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Schedule (optional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          scheduledAt: e.target.value,
                        })
                      }
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                    />
                    <select
                      value={formData.timeZone}
                      onChange={(e) =>
                        setFormData({ ...formData, timeZone: e.target.value })
                      }
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                    >
                      <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                      <option value="UTC">UTC (GMT+0)</option>
                      {Intl.supportedValuesOf("timeZone")
                        .filter((tz) => !["Asia/Bangkok", "UTC"].includes(tz))
                        .map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-fuchsia-700 transition-all"
                  >
                    {editingId ? "Update" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Broadcasts List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-20 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40">
            <div className="text-6xl mb-4">📢</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Broadcasts Yet
            </h3>
            <p className="text-gray-500 mb-6">
              Create your first broadcast to reach all your customers
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-semibold rounded-xl shadow-md"
            >
              Create Broadcast
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {broadcasts.map((b) => (
              <div
                key={b.id}
                className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-5 border border-white/40 hover:shadow-2xl transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900 text-lg">{b.name}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[b.status] || statusStyles.draft}`}
                  >
                    {b.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {b.message}
                </p>
                {b.status === "scheduled" && b.scheduledAt && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg mb-4 w-fit">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10m-11 8h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Scheduled for {new Date(b.scheduledAt).toLocaleString()}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded-xl">
                    <div className="text-lg font-bold text-gray-900">
                      {b.totalRecipients}
                    </div>
                    <div className="text-xs text-gray-500">Recipients</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-xl">
                    <div className="text-lg font-bold text-green-700">
                      {b.sentCount}
                    </div>
                    <div className="text-xs text-gray-500">Sent</div>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded-xl">
                    <div className="text-lg font-bold text-red-700">
                      {b.failedCount}
                    </div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                </div>
                {b.platformType && (
                  <p className="text-xs text-gray-500 mb-3">
                    Platform: {b.platformType}
                  </p>
                )}
                <div className="flex gap-2">
                  {["draft", "scheduled", "paused"].includes(b.status) && (
                    <button
                      onClick={() => openEdit(b)}
                      className="px-3 py-2 bg-white/70 backdrop-blur-md border border-gray-200 hover:border-violet-300 hover:bg-violet-50 text-gray-700 hover:text-violet-700 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1 shadow-sm hover:shadow-md"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5h2m-1-1v2m-6.293 9.293a1 1 0 011.414 0L10 16l7.293-7.293a1 1 0 111.414 1.414L10 19H5v-5l6.707-6.707z"
                        />
                      </svg>
                      Edit
                    </button>
                  )}
                  {/* Pause */}
                  {b.status === "scheduled" && (
                    <button
                      onClick={() => pauseBroadcast(b.id)}
                      className="px-3 py-2 bg-white/70 backdrop-blur-md border border-gray-200 hover:border-amber-300 hover:bg-amber-50 text-gray-700 hover:text-amber-700 rounded-lg text-sm font-semibold transition-all duration-200"
                    >
                      Pause
                    </button>
                  )}

                  {/* Resume */}
                  {b.status === "paused" && (
                    <button
                      onClick={() => resumeBroadcast(b.id)}
                      className="px-3 py-2 bg-white/70 backdrop-blur-md border border-gray-200 hover:border-green-300 hover:bg-green-50 text-gray-700 hover:text-green-700 rounded-lg text-sm font-semibold transition-all duration-200"
                    >
                      Resume
                    </button>
                  )}
                  {canSendNow(b.status) && (
                    <button
                      onClick={() => sendBroadcast(b.id)}
                      disabled={sending === b.id}
                      className="flex-1 px-3 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                    >
                      {sending === b.id ? "Sending..." : "Send Now"}
                    </button>
                  )}
                  {canDelete(b.status) && (
                    <button
                      onClick={() => deleteBroadcast(b.id)}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold transition-all"
                    >
                      Delete
                    </button>
                  )}
                  {b.status === "sent" && b.sentAt && (
                    <div className="text-sm font-medium text-gray-700">
                      Sent {new Date(b.sentAt).toLocaleDateString()} at{" "}
                      {new Date(b.sentAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                  {b.status === "sending" && (
                    <span className="text-sm text-blue-600 font-medium animate-pulse">
                      ⏳ Sending in progress...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
