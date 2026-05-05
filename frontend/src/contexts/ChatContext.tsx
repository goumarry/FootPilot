import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getChatRooms } from '@/api/chat';

interface ChatContextValue {
  isOpen: boolean;
  openChat: (roomId?: string) => void;
  closeChat: () => void;
  initialRoomId: string | null;
  totalUnread: number;
  refreshUnread: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [initialRoomId, setInitialRoomId] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshUnread = useCallback(async () => {
    if (!user?.clubId) return;
    try {
      const rooms = await getChatRooms();
      setTotalUnread(rooms.reduce((sum, r) => sum + r.unreadCount, 0));
    } catch {
      // silently ignore network errors in background polling
    }
  }, [user?.clubId]);

  // Polling toutes les 30s en arrière-plan
  useEffect(() => {
    if (!user?.clubId) return;
    refreshUnread();
    intervalRef.current = setInterval(refreshUnread, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [user?.clubId, refreshUnread]);

  // Quand le chat s'ouvre, les non-lus seront rafraîchis par le drawer
  const openChat = useCallback((roomId?: string) => {
    setInitialRoomId(roomId ?? null);
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setInitialRoomId(null);
    // Rafraîchir le compteur après fermeture
    setTimeout(refreshUnread, 500);
  }, [refreshUnread]);

  return (
    <ChatContext.Provider value={{ isOpen, openChat, closeChat, initialRoomId, totalUnread, refreshUnread }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
