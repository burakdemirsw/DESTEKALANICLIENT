import { Injectable } from '@angular/core';
import { ChatUserType } from '@/app/views/apps/chat/types';
import { HttpClientService } from '@/app/core/services/http-client.service';

@Injectable({
  providedIn: 'root',
})
export class ConversationsService {
  constructor(private httpClientService: HttpClientService) {}

  async getConversations(): Promise<ChatUserType[]> {
    try {
      const payload = await this.httpClientService.get<any>({
        controller: 'Conversations',
      });
      const items = this.extractArray(payload);
      return this.normalize(items);
    } catch {
      return [];
    }
  }

  private normalize(items: any[]): ChatUserType[] {
    const list = Array.isArray(items) ? items : [];

    return list
      .map((item: any) => {
        const id = this.toString(
          item?.id ?? item?.conversationId ?? item?.conversation_id
        );
        const name =
          this.toString(
            item?.name ??
              item?.customerName ??
              item?.customerDisplayName ??
              item?.title ??
              item?.displayName
          ) || 'KonuÅŸma';
        const lastMessage =
          this.toString(
            item?.lastMessage ??
              item?.message ??
              item?.snippet ??
              item?.summary ??
              item?.messageContent
          ) || '';
        const timeValue =
          item?.time ??
          item?.lastMessageTime ??
          item?.lastMessageDate ??
          item?.updatedAt ??
          item?.createdAt;
        const time = this.toTimeString(timeValue);
        const unread =
          this.toNumber(item?.unread ?? item?.unreadMessageCount ?? item?.unreadCount ?? item?.newMessageCount) ??
          0;
        const avatar =
          this.toString(item?.avatar ?? item?.avatarUrl ?? item?.profilePictureUrl ?? item?.imageUrl) || undefined;

        return {
          id,
          name,
          lastMessage,
          time,
          unread,
          avatar,
        };
      })
      .filter(user => !!user.id);
  }

  private toString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toISOString();
    return '';
  }

  private toTimeString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toLocaleString();
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return new Date(value).toLocaleString();
    }
    return '';
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return null;
  }

  private extractArray(payload: unknown): any[] {
    if (Array.isArray(payload)) return payload;
    const value = payload as any;
    if (value?.data) {
      return Array.isArray(value.data) ? value.data : [value.data];
    }
    if (value?.items) {
      return Array.isArray(value.items) ? value.items : [value.items];
    }
    if (value?.result) {
      return Array.isArray(value.result) ? value.result : [value.result];
    }
    if (value?.$values) {
      return Array.isArray(value.$values) ? value.$values : [value.$values];
    }
    return [];
  }
}

