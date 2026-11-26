import {
    HighlightedText,
    ReleaseNote,
    ReleaseNoteSectionView,
    ReleaseNoteView,
    TextPart,
} from '@core/models/release-note/release-note.models';

// Türkçe küçük harf: "İade" aramada "iade" ile eşleşir; harf sayısı değişmediği için vurgu konumları tutar
export function normalizeSearch(text: string): string {
    return text.trim().toLocaleLowerCase('tr');
}

// Sürüm no ya da tarih eşleşirse sürümün bütün notu, ekran adı eşleşirse o ekranın bütün maddeleri,
// yoksa yalnız eşleşen maddeler gösterilir. Hiçbiri eşleşmeyen sürüm listeden çıkar.
export function filterNotes(notes: ReleaseNote[], search: string): ReleaseNoteView[] {
    const term = normalizeSearch(search);
    const views: ReleaseNoteView[] = [];

    for (const note of notes) {
        const noteMatches = !term || contains(note.version, term) || contains(note.date, term);
        const sections: ReleaseNoteSectionView[] = [];

        for (const section of note.sections) {
            const sectionMatches = noteMatches || contains(section.title, term);
            const items = section.items.filter(item => sectionMatches || contains(item, term));
            if (sectionMatches || items.length > 0) {
                sections.push({
                    title: highlight(section.title, term),
                    items: items.map(item => highlight(item, term)),
                });
            }
        }

        if (noteMatches || sections.length > 0) {
            views.push({ version: highlight(note.version, term), date: highlight(note.date, term), sections });
        }
    }
    return views;
}

// Panoya kopyalanan düz metin, notun dosyadaki biçimiyle: ekran adı, altında "- " ile maddeler
export function sectionToText(section: ReleaseNoteSectionView): string {
    return [section.title.text, ...section.items.map(item => `- ${item.text}`)].filter(line => !!line).join('\n');
}

export function noteToText(note: ReleaseNoteView): string {
    const header = note.date.text ? `Sürüm ${note.version.text} - ${note.date.text}` : `Sürüm ${note.version.text}`;
    return [header, ...note.sections.map(sectionToText)].join('\n\n');
}

function contains(text: string, term: string): boolean {
    return text.toLocaleLowerCase('tr').includes(term);
}

function highlight(text: string, term: string): HighlightedText {
    const parts: TextPart[] = [];
    const lower = text.toLocaleLowerCase('tr');
    let from = 0;
    let index = term ? lower.indexOf(term) : -1;

    while (index >= 0) {
        if (index > from) {
            parts.push({ text: text.slice(from, index), match: false });
        }
        parts.push({ text: text.slice(index, index + term.length), match: true });
        from = index + term.length;
        index = lower.indexOf(term, from);
    }
    if (from < text.length) {
        parts.push({ text: text.slice(from), match: false });
    }
    return { text, parts };
}
