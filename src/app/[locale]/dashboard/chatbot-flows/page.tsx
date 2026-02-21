"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { apiFetch } from "@/lib/api";

interface FlowQuickReplyOption {
  title: string;
  payload: string;
}

interface FlowButtonOption {
  type: "postback" | "web_url";
  title: string;
  payload?: string;
  url?: string;
}

interface FlowCarouselCard {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttons?: FlowButtonOption[];
}

interface FlowNode {
  id: string;
  type:
    | "message"
    | "condition"
    | "delay"
    | "action"
    | "collect_input"
    | "location"
    | "quick_replies"
    | "buttons"
    | "carousel";
  data: {
    text?: string;
    imageUrl?: string;
    quickReplies?: FlowQuickReplyOption[];
    buttons?: FlowButtonOption[];
    cards?: FlowCarouselCard[];
    variable?: string;
    operator?: string;
    value?: string;
    delayMs?: number;
    action?: string;
    actionValue?: string;
    prompt?: string;
    saveAs?: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
    locationAddress?: string;
  };
  nextNodeId?: string | null;
  conditionTrueNodeId?: string | null;
  conditionFalseNodeId?: string | null;
}

interface ChatbotFlow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerKeywords: string[] | null;
  nodes: FlowNode[];
  createdAt: string;
}

const inferFlowGroupKey = (flow: ChatbotFlow) => {
  const desc = (flow.description || "").trim();
  const descGroup = desc.match(/\bgroup\s*:\s*([a-zA-Z0-9_-]+)/i)?.[1];
  if (descGroup) return descGroup.toLowerCase();

  const name = (flow.name || "").trim().toLowerCase();
  if (!name) return "general";

  const parts = name.split("-").filter(Boolean);
  if (parts.length === 0) return "general";
  if (parts[0] === "main" && parts[1]) return parts[1];

  return parts[0];
};

const formatFlowGroupLabel = (groupKey: string) =>
  groupKey
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const NODE_TYPES = [
  { value: "message", label: "Message", desc: "Send a text message" },
  {
    value: "quick_replies",
    label: "Quick Replies",
    desc: "Send selectable reply chips",
  },
  {
    value: "buttons",
    label: "Buttons",
    desc: "Send a button template",
  },
  {
    value: "carousel",
    label: "Carousel",
    desc: "Send multiple cards with actions",
  },
  {
    value: "condition",
    label: "Condition",
    desc: "Branch based on condition",
  },
  { value: "delay", label: "Delay", desc: "Wait before next step" },
  { value: "action", label: "Action", desc: "Perform an action" },
  {
    value: "collect_input",
    label: "Collect Input",
    desc: "Ask user for input",
  },
  { value: "location", label: "Location", desc: "Send map location" },
];

const ACTIONS = [
  { value: "request_human", label: "Request Human Agent" },
  { value: "close", label: "Close Conversation" },
  { value: "add_tag", label: "Add Tag" },
];

