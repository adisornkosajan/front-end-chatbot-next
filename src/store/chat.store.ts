import { create } from 'zustand';

type Message = {
  id: string;
  content: string;
  senderType: string;
  conversationId?: string;
  platformMessageId?: string;
  contentType?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt?: string;
};

type ChatState = {
  conversations: any[];
  messages: Message[];
  setConversations: (c: any[]) => void;
  setMessages: (m: Message[]) => void;
  addMessage: (m: Message) => void;
};

function getMessageKey(m: Message): string {
  if (m.id) return `id:${m.id}`;
  if (m.platformMessageId) return `platform:${m.platformMessageId}`;
  return `fallback:${m.conversationId || ''}:${m.senderType || ''}:${m.createdAt || ''}:${m.content || ''}`;
}

function dedupeMessages(list: Message[]): Message[] {
  const map = new Map<string, Message>();
  for (const item of list) {
    map.set(getMessageKey(item), item);
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return aTime - bTime;
  });
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  messages: [],
  setConversations: (c) => set({ conversations: c }),
  setMessages: (m) =>
    set({
      messages: Array.isArray(m) ? dedupeMessages(m) : [],
    }),
  addMessage: (m) =>
    set((s) => ({
      messages: dedupeMessages([...s.messages, m]),
    })),
}));
