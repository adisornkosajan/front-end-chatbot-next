'use client';

import Link from 'next/link';
import { useChatStore } from '@/store/chat.store';

export default function ConversationSidebar() {
  const conversations = useChatStore((s) => s.conversations);

  const getDisplayName = (conversation: any) => {
    // ลำดับความสำคัญ: name > firstName + lastName > externalId
    if (conversation.customer?.name) {
      return conversation.customer.name;
    }
    
    const firstName = conversation.customer?.firstName || '';
    const lastName = conversation.customer?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    if (fullName) {
      return fullName;
    }
    
    return conversation.customer?.externalId || 'Unknown';
  };

  if (!conversations.length) {
    return (
      <div className="text-center py-12 px-4">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-gray-500 text-sm">No conversations yet</p>
        <p className="text-gray-400 text-xs mt-1">New chats will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((c) => (
        <Link
          key={c.id}
          href={`/dashboard/conversation/${c.id}`}
          className="block p-3 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all duration-150 group"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  {c.platform.type}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition">
                {getDisplayName(c)}
              </p>
              {c.customer?.externalId && getDisplayName(c) !== c.customer.externalId && (
                <p className="text-xs text-gray-400 truncate">ID: {c.customer.externalId}</p>
              )}
            </div>
            <div className="text-gray-400 group-hover:text-blue-500 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