export default function ChatbotFlowsPage() {
  const token = useAuthStore((s) => s.token);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ChatbotFlow | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    triggerKeywords: "",
    nodes: [] as FlowNode[],
  });
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    loadFlows();
  }, [token]);

  const loadFlows = async () => {
    if (!token) return;
    try {
      setFlows(await apiFetch("/api/chatbot-flows", token));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addNode = (type: FlowNode["type"]) => {
    const id = generateId();
    const node: FlowNode = { id, type, data: {}, nextNodeId: null };
    if (type === "message") node.data.text = "";
    if (type === "quick_replies") {
      node.data.text = "Please choose an option:";
      node.data.quickReplies = [{ title: "Option 1", payload: "OPTION_1" }];
    }
    if (type === "buttons") {
      node.data.text = "Please choose an option:";
      node.data.buttons = [
        { type: "postback", title: "Button 1", payload: "BUTTON_1" },
      ];
    }
    if (type === "carousel") {
      node.data.text = "";
      node.data.cards = [
        {
          title: "Card title",
          subtitle: "Card subtitle",
          imageUrl: "",
          buttons: [
            { type: "postback", title: "View", payload: "CARD_VIEW_1" },
          ],
        },
      ];
    }
    if (type === "condition") {
      node.data.variable = "message";
      node.data.operator = "contains";
      node.data.value = "";
      node.conditionTrueNodeId = null;
      node.conditionFalseNodeId = null;
    }
    if (type === "delay") node.data.delayMs = 1000;
    if (type === "action") {
      node.data.action = "request_human";
    }
    if (type === "collect_input") {
      node.data.prompt = "";
      node.data.saveAs = "user_input";
    }
    if (type === "location") {
      node.data.latitude = 0;
      node.data.longitude = 0;
      node.data.locationName = "";
      node.data.locationAddress = "";
    }

    // Link from previous node
    const nodes = [...formData.nodes];
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      lastNode.nextNodeId = id;
    }
    setFormData({ ...formData, nodes: [...nodes, node] });
  };

  const updateNode = (idx: number, data: Partial<FlowNode["data"]>) => {
    const nodes = [...formData.nodes];
    nodes[idx] = { ...nodes[idx], data: { ...nodes[idx].data, ...data } };
    setFormData({ ...formData, nodes });
  };

  const updateQuickReply = (
    nodeIdx: number,
    replyIdx: number,
    patch: Partial<FlowQuickReplyOption>,
  ) => {
    const nodes = [...formData.nodes];
    const quickReplies = [...(nodes[nodeIdx].data.quickReplies || [])];
    quickReplies[replyIdx] = { ...quickReplies[replyIdx], ...patch };
    nodes[nodeIdx] = {
      ...nodes[nodeIdx],
      data: { ...nodes[nodeIdx].data, quickReplies },
    };
    setFormData({ ...formData, nodes });
  };

  const addQuickReply = (nodeIdx: number) => {
    const nodes = [...formData.nodes];
    const quickReplies = [...(nodes[nodeIdx].data.quickReplies || [])];
    quickReplies.push({
      title: `Option ${quickReplies.length + 1}`,
      payload: `OPTION_${quickReplies.length + 1}`,
    });
    nodes[nodeIdx] = {
      ...nodes[nodeIdx],
      data: { ...nodes[nodeIdx].data, quickReplies },
    };
    setFormData({ ...formData, nodes });
  };

  const removeQuickReply = (nodeIdx: number, replyIdx: number) => {
    const nodes = [...formData.nodes];
    const quickReplies = [...(nodes[nodeIdx].data.quickReplies || [])];
    quickReplies.splice(replyIdx, 1);
    nodes[nodeIdx] = {
      ...nodes[nodeIdx],
      data: { ...nodes[nodeIdx].data, quickReplies },
    };
    setFormData({ ...formData, nodes });
  };

  const updateButton = (
    nodeIdx: number,
    buttonIdx: number,
    patch: Partial<FlowButtonOption>,
  ) => {
    const nodes = [...formData.nodes];
    const buttons = [...(nodes[nodeIdx].data.buttons || [])];
    const nextButton: FlowButtonOption = { ...buttons[buttonIdx], ...patch };
    if (nextButton.type === "web_url") {
      delete nextButton.payload;
      nextButton.url = nextButton.url || "";
    } else {
      delete nextButton.url;
      nextButton.payload = nextButton.payload || "";
    }
    buttons[buttonIdx] = nextButton;
    nodes[nodeIdx] = {
      ...nodes[nodeIdx],
      data: { ...nodes[nodeIdx].data, buttons },
    };
    setFormData({ ...formData, nodes });
  };

  const addButton = (nodeIdx: number) => {
    const nodes = [...formData.nodes];
    const buttons = [...(nodes[nodeIdx].data.buttons || [])];
    buttons.push({
      type: "postback",
      title: `Button ${buttons.length + 1}`,
      payload: `BUTTON_${buttons.length + 1}`,
    });
    nodes[nodeIdx] = {
      ...nodes[nodeIdx],
      data: { ...nodes[nodeIdx].data, buttons },
    };
    setFormData({ ...formData, nodes });
  };

  const removeButton = (nodeIdx: number, buttonIdx: number) => {
    const nodes = [...formData.nodes];
    const buttons = [...(nodes[nodeIdx].data.buttons || [])];
    buttons.splice(buttonIdx, 1);
    nodes[nodeIdx] = {
      ...nodes[nodeIdx],
      data: { ...nodes[nodeIdx].data, buttons },
    };
    setFormData({ ...formData, nodes });
  };

  const updateCard = (
    nodeIdx: number,
    cardIdx: number,
    patch: Partial<FlowCarouselCard>,
  ) => {
    const nodes = [...formData.nodes];
    const cards = [...(nodes[nodeIdx].data.cards || [])];
    cards[cardIdx] = { ...cards[cardIdx], ...patch };
    nodes[nodeIdx] = {
      ...nodes[nodeIdx],
      data: { ...nodes[nodeIdx].data, cards },
    };
    setFormData({ ...formData, nodes });
  };

  const addCard = (nodeIdx: number) => {
    const nodes = [...formData.nodes];
    const cards = [...(nodes[nodeIdx].data.cards || [])];
    cards.push({
      title: `Card ${cards.length + 1}`,
      subtitle: "",
      imageUrl: "",
      buttons: [
        { type: "postback", title: "View", payload: `CARD_${cards.length + 1}` },
      ],
    });
    nodes[nodeIdx] = {
      ...nodes[nodeIdx],
      data: { ...nodes[nodeIdx].data, cards },
    };
    setFormData({ ...formData, nodes });
  };

  const removeCard = (nodeIdx: number, cardIdx: number) => {
    const nodes = [...formData.nodes];
    const cards = [...(nodes[nodeIdx].data.cards || [])];
    cards.splice(cardIdx, 1);
    nodes[nodeIdx] = {
      ...nodes[nodeIdx],
      data: { ...nodes[nodeIdx].data, cards },
    };
    setFormData({ ...formData, nodes });
  };

  const updateCardButton = (
    nodeIdx: number,
    cardIdx: number,
    buttonIdx: number,
    patch: Partial<FlowButtonOption>,
  ) => {
    const nodes = [...formData.nodes];
    const cards = [...(nodes[nodeIdx].data.cards || [])];
    const buttons = [...(cards[cardIdx].buttons || [])];
    const nextButton: FlowButtonOption = { ...buttons[buttonIdx], ...patch };
    if (nextButton.type === "web_url") {
      delete nextButton.payload;
      nextButton.url = nextButton.url || "";
    } else {
      delete nextButton.url;
      nextButton.payload = nextButton.payload || "";
    }
    buttons[buttonIdx] = nextButton;
    cards[cardIdx] = { ...cards[cardIdx], buttons };
    nodes[nodeIdx] = {
      ...nodes[nodeIdx],
      data: { ...nodes[nodeIdx].data, cards },
    };
    setFormData({ ...formData, nodes });
  };

  const addCardButton = (nodeIdx: number, cardIdx: number) => {
    const nodes = [...formData.nodes];
    const cards = [...(nodes[nodeIdx].data.cards || [])];
    const buttons = [...(cards[cardIdx].buttons || [])];
    buttons.push({
      type: "postback",
      title: `Button ${buttons.length + 1}`,
      payload: `CARD_BTN_${buttons.length + 1}`,
    });
    cards[cardIdx] = { ...cards[cardIdx], buttons };
    nodes[nodeIdx] = {
      ...nodes[nodeIdx],
      data: { ...nodes[nodeIdx].data, cards },
    };
    setFormData({ ...formData, nodes });
  };

  const removeCardButton = (
    nodeIdx: number,
    cardIdx: number,
    buttonIdx: number,
  ) => {
    const nodes = [...formData.nodes];
    const cards = [...(nodes[nodeIdx].data.cards || [])];
    const buttons = [...(cards[cardIdx].buttons || [])];
    buttons.splice(buttonIdx, 1);
    cards[cardIdx] = { ...cards[cardIdx], buttons };
    nodes[nodeIdx] = {
      ...nodes[nodeIdx],
      data: { ...nodes[nodeIdx].data, cards },
    };
    setFormData({ ...formData, nodes });
  };

  // Image upload handler
  const handleImageUpload = async (idx: number, file: File) => {
    if (!token || !file) return;
    setUploadingIdx(idx);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`${API_BASE}/api/chatbot-flows/upload-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (data.imageUrl) {
        updateNode(idx, { imageUrl: data.imageUrl });
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload image");
    } finally {
      setUploadingIdx(null);
    }
  };

  // Resolve image URL for display (relative paths need backend base URL)
  const resolveImageUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `${API_BASE}${url}`;
  };

  // Parse Google Maps link to extract lat/long
  const parseGoogleMapsLink = (
    url: string,
  ): { lat: number; lng: number } | null => {
    // Format: https://www.google.com/maps/place/.../@13.7563,100.5018,...
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch)
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    // Format: https://www.google.com/maps?q=13.7563,100.5018
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch)
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    // Format: https://maps.google.com/maps?ll=13.7563,100.5018
    const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (llMatch)
      return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
    // Format: /data= containing coordinates
    const dataMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (dataMatch)
      return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };
    // Format: place/name/@lat,lng or generic lat,lng in URL
    const genericMatch = url.match(
      /(-?\d{1,3}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/,
    );
    if (genericMatch)
      return {
        lat: parseFloat(genericMatch[1]),
        lng: parseFloat(genericMatch[2]),
      };
    return null;
  };

  // Handle Google Maps link pasting (supports short URLs via redirect)
  const [mapsLinkStatus, setMapsLinkStatus] = useState<Record<number, string>>(
    {},
  );
  const handleMapsLink = async (idx: number, url: string) => {
    if (!url.trim()) return;

    // Try direct parsing first
    const result = parseGoogleMapsLink(url);
    if (result) {
      updateNode(idx, { latitude: result.lat, longitude: result.lng });
      setMapsLinkStatus({ ...mapsLinkStatus, [idx]: "OK: Coordinates detected" });
      setTimeout(
        () =>
          setMapsLinkStatus((s) => {
            const n = { ...s };
            delete n[idx];
            return n;
          }),
        3000,
      );
      return;
    }

    // For short URLs (maps.app.goo.gl etc.), ask user to use full URL.
    if (url.includes("goo.gl") || url.includes("maps.app")) {
      setMapsLinkStatus({
        ...mapsLinkStatus,
        [idx]:
          "WARN: Short URL is not supported. Open it in browser and copy the full URL from the address bar.",
      });
      setTimeout(
        () =>
          setMapsLinkStatus((s) => {
            const n = { ...s };
            delete n[idx];
            return n;
          }),
        6000,
      );
      return;
    }

    setMapsLinkStatus({
      ...mapsLinkStatus,
      [idx]:
        "ERROR: Could not extract coordinates from this link. Please enter lat/long manually.",
    });
    setTimeout(
      () =>
        setMapsLinkStatus((s) => {
          const n = { ...s };
          delete n[idx];
          return n;
        }),
      5000,
    );
  };

  const removeNode = (idx: number) => {
    const nodes = [...formData.nodes];
    nodes.splice(idx, 1);
    // Re-link nodes
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].nextNodeId = i < nodes.length - 1 ? nodes[i + 1].id : null;
    }
    setFormData({ ...formData, nodes });
  };

  const saveFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const body = {
        name: formData.name,
        description: formData.description || undefined,
        triggerKeywords: formData.triggerKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        nodes: formData.nodes,
      };
      if (editingFlow) {
        await apiFetch(`/api/chatbot-flows/${editingFlow.id}`, token, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/api/chatbot-flows", token, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      resetForm();
      loadFlows();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleFlow = async (id: string) => {
    if (!token) return;
    try {
      await apiFetch(`/api/chatbot-flows/${id}/toggle`, token, {
        method: "POST",
      });
      loadFlows();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const deleteFlow = async (id: string) => {
    if (!confirm("Delete this flow?") || !token) return;
    try {
      await apiFetch(`/api/chatbot-flows/${id}`, token, { method: "DELETE" });
      loadFlows();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const editFlow = (flow: ChatbotFlow) => {
    setEditingFlow(flow);
    setFormData({
      name: flow.name,
      description: flow.description || "",
      triggerKeywords: (flow.triggerKeywords || []).join(", "),
      nodes: flow.nodes || [],
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingFlow(null);
    setFormData({ name: "", description: "", triggerKeywords: "", nodes: [] });
  };

  const nodeTypeIcon = (type: string) => {
    switch (type) {
      case "message":
        return "MSG";
      case "quick_replies":
        return "QR";
      case "buttons":
        return "BTN";
      case "carousel":
        return "CAR";
      case "condition":
        return "IF";
      case "delay":
        return "WAIT";
      case "action":
        return "ACT";
      case "collect_input":
        return "ASK";
      case "location":
        return "LOC";
      default:
        return "NODE";
    }
  };

  const groupedFlows = useMemo(() => {
    const groups = new Map<string, ChatbotFlow[]>();

    for (const flow of flows) {
      const groupKey = inferFlowGroupKey(flow);
      const current = groups.get(groupKey) || [];
      current.push(flow);
      groups.set(groupKey, current);
    }

    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      label: formatFlowGroupLabel(key),
      items,
    }));
  }, [flows]);

  const selectedGroup = useMemo(
    () => groupedFlows.find((group) => group.key === selectedGroupKey) || null,
    [groupedFlows, selectedGroupKey],
  );

  useEffect(() => {
    if (
      selectedGroupKey &&
      !groupedFlows.some((group) => group.key === selectedGroupKey)
    ) {
      setSelectedGroupKey(null);
    }
  }, [groupedFlows, selectedGroupKey]);

  const renderFlowCard = (f: ChatbotFlow) => (
    <div
      key={f.id}
      className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-5 border border-white/40 hover:shadow-2xl transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-900 text-lg">{f.name}</h3>
        <button
          onClick={() => toggleFlow(f.id)}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${f.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
        >
          {f.isActive ? "Active" : "Inactive"}
        </button>
      </div>
      {f.description && <p className="text-gray-600 text-sm mb-2">{f.description}</p>}
      <div className="flex flex-wrap gap-1 mb-3">
        {(f.triggerKeywords || []).map((kw) => (
          <span
            key={kw}
            className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium"
          >
            #{kw}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
        {(f.nodes || []).map((n, i) => (
          <span key={n.id} className="flex items-center gap-1">
            {nodeTypeIcon(n.type)}
            {i < f.nodes.length - 1 && (
              <span className="text-gray-300">-&gt;</span>
            )}
          </span>
        ))}
        {(!f.nodes || f.nodes.length === 0) && (
          <span className="text-gray-400 italic">No nodes</span>
        )}
      </div>
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={() => editFlow(f)}
          className="flex-1 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-semibold transition-all"
        >
          Edit
        </button>
        <button
          onClick={() => deleteFlow(f.id)}
          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold transition-all"
        >
          Delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 sm:p-6 lg:p-8 overflow-auto relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-rose-300 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-1">
              Chatbot Flows
            </h1>
            <p className="text-gray-600">
              Create automated conversation flows for your chatbot
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
            New Flow
          </button>
        </div>

        {/* Flow Editor Modal */}
        {showForm && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingFlow ? "Edit Flow" : "Create Flow"}
                </h2>
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-8 h-8 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all"
                  aria-label="Close modal"
                >
                  X
                </button>
              </div>
              <form onSubmit={saveFlow} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Flow Name
                    </label>
                    <input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                      placeholder="e.g. Welcome Flow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Trigger Keywords{" "}
                      <span className="text-gray-400 font-normal">
                        (comma-separated)
                      </span>
                    </label>
                    <input
                      value={formData.triggerKeywords}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          triggerKeywords: e.target.value,
                        })
                      }
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                      placeholder="hello, hi, start"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    placeholder="What does this flow do?"
                  />
                </div>

                {/* Nodes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Flow Nodes
                  </label>
                  <div className="space-y-3">
                    {formData.nodes.map((node, idx) => (
                      <div
                        key={node.id}
                        className="border-2 border-gray-200 rounded-xl p-4 relative group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">
                            {nodeTypeIcon(node.type)} Step {idx + 1}:{" "}
                            {node.type.replace("_", " ").toUpperCase()}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeNode(idx)}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                        {node.type === "message" && (
                          <div className="space-y-2">
                            <textarea
                              value={node.data.text || ""}
                              onChange={(e) =>
                                updateNode(idx, { text: e.target.value })
                              }
                              rows={2}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                              placeholder="Type your message..."
                            />
                            <div>
                              <label className="text-xs text-gray-500 font-medium">
                                Image (optional)
                              </label>
                              <div className="flex gap-2 mt-1">
                                <input
                                  value={
                                    node.data.imageUrl?.startsWith("/uploads")
                                      ? `Uploaded: ${node.data.imageUrl.split("/").pop()}`
                                      : node.data.imageUrl || ""
                                  }
                                  onChange={(e) =>
                                    updateNode(idx, {
                                      imageUrl: e.target.value,
                                    })
                                  }
                                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-amber-500 outline-none"
                                  placeholder="Paste URL or upload..."
                                  readOnly={node.data.imageUrl?.startsWith(
                                    "/uploads",
                                  )}
                                />
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  ref={(el) => {
                                    fileInputRefs.current[idx] = el;
                                  }}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleImageUpload(idx, f);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    fileInputRefs.current[idx]?.click()
                                  }
                                  disabled={uploadingIdx === idx}
                                  className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-sm font-medium transition-all disabled:opacity-50 whitespace-nowrap"
                                >
                                  {uploadingIdx === idx
                                    ? "Uploading..."
                                    : "Upload"}
                                </button>
                                {node.data.imageUrl && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateNode(idx, { imageUrl: "" })
                                    }
                                    className="px-2 py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-sm transition-all"
                                    title="Remove image"
                                  >
                                    X
                                  </button>
                                )}
                              </div>
                              {node.data.imageUrl && (
                                <img
                                  src={resolveImageUrl(node.data.imageUrl)}
                                  alt="Preview"
                                  className="mt-2 max-h-32 rounded-lg border border-gray-200 object-cover"
                                  onError={(e) =>
                                    (e.currentTarget.style.display = "none")
                                  }
                                />
                              )}
                            </div>
                          </div>
                        )}
                        {node.type === "quick_replies" && (
                          <div className="space-y-3">
                            <textarea
                              value={node.data.text || ""}
                              onChange={(e) =>
                                updateNode(idx, { text: e.target.value })
                              }
                              rows={2}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                              placeholder="Prompt text..."
                            />
                            <div className="space-y-2">
                              {(node.data.quickReplies || []).map(
                                (reply, replyIdx) => (
                                  <div
                                    key={`${node.id}-qr-${replyIdx}`}
                                    className="grid grid-cols-12 gap-2"
                                  >
                                    <input
                                      value={reply.title || ""}
                                      onChange={(e) =>
                                        updateQuickReply(idx, replyIdx, {
                                          title: e.target.value,
                                        })
                                      }
                                      className="col-span-5 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                                      placeholder="Title"
                                    />
                                    <input
                                      value={reply.payload || ""}
                                      onChange={(e) =>
                                        updateQuickReply(idx, replyIdx, {
                                          payload: e.target.value,
                                        })
                                      }
                                      className="col-span-6 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                                      placeholder="Payload (e.g. MENU_A)"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeQuickReply(idx, replyIdx)
                                      }
                                      className="col-span-1 text-red-500 hover:text-red-700 text-sm"
                                    >
                                      X
                                    </button>
                                  </div>
                                ),
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => addQuickReply(idx)}
                              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-medium"
                            >
                              + Add Quick Reply
                            </button>
                          </div>
                        )}
                        {node.type === "buttons" && (
                          <div className="space-y-3">
                            <textarea
                              value={node.data.text || ""}
                              onChange={(e) =>
                                updateNode(idx, { text: e.target.value })
                              }
                              rows={2}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                              placeholder="Button template text..."
                            />
                            <div className="space-y-2">
                              {(node.data.buttons || []).map(
                                (button, buttonIdx) => (
                                  <div
                                    key={`${node.id}-btn-${buttonIdx}`}
                                    className="grid grid-cols-12 gap-2"
                                  >
                                    <select
                                      value={button.type || "postback"}
                                      onChange={(e) =>
                                        updateButton(idx, buttonIdx, {
                                          type: e.target.value as
                                            | "postback"
                                            | "web_url",
                                        })
                                      }
                                      className="col-span-3 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                                    >
                                      <option value="postback">postback</option>
                                      <option value="web_url">web_url</option>
                                    </select>
                                    <input
                                      value={button.title || ""}
                                      onChange={(e) =>
                                        updateButton(idx, buttonIdx, {
                                          title: e.target.value,
                                        })
                                      }
                                      className="col-span-4 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                                      placeholder="Button title"
                                    />
                                    <input
                                      value={
                                        button.type === "web_url"
                                          ? button.url || ""
                                          : button.payload || ""
                                      }
                                      onChange={(e) =>
                                        button.type === "web_url"
                                          ? updateButton(idx, buttonIdx, {
                                              url: e.target.value,
                                            })
                                          : updateButton(idx, buttonIdx, {
                                              payload: e.target.value,
                                            })
                                      }
                                      className="col-span-4 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                                      placeholder={
                                        button.type === "web_url"
                                          ? "https://example.com"
                                          : "PAYLOAD_VALUE"
                                      }
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeButton(idx, buttonIdx)}
                                      className="col-span-1 text-red-500 hover:text-red-700 text-sm"
                                    >
                                      X
                                    </button>
                                  </div>
                                ),
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => addButton(idx)}
                              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-medium"
                            >
                              + Add Button
                            </button>
                          </div>
                        )}
                        {node.type === "carousel" && (
                          <div className="space-y-3">
                            <textarea
                              value={node.data.text || ""}
                              onChange={(e) =>
                                updateNode(idx, { text: e.target.value })
                              }
                              rows={2}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                              placeholder="Intro text (optional)"
                            />
                            <div className="space-y-3">
                              {(node.data.cards || []).map((card, cardIdx) => (
                                <div
                                  key={`${node.id}-card-${cardIdx}`}
                                  className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-600">
                                      Card {cardIdx + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeCard(idx, cardIdx)}
                                      className="text-xs text-red-500 hover:text-red-700"
                                    >
                                      Remove Card
                                    </button>
                                  </div>
                                  <input
                                    value={card.title || ""}
                                    onChange={(e) =>
                                      updateCard(idx, cardIdx, {
                                        title: e.target.value,
                                      })
                                    }
                                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                                    placeholder="Card title"
                                  />
                                  <input
                                    value={card.subtitle || ""}
                                    onChange={(e) =>
                                      updateCard(idx, cardIdx, {
                                        subtitle: e.target.value,
                                      })
                                    }
                                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                                    placeholder="Card subtitle"
                                  />
                                  <input
                                    value={card.imageUrl || ""}
                                    onChange={(e) =>
                                      updateCard(idx, cardIdx, {
                                        imageUrl: e.target.value,
                                      })
                                    }
                                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                                    placeholder="Image URL (optional)"
                                  />
                                  <div className="space-y-2">
                                    {(card.buttons || []).map(
                                      (button, buttonIdx) => (
                                        <div
                                          key={`${node.id}-card-${cardIdx}-btn-${buttonIdx}`}
                                          className="grid grid-cols-12 gap-2"
                                        >
                                          <select
                                            value={button.type || "postback"}
                                            onChange={(e) =>
                                              updateCardButton(
                                                idx,
                                                cardIdx,
                                                buttonIdx,
                                                {
                                                  type: e.target.value as
                                                    | "postback"
                                                    | "web_url",
                                                },
                                              )
                                            }
                                            className="col-span-3 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                                          >
                                            <option value="postback">
                                              postback
                                            </option>
                                            <option value="web_url">
                                              web_url
                                            </option>
                                          </select>
                                          <input
                                            value={button.title || ""}
                                            onChange={(e) =>
                                              updateCardButton(
                                                idx,
                                                cardIdx,
                                                buttonIdx,
                                                { title: e.target.value },
                                              )
                                            }
                                            className="col-span-4 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                                            placeholder="Button title"
                                          />
                                          <input
                                            value={
                                              button.type === "web_url"
                                                ? button.url || ""
                                                : button.payload || ""
                                            }
                                            onChange={(e) =>
                                              button.type === "web_url"
                                                ? updateCardButton(
                                                    idx,
                                                    cardIdx,
                                                    buttonIdx,
                                                    { url: e.target.value },
                                                  )
                                                : updateCardButton(
                                                    idx,
                                                    cardIdx,
                                                    buttonIdx,
                                                    {
                                                      payload: e.target.value,
                                                    },
                                                  )
                                            }
                                            className="col-span-4 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                                            placeholder={
                                              button.type === "web_url"
                                                ? "https://example.com"
                                                : "PAYLOAD_VALUE"
                                            }
                                          />
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeCardButton(
                                                idx,
                                                cardIdx,
                                                buttonIdx,
                                              )
                                            }
                                            className="col-span-1 text-red-500 hover:text-red-700 text-sm"
                                          >
                                            X
                                          </button>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => addCardButton(idx, cardIdx)}
                                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded text-xs font-medium"
                                  >
                                    + Add Card Button
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => addCard(idx)}
                              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-medium"
                            >
                              + Add Card
                            </button>
                          </div>
                        )}
                        {node.type === "condition" && (
                          <div className="grid grid-cols-3 gap-2">
                            <select
                              value={node.data.variable || "message"}
                              onChange={(e) =>
                                updateNode(idx, { variable: e.target.value })
                              }
                              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                            >
                              <option value="message">Message</option>
                              <option value="platform">Platform</option>
                            </select>
                            <select
                              value={node.data.operator || "contains"}
                              onChange={(e) =>
                                updateNode(idx, { operator: e.target.value })
                              }
                              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                            >
                              <option value="contains">Contains</option>
                              <option value="equals">Equals</option>
                              <option value="startsWith">Starts with</option>
                            </select>
                            <input
                              value={node.data.value || ""}
                              onChange={(e) =>
                                updateNode(idx, { value: e.target.value })
                              }
                              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900"
                              placeholder="Value"
                            />
                          </div>
                        )}
                        {node.type === "delay" && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={(node.data.delayMs || 1000) / 1000}
                              onChange={(e) =>
                                updateNode(idx, {
                                  delayMs: Number(e.target.value) * 1000,
                                })
                              }
                              className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900"
                              min={1}
                            />
                            <span className="text-sm text-gray-500">
                              seconds
                            </span>
                          </div>
                        )}
                        {node.type === "action" && (
                          <select
                            value={node.data.action || "request_human"}
                            onChange={(e) =>
                              updateNode(idx, { action: e.target.value })
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900"
                          >
                            {ACTIONS.map((a) => (
                              <option key={a.value} value={a.value}>
                                {a.label}
                              </option>
                            ))}
                          </select>
                        )}
                        {node.type === "collect_input" && (
                          <div className="space-y-2">
                            <input
                              value={node.data.prompt || ""}
                              onChange={(e) =>
                                updateNode(idx, { prompt: e.target.value })
                              }
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900"
                              placeholder="What to ask the user..."
                            />

                            <input
                              value={node.data.saveAs || ""}
                              onChange={(e) =>
                                updateNode(idx, { saveAs: e.target.value })
                              }
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900"
                              placeholder="Variable name (e.g. name, phone)"
                            />
                          </div>
                        )}

                        {node.type === "location" && (
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs text-gray-500 font-medium">
                                Paste Google Maps Link (auto-fill lat/long)
                              </label>
                              <input
                                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 mt-1 focus:ring-1 focus:ring-amber-500 outline-none"
                                placeholder="https://www.google.com/maps/place/..."
                                onPaste={(e) => {
                                  const text = e.clipboardData.getData("text");
                                  if (text) {
                                    e.preventDefault();
                                    (e.target as HTMLInputElement).value = text;
                                    handleMapsLink(idx, text);
                                  }
                                }}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val.startsWith("http"))
                                    handleMapsLink(idx, val);
                                }}
                              />
                              {mapsLinkStatus[idx] && (
                                <p
                                  className={`text-xs mt-1 ${mapsLinkStatus[idx].startsWith("OK:") ? "text-green-600" : mapsLinkStatus[idx].startsWith("WARN:") ? "text-amber-600" : "text-red-500"}`}
                                >
                                  {mapsLinkStatus[idx]}
                                </p>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-500 font-medium">
                                  Location Name
                                </label>
                                <input
                                  value={node.data.locationName || ""}
                                  onChange={(e) =>
                                    updateNode(idx, {
                                      locationName: e.target.value,
                                    })
                                  }
                                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 mt-1"
                                  placeholder="e.g. Our Store"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 font-medium">
                                  Address
                                </label>
                                <input
                                  value={node.data.locationAddress || ""}
                                  onChange={(e) =>
                                    updateNode(idx, {
                                      locationAddress: e.target.value,
                                    })
                                  }
                                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 mt-1"
                                  placeholder="e.g. 123 Main St"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-500 font-medium">
                                  Latitude
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  value={node.data.latitude ?? ""}
                                  onChange={(e) =>
                                    updateNode(idx, {
                                      latitude: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 mt-1"
                                  placeholder="13.7563"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 font-medium">
                                  Longitude
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  value={node.data.longitude ?? ""}
                                  onChange={(e) =>
                                    updateNode(idx, {
                                      longitude:
                                        parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 mt-1"
                                  placeholder="100.5018"
                                />
                              </div>
                            </div>
                            {node.data.latitude && node.data.longitude ? (
                              <a
                                href={`https://www.google.com/maps?q=${node.data.latitude},${node.data.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-amber-600 hover:text-amber-700 underline"
                              >
                                Preview on Google Maps
                              </a>
                            ) : null}
                          </div>
                        )}
                        {idx < formData.nodes.length - 1 && (
                          <div className="flex justify-center mt-2">
                            <div className="w-0.5 h-4 bg-amber-300"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Node Buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {NODE_TYPES.map((nt) => (
                      <button
                        key={nt.value}
                        type="button"
                        onClick={() => addNode(nt.value as FlowNode["type"])}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-700 rounded-lg text-xs font-medium transition-all"
                        title={nt.desc}
                      >
                        {nt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all"
                  >
                    {editingFlow ? "Update" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Flows List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          </div>
        ) : flows.length === 0 ? (
          <div className="text-center py-20 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40">
            <div className="text-5xl font-bold text-amber-500 mb-4">Flow</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Chatbot Flows Yet
            </h3>
            <p className="text-gray-500 mb-6">
              Create automated flows to handle customer conversations
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl shadow-md"
            >
              Create Flow
            </button>
          </div>
        ) : !selectedGroup ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedFlows.map((group) => {
              const activeCount = group.items.filter((item) => item.isActive).length;
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setSelectedGroupKey(group.key)}
                  className="text-left bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-5 border border-white/40 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="text-lg font-bold text-gray-900">
                      Group: {group.label}
                    </h2>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                      {group.items.length}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    {activeCount} active / {group.items.length} total
                  </p>
                  <p className="text-xs text-gray-500">Click to open group</p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedGroupKey(null)}
                className="px-3 py-2 bg-white/80 hover:bg-white text-gray-700 rounded-lg text-sm font-semibold border border-white/50 shadow-sm transition-all"
              >
                Back to Groups
              </button>
              <div className="text-right">
                <h2 className="text-lg font-bold text-gray-800">
                  Group: {selectedGroup.label}
                </h2>
                <p className="text-sm text-gray-600">
                  {selectedGroup.items.length} flow
                  {selectedGroup.items.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedGroup.items.map((flow) => renderFlowCard(flow))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



