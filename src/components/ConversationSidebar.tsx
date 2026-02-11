'use client';

import Link from 'next/link';
import { useChatStore } from '@/store/chat.store';
import { usePathname } from 'next/navigation';

export default function ConversationSidebar() {
  const conversations = useChatStore((s) => s.conversations);
  const pathname = usePathname();

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

  const formatTimestamp = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const getPlatformIcon = (type: string) => {
    switch (type) {
      case 'facebook': return '📘';
      case 'instagram': return '📷';
      case 'whatsapp': return '💬';
      default: return '💬';
    }
  };

  const getPlatformColor = (type: string) => {
    switch (type) {
      case 'facebook': return 'from-blue-500 to-blue-600';
      case 'instagram': return 'from-pink-500 to-purple-600';
      case 'whatsapp': return 'from-green-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">Open</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">In Progress</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">Resolved</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">Closed</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  if (!conversations.length) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-xl">
          <div className="text-3xl">📭</div>
        </div>
        <p className="text-gray-600 text-sm font-medium">No conversations yet</p>
        <p className="text-gray-400 text-xs mt-1">New chats will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      {conversations.map((c) => {
        const isActive = pathname?.includes(c.id);
        return (
          <Link
            key={c.id}
            href={`/dashboard/conversation/${c.id}`}
            className={`block p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
              isActive
                ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 backdrop-blur-md border-2 border-blue-400/50 shadow-xl scale-[1.02]'
                : 'bg-white/60 backdrop-blur-sm hover:bg-white/80 border-2 border-white/40 hover:border-blue-300/50 hover:shadow-xl hover:scale-[1.02]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getPlatformColor(c.platform.type)} flex items-center justify-center text-2xl shadow-md`}>
                  {getPlatformIcon(c.platform.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-base font-bold truncate ${
                    isActive ? 'text-blue-700' : 'text-gray-900'
                  }`}>
                    {getDisplayName(c)}
                  </p>
                  {c.lastMessageAt && (
                    <span className="text-xs text-gray-500 font-medium ml-2 flex-shrink-0">
                      {formatTimestamp(c.lastMessageAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${getPlatformColor(c.platform.type)} text-white shadow-sm`}>
                    {c.platform.type.toUpperCase()}
                  </span>
                  {getStatusBadge(c.status)}
                  {c.requestHuman && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500 text-white animate-pulse">
                      🙋 Wants Human
                    </span>
                  )}
                </div>
                {c.customer?.externalId && getDisplayName(c) !== c.customer.externalId && (
                  <p className="text-xs text-gray-500 truncate font-mono bg-gray-100 px-2 py-0.5 rounded inline-block">
                    ID: {c.customer.externalId}
                  </p>
                )}
              </div>
              <div className={`text-gray-400 group-hover:text-blue-500 transition flex-shrink-0 ${
                isActive ? 'text-blue-600' : ''
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
