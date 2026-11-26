// Tabloyu Excel'in doğrudan açtığı CSV dosyası olarak indirir: UTF-8 BOM (Türkçe karakterler bozulmasın) ve
// noktalı virgül ayırıcı (Türkçe Excel'in liste ayırıcısı). =, +, -, @ ile başlayan hücrelerin başına ' eklenir;
// Excel bu hücreleri formül olarak çalıştırmaz.
export function downloadCsv(fileName: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
    const lines = [headers, ...rows].map(row => row.map(toCsvCell).join(';'));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toCsvCell(value: string | number | null | undefined): string {
    let text = value === null || value === undefined ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(text)) {
        text = `'${text}`;
    }
    return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Dosya adına eklenen tarih: 2026-11-26
export function csvDateStamp(date = new Date()): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
