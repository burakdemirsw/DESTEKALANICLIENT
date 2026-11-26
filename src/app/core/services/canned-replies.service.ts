import { Injectable } from '@angular/core';

export interface CannedReply {
    id: string;
    text: string;
}

const STORAGE_KEY_PREFIX = 'supportCannedReplies:';

const DEFAULT_REPLIES: string[] = [
    'Merhaba, talebinizi aldık ve inceliyoruz. En kısa sürede bilgi vereceğiz.',
    'Sorunu daha iyi anlayabilmemiz için hatanın ekran görüntüsünü ve hangi adımlardan sonra oluştuğunu paylaşabilir misiniz?',
    'Gerekli düzenlemeyi yaptık. Kontrol edip sonucu bize bildirebilir misiniz?',
    'Talebiniz çözüldüğü için kapatıyoruz. Yeniden yaşarsanız yeni talep açabilirsiniz.',
];

// Yöneticinin yanıt yazarken tek tıkla eklediği hazır metinler. Şimdilik tarayıcıda, kullanıcıya özel saklanır
// (ekip içinde ortak olması için API'de tablo gerekir). İlk açılışta örnek metinlerle gelir.
@Injectable({ providedIn: 'root' })
export class CannedRepliesService {
    getAll(userId: string): CannedReply[] {
        if (!userId) return [];
        try {
            const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
            if (raw === null) {
                return DEFAULT_REPLIES.map((text, index) => ({ id: `default-${index}`, text }));
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed)
                ? parsed.filter((item): item is CannedReply => typeof item?.id === 'string' && typeof item?.text === 'string')
                : [];
        } catch {
            return [];
        }
    }

    add(userId: string, text: string): CannedReply[] {
        const trimmed = text.trim();
        const replies = this.getAll(userId);
        if (!trimmed || replies.some(reply => reply.text === trimmed)) return replies;
        return this.store(userId, [...replies, { id: `${Date.now()}`, text: trimmed }]);
    }

    remove(userId: string, id: string): CannedReply[] {
        return this.store(userId, this.getAll(userId).filter(reply => reply.id !== id));
    }

    private store(userId: string, replies: CannedReply[]): CannedReply[] {
        try {
            localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(replies));
        } catch {
            // Depolama kapalıysa liste yalnız bu sayfa açıkken geçerli olur.
        }
        return replies;
    }
}
