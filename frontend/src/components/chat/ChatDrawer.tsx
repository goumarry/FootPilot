import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, ChevronDown, MessageSquare, Loader2 } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { getChatRooms, getChatMessages, sendChatMessage, markRoomAsRead } from '@/api/chat';
import type { ChatRoom, ChatMessage } from '@/types';

// ── Bulle de message ──────────────────────────────────────────────────────────

function MessageBubble({ msg, showSender }: { msg: ChatMessage; showSender: boolean }) {
  const time = new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (msg.isOwn) {
    return (
      <div className="flex justify-end mb-1.5">
        <div className="max-w-[75%]">
          <div className="bg-violet-600 text-white px-3 py-2 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
            {msg.content}
          </div>
          <p className="text-[10px] text-slate-500 text-right mt-0.5 pr-1">{time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 mb-1.5">
      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 flex-shrink-0 self-end">
        {msg.senderPic
          ? <img src={msg.senderPic} alt="" className="w-full h-full rounded-full object-cover" />
          : msg.senderInitials
        }
      </div>
      <div className="max-w-[75%]">
        {showSender && <p className="text-[10px] text-slate-500 font-semibold mb-0.5 pl-1">{msg.senderName}</p>}
        <div className="bg-slate-800 text-slate-100 px-3 py-2 rounded-2xl rounded-tl-sm text-sm leading-relaxed">
          {msg.content}
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5 pl-1">{time}</p>
      </div>
    </div>
  );
}

// ── Séparateur de date ────────────────────────────────────────────────────────

function DateSeparator({ date }: { date: string }) {
  const label = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="flex items-center gap-2 my-3">
      <div className="flex-1 h-px bg-slate-700/40" />
      <span className="text-[10px] text-slate-500 font-semibold capitalize">{label}</span>
      <div className="flex-1 h-px bg-slate-700/40" />
    </div>
  );
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// ── Drawer principal ──────────────────────────────────────────────────────────

export default function ChatDrawer() {
  const { isOpen, closeChat, initialRoomId, refreshUnread } = useChat();
  const { user } = useAuth();

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Charger les salons à l'ouverture
  useEffect(() => {
    if (!isOpen) return;
    setLoadingRooms(true);
    getChatRooms()
      .then((r) => {
        setRooms(r);
        // Sélectionner le salon initial ou le premier
        const target = initialRoomId ? r.find((x) => x.id === initialRoomId) : null;
        setSelectedRoom(target ?? r[0] ?? null);
      })
      .finally(() => setLoadingRooms(false));
  }, [isOpen, initialRoomId]);

  // Charger les messages quand le salon change
  const loadMessages = useCallback(async (room: ChatRoom) => {
    setLoadingMsgs(true);
    setMessages([]);
    setHasMore(false);
    setNextCursor(null);
    try {
      const { messages: msgs, hasMore: more, nextCursor: cursor } = await getChatMessages(room.id);
      setMessages(msgs);
      setHasMore(more);
      setNextCursor(cursor);
      // Marquer comme lu
      await markRoomAsRead(room.id);
      setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, unreadCount: 0 } : r));
      refreshUnread();
    } finally {
      setLoadingMsgs(false);
    }
  }, [refreshUnread]);

  useEffect(() => {
    if (selectedRoom) loadMessages(selectedRoom);
  }, [selectedRoom]); // eslint-disable-line

  // Scroll automatique au dernier message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Polling toutes les 5s quand le drawer est ouvert
  useEffect(() => {
    if (!isOpen || !selectedRoom) return;
    pollingRef.current = setInterval(async () => {
      const last = messages[messages.length - 1];
      try {
        const { messages: fresh } = await getChatMessages(selectedRoom.id);
        if (fresh.length > 0 && (!last || fresh[fresh.length - 1].id !== last.id)) {
          setMessages(fresh);
          await markRoomAsRead(selectedRoom.id);
          setRooms((prev) => prev.map((r) => r.id === selectedRoom.id ? { ...r, unreadCount: 0 } : r));
        }
        // Mettre à jour les non-lus des autres salons
        const allRooms = await getChatRooms();
        setRooms(allRooms.map((r) => r.id === selectedRoom.id ? { ...r, unreadCount: 0 } : r));
      } catch { /* ignore */ }
    }, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [isOpen, selectedRoom, messages]);

  // Charger plus de messages (pagination)
  async function loadMore() {
    if (!selectedRoom || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { messages: older, hasMore: more, nextCursor: cursor } = await getChatMessages(selectedRoom.id, nextCursor);
      setMessages((prev) => [...older, ...prev]);
      setHasMore(more);
      setNextCursor(cursor);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSend() {
    if (!selectedRoom || !input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      const msg = await sendChatMessage(selectedRoom.id, content);
      setMessages((prev) => [...prev, msg]);
    } catch {
      setInput(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay mobile */}
      <div className="fixed inset-0 z-[60] lg:hidden bg-slate-950/60 backdrop-blur-sm" onClick={closeChat} />

      {/* Panel */}
      <div className="fixed z-[61] bottom-0 left-0 right-0 h-[92dvh] lg:right-0 lg:top-0 lg:bottom-0 lg:left-auto lg:h-full lg:w-[380px] bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-700/50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/40 bg-slate-900/80 backdrop-blur flex-shrink-0">
          <MessageSquare size={16} className="text-violet-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {rooms.length <= 1 ? (
              <p className="text-sm font-bold text-slate-100 truncate">{selectedRoom?.nom ?? 'Messagerie'}</p>
            ) : (
              <button
                onClick={() => setShowRoomPicker((v) => !v)}
                className="flex items-center gap-1.5 hover:text-violet-300 transition-colors group"
              >
                <p className="text-sm font-bold text-slate-100 truncate group-hover:text-violet-300">{selectedRoom?.nom ?? 'Messagerie'}</p>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showRoomPicker ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          <button onClick={closeChat} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex-shrink-0">
            <X size={15} />
          </button>
        </div>

        {/* Room picker dropdown */}
        {showRoomPicker && rooms.length > 1 && (
          <div className="border-b border-slate-700/40 bg-slate-900 flex-shrink-0">
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => { setSelectedRoom(r); setShowRoomPicker(false); }}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-800/60 transition-colors ${r.id === selectedRoom?.id ? 'bg-slate-800/40' : ''}`}
              >
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${r.id === selectedRoom?.id ? 'text-violet-300' : 'text-slate-200'}`}>{r.nom}</p>
                  {r.lastMessage && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{r.lastMessage.senderName} : {r.lastMessage.content}</p>
                  )}
                </div>
                {r.unreadCount > 0 && (
                  <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {r.unreadCount > 9 ? '9+' : r.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Zone messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0">
          {loadingRooms || loadingMsgs ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={20} className="animate-spin text-slate-500" />
            </div>
          ) : !selectedRoom ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare size={32} className="text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">Aucun salon disponible</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare size={32} className="text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">Soyez le premier à écrire dans {selectedRoom.nom} !</p>
            </div>
          ) : (
            <>
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 text-center transition-colors"
                >
                  {loadingMore ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Charger les messages précédents'}
                </button>
              )}
              {messages.map((msg, i) => {
                const prev = messages[i - 1];
                const showDate = !prev || !isSameDay(prev.createdAt, msg.createdAt);
                const showSender = !msg.isOwn && (!prev || prev.senderId !== msg.senderId || showDate);
                return (
                  <div key={msg.id}>
                    {showDate && <DateSeparator date={msg.createdAt} />}
                    <MessageBubble msg={msg} showSender={showSender} />
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Zone de saisie */}
        {selectedRoom && (
          <div className="flex-shrink-0 px-3 py-3 border-t border-slate-700/40 bg-slate-900/60">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message dans ${selectedRoom.nom}…`}
                rows={1}
                className="flex-1 resize-none bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500/60 max-h-32 overflow-y-auto leading-relaxed"
                style={{ minHeight: '42px' }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-10 h-10 flex-shrink-0 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors flex items-center justify-center"
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5 pl-1">Entrée pour envoyer · Maj+Entrée pour aller à la ligne</p>
          </div>
        )}

        {/* Barre de statut utilisateur connecté (desktop) */}
        <div className="hidden lg:flex items-center gap-2 px-4 py-2 border-t border-slate-700/30 bg-slate-900/40 flex-shrink-0">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white overflow-hidden">
            {user?.profilePic
              ? <img src={user.profilePic} alt="" className="w-full h-full object-cover rounded-full" />
              : <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
            }
          </div>
          <p className="text-[11px] text-slate-500 truncate">{user?.firstName} {user?.lastName}</p>
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
        </div>
      </div>
    </>
  );
}
