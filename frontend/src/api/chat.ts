import client from './client';
import type { ChatRoom, ChatMessage } from '@/types';

export async function getChatRooms(): Promise<ChatRoom[]> {
  const { data } = await client.get('/chat/rooms');
  return data;
}

export async function getChatMessages(
  roomId: string,
  cursor?: string,
): Promise<{ messages: ChatMessage[]; hasMore: boolean; nextCursor: string | null }> {
  const { data } = await client.get(`/chat/rooms/${roomId}/messages`, {
    params: cursor ? { cursor } : {},
  });
  return data;
}

export async function sendChatMessage(roomId: string, content: string): Promise<ChatMessage> {
  const { data } = await client.post(`/chat/rooms/${roomId}/messages`, { content });
  return data;
}

export async function markRoomAsRead(roomId: string): Promise<void> {
  await client.post(`/chat/rooms/${roomId}/read`);
}
