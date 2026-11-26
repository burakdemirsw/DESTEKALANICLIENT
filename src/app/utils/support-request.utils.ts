// Destek talebi ekranlarının (Anasayfa, Talepler, Tüm Talepler, Talep Detayı) ortak yardımcıları.

const CLOSED_STATUS_NAMES = ['tamamlandı', 'tamamlandi', 'completed', 'closed', 'kapandı', 'kapandi', 'kapalı', 'kapali'];

export interface ClosableRequest {
    isClosed?: boolean | null;
    closedDate?: string | null;
    statusName?: string | null;
}

// Talep kapalı mı: API'nin kapanış bilgisi (isClosed / closedDate) önceliklidir; durum adı yalnız yedek olarak bakılır.
export function isRequestClosed(request: ClosableRequest | null | undefined, statusName?: string | null): boolean {
    if (!request) return false;
    if (request.isClosed || request.closedDate) return true;
    const name = (statusName ?? request.statusName ?? '').trim().toLowerCase();
    return CLOSED_STATUS_NAMES.includes(name);
}

export function toTime(value?: string | null): number {
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
}

export function formatDateTime(value?: string | null): string {
    const time = toTime(value);
    if (!time) return '-';
    return new Date(time).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// "az önce", "12 dk önce", "5 saat önce", "3 gün önce"
export function getRelativeTimeLabel(value?: string | null): string {
    const duration = getDurationLabel(value);
    if (!duration) return '';
    return duration === 'az' ? 'az önce' : `${duration} önce`;
}

// Geçen süre: "12 dk", "5 saat", "3 gün"; bir dakikadan azsa "az" döner.
export function getDurationLabel(value?: string | null): string {
    const time = toTime(value);
    if (!time) return '';

    const diffMs = Date.now() - time;
    const minuteMs = 60 * 1000;
    if (diffMs < minuteMs) return 'az';

    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;
    if (diffMs >= dayMs) return `${Math.floor(diffMs / dayMs)} gün`;
    if (diffMs >= hourMs) return `${Math.floor(diffMs / hourMs)} saat`;
    return `${Math.floor(diffMs / minuteMs)} dk`;
}

export function toDateKey(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Adresten gelen yyyy-MM-dd tarihini doğrular; geçersizse null döner.
export function parseDateKey(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function fullName(name?: string | null, lastName?: string | null): string {
    return [name, lastName].map(part => (part ?? '').trim()).filter(part => !!part).join(' ');
}
