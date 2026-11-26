import { UserRequestResponse } from '@core/models/user-request/user-request.models';
import { isRequestClosed, toTime } from '@/app/utils/support-request.utils';

// Anasayfa hesapları: dönem, açılan / kapanan grafiği ve dağılımlar. Ekrandan bağımsız, saf fonksiyonlardır.

export type RangeKey = 'bugun' | '7' | '30' | '90' | 'ozel';

export interface DateRange {
    key: RangeKey;
    start: Date; // dahil, gün başı
    end: Date; // dahil, gün sonu
    days: number;
}

export interface ChartBucket {
    label: string;
    title: string;
    opened: number;
    closed: number;
    showLabel: boolean;
}

export interface BreakdownItem {
    key: string;
    label: string;
    count: number;
    percent: number;
}

export const PRESET_RANGES: { key: Exclude<RangeKey, 'ozel'>; label: string; days: number }[] = [
    { key: 'bugun', label: 'Bugün', days: 1 },
    { key: '7', label: '7 Gün', days: 7 },
    { key: '30', label: '30 Gün', days: 30 },
    { key: '90', label: '90 Gün', days: 90 },
];

export const MAX_CUSTOM_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

export function endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

export function presetRange(key: Exclude<RangeKey, 'ozel'>, now = new Date()): DateRange {
    const days = PRESET_RANGES.find(range => range.key === key)?.days ?? 7;
    const start = startOfDay(now);
    start.setDate(start.getDate() - (days - 1));
    return { key, start, end: endOfDay(now), days };
}

// Özel aralık doğrulanır: başlangıç bitişten sonra, bitiş bugünden sonra ya da aralık bir yıldan uzunsa null döner.
export function customRange(start: Date, end: Date, now = new Date()): DateRange | null {
    const rangeStart = startOfDay(start);
    const rangeEnd = endOfDay(end);
    if (rangeStart > rangeEnd || rangeEnd > endOfDay(now)) return null;
    const days = Math.round((startOfDay(end).getTime() - rangeStart.getTime()) / DAY_MS) + 1;
    if (days > MAX_CUSTOM_RANGE_DAYS) return null;
    return { key: 'ozel', start: rangeStart, end: rangeEnd, days };
}

// Aynı uzunluktaki bir önceki dönem (karşılaştırma için)
export function previousRange(range: DateRange): DateRange {
    const start = new Date(range.start);
    start.setDate(start.getDate() - range.days);
    return { key: range.key, start, end: new Date(range.start.getTime() - 1), days: range.days };
}

export function isInRange(value: string | null | undefined, range: DateRange): boolean {
    const time = toTime(value);
    return !!time && time >= range.start.getTime() && time <= range.end.getTime();
}

// Grafik dilimleri: tek gün → 3 saatlik, 31 güne kadar → günlük, daha uzun → haftalık.
export function buildChartBuckets(items: UserRequestResponse[], range: DateRange): ChartBucket[] {
    const pad = (value: number) => String(value).padStart(2, '0');
    const dayLabel = (date: Date) => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;

    let stepMs: number;
    let labelOf: (start: Date, end: Date) => { label: string; title: string };
    if (range.days <= 1) {
        stepMs = 3 * 60 * 60 * 1000;
        labelOf = start => ({ label: pad(start.getHours()), title: `${pad(start.getHours())}:00 - ${pad(start.getHours() + 3)}:00` });
    } else if (range.days <= 31) {
        stepMs = DAY_MS;
        labelOf = start => ({ label: dayLabel(start), title: dayLabel(start) });
    } else {
        stepMs = 7 * DAY_MS;
        labelOf = (start, end) => ({ label: dayLabel(start), title: `${dayLabel(start)} - ${dayLabel(end)}` });
    }

    const buckets: (ChartBucket & { from: number; to: number })[] = [];
    for (let from = range.start.getTime(); from <= range.end.getTime(); from += stepMs) {
        const to = Math.min(from + stepMs - 1, range.end.getTime());
        buckets.push({ ...labelOf(new Date(from), new Date(to)), from, to, opened: 0, closed: 0, showLabel: true });
    }

    const bucketOf = (value?: string | null) => {
        const time = toTime(value);
        if (!time || time < range.start.getTime() || time > range.end.getTime()) return null;
        return buckets[Math.floor((time - range.start.getTime()) / stepMs)] ?? null;
    };
    for (const item of items) {
        const openedBucket = bucketOf(item.createdDate);
        if (openedBucket) openedBucket.opened++;
        const closedBucket = bucketOf(item.closedDate);
        if (closedBucket) closedBucket.closed++;
    }

    // Çok dilim varsa etiketler seyreltilir (yaklaşık 10 etiket)
    const labelEvery = Math.max(1, Math.ceil(buckets.length / 10));
    return buckets.map(({ from, to, ...bucket }, index) => ({
        ...bucket,
        showLabel: index % labelEvery === 0 || index === buckets.length - 1,
    }));
}

// Kayıtları anahtarına göre sayar; en çok olan limit kadarı döner, gerisi "Diğer" olur.
export function buildBreakdown(
    items: UserRequestResponse[],
    keyOf: (item: UserRequestResponse) => string | null | undefined,
    labelOf: (item: UserRequestResponse) => string | null | undefined,
    limit = 6,
): BreakdownItem[] {
    const groups = new Map<string, { label: string; count: number }>();
    for (const item of items) {
        const key = keyOf(item) || '';
        const group = groups.get(key) ?? { label: (labelOf(item) || '').trim() || 'Belirtilmemiş', count: 0 };
        group.count++;
        groups.set(key, group);
    }

    const total = Math.max(1, items.length);
    const sorted = [...groups.entries()]
        .map(([key, group]) => ({ key, label: group.label, count: group.count }))
        .sort((left, right) => right.count - left.count);

    const top = sorted.slice(0, limit);
    const restCount = sorted.slice(limit).reduce((sum, group) => sum + group.count, 0);
    if (restCount) top.push({ key: '', label: 'Diğer', count: restCount });

    return top.map(group => ({ ...group, percent: Math.round((group.count / total) * 100) }));
}

export function openRequests(items: UserRequestResponse[]): UserRequestResponse[] {
    return items.filter(item => !isRequestClosed(item));
}

export function oldestOpenRequests(items: UserRequestResponse[], limit = 5): UserRequestResponse[] {
    return openRequests(items)
        .sort((left, right) => toTime(left.createdDate) - toTime(right.createdDate))
        .slice(0, limit);
}

export function greetingFor(date = new Date()): string {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'Günaydın';
    if (hour >= 12 && hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
}
