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

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  messages: [], // ✅ default เป็น array
  setConversations: (c) => set({ conversations: c }),
  setMessages: (m) =>
    set({
      messages: Array.isArray(m) ? m : [], // ✅ guard
    }),
  addMessage: (m) =>
    set((s) => ({
      messages: [...s.messages, m],
    })),
}));



