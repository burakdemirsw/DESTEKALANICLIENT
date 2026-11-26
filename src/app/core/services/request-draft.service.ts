import { Injectable } from '@angular/core';

export interface RequestDraft {
    applicationId: string;
    categoryId: string;
    subject: string;
    description: string;
    savedAt: string;
}

const DRAFT_KEY_PREFIX = 'supportRequestDraft:';

// Yeni talep formunun taslağı: form kapanırsa ya da sayfadan çıkılırsa yazılanlar kaybolmasın diye tarayıcıda,
// kullanıcıya özel saklanır. Talep oluşturulunca silinir. Dosya eki saklanmaz.
@Injectable({ providedIn: 'root' })
export class RequestDraftService {
    load(userId: string): RequestDraft | null {
        if (!userId) return null;
        try {
            const raw = localStorage.getItem(DRAFT_KEY_PREFIX + userId);
            if (!raw) return null;
            const draft = JSON.parse(raw) as Partial<RequestDraft>;
            const result: RequestDraft = {
                applicationId: typeof draft.applicationId === 'string' ? draft.applicationId : '',
                categoryId: typeof draft.categoryId === 'string' ? draft.categoryId : '',
                subject: typeof draft.subject === 'string' ? draft.subject : '',
                description: typeof draft.description === 'string' ? draft.description : '',
                savedAt: typeof draft.savedAt === 'string' ? draft.savedAt : '',
            };
            return this.hasContent(result) ? result : null;
        } catch {
            return null;
        }
    }

    save(userId: string, draft: Omit<RequestDraft, 'savedAt'>): void {
        if (!userId) return;
        const value: RequestDraft = { ...draft, savedAt: new Date().toISOString() };
        try {
            if (this.hasContent(value)) {
                localStorage.setItem(DRAFT_KEY_PREFIX + userId, JSON.stringify(value));
            } else {
                localStorage.removeItem(DRAFT_KEY_PREFIX + userId);
            }
        } catch {
            // Tarayıcı depolaması dolu / kapalıysa taslak saklanmaz; form çalışmaya devam eder.
        }
    }

    clear(userId: string): void {
        if (!userId) return;
        try {
            localStorage.removeItem(DRAFT_KEY_PREFIX + userId);
        } catch {
            // yok sayılır
        }
    }

    // Yalnız uygulama seçilmiş boş form taslak sayılmaz
    private hasContent(draft: Pick<RequestDraft, 'subject' | 'description'>): boolean {
        return !!(draft.subject.trim() || draft.description.trim());
    }
}
