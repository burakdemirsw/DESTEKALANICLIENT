import { Injectable } from '@angular/core';
import { RELEASE_NOTE_FILES } from '@core/data/release-notes.data';
import { ReleaseNote, ReleaseNoteSection } from '@core/models/release-note/release-note.models';

// Notlar her build'de src/assets/release-notes/v<sürüm>.txt dosyalarından release-notes.data.ts'e yazılır
// (tools/build-number/release-notes.js) ve JS paketine girer: yayında yalnız JS dosyaları atılsa da notlar görünür
@Injectable({ providedIn: 'root' })
export class ReleaseNotesService {
    // Notu olan sürümler, yeniden eskiye
    getVersions(): Promise<string[]> {
        return Promise.resolve(RELEASE_NOTE_FILES.map(file => file.version));
    }

    getNotes(versions: string[]): Promise<ReleaseNote[]> {
        return Promise.resolve(versions.map(version =>
            this.parse(version, RELEASE_NOTE_FILES.find(file => file.version === version)?.text ?? '')
        ));
    }

    // İlk satır "Sürüm 2.0.0.5 - 03.11.2026 10:48"; sonra ekran adı başlık, altında "- " ile maddeler.
    // Girintili satır bir önceki maddenin devamıdır.
    private parse(version: string, text: string): ReleaseNote {
        const lines = text.split(/\r?\n/);
        const date = lines[0].split(' - ')[1]?.trim() ?? '';
        const sections: ReleaseNoteSection[] = [];

        for (const line of lines.slice(1)) {
            const current = sections[sections.length - 1];
            if (!line.trim() || line.startsWith('#')) {
                continue;
            }
            if (line.startsWith('-')) {
                if (!current) {
                    sections.push({ title: '', items: [line.slice(1).trim()] });
                } else {
                    current.items.push(line.slice(1).trim());
                }
            } else if (/^\s/.test(line) && current?.items.length) {
                current.items[current.items.length - 1] += ` ${line.trim()}`;
            } else {
                sections.push({ title: line.trim(), items: [] });
            }
        }
        return { version, date, sections };
    }
}
