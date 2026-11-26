import { NgTemplateOutlet } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { ClipboardService } from '@core/services/clipboard.service';
import { ReleaseNotesService } from '@core/services/release-notes.service';
import { UrlQueryStateService } from '@core/services/url-query-state.service';
import { ReleaseNote, ReleaseNoteSectionView, ReleaseNoteView } from '@core/models/release-note/release-note.models';
import { APP_VERSION } from '@/environments/version';
import { filterNotes, normalizeSearch, noteToText, sectionToText } from './release-notes.filter';

// Bir seferde gösterilen sürüm sayısı; eskileri "Daha Eski Sürümler" ile eklenir
const PAGE_SIZE = 10;

// Kopyala düğmesi bu süre (ms) "Kopyalandı" olarak kalır
const COPIED_MS = 1600;

// Sürüm Notları: her build'in müşteriye yönelik değişiklik notları (assets/release-notes), yeniden eskiye
@Component({
    selector: 'app-release-notes-page',
    imports: [FormsModule, NgTemplateOutlet],
    templateUrl: './release-notes.html',
    styleUrl: './release-notes.scss',
})
export class ReleaseNotesPage implements OnInit, OnDestroy {
    readonly appVersion = APP_VERSION;
    versions: string[] | null = null;
    notes: ReleaseNote[] = [];
    visibleNotes: ReleaseNoteView[] = [];
    searchText = '';
    isLoading = false;
    errorMessage = '';
    // Son kopyalanan alan ('version', sürüm no ya da sürüm no + bölüm sırası); düğme kısa süre "Kopyalandı" gösterir
    copiedKey: string | null = null;

    private copiedTimer: ReturnType<typeof setTimeout> | null = null;
    private searchUrlTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        private releaseNotesService: ReleaseNotesService,
        private clipboardService: ClipboardService,
        private urlQueryState: UrlQueryStateService,
        private route: ActivatedRoute,
    ) {}

    async ngOnInit(): Promise<void> {
        this.searchText = this.urlQueryState.read(this.route, 'q');
        await this.load();
    }

    ngOnDestroy(): void {
        if (this.copiedTimer) {
            clearTimeout(this.copiedTimer);
        }
        if (this.searchUrlTimer) {
            clearTimeout(this.searchUrlTimer);
        }
    }

    get isSearching(): boolean {
        return !!normalizeSearch(this.searchText);
    }

    get hasMore(): boolean {
        return this.versions !== null && this.notes.length < this.versions.length;
    }

    get visibleItemCount(): number {
        return this.visibleNotes.reduce((total, note) =>
            total + note.sections.reduce((count, section) => count + section.items.length, 0), 0);
    }

    loadMore(): Promise<void> {
        return this.load();
    }

    // Arama yapılınca henüz açılmamış eski sürümler de okunur ki aramaya girsin
    onSearchChange(text: string): void {
        this.searchText = text;
        this.applyFilter();
        if (this.isSearching && this.hasMore) {
            this.load();
        }

        if (this.searchUrlTimer) {
            clearTimeout(this.searchUrlTimer);
        }
        this.searchUrlTimer = setTimeout(() => {
            this.searchUrlTimer = null;
            this.urlQueryState.write(this.route, { q: this.searchText });
        }, 400);
    }

    clearSearch(): void {
        this.onSearchChange('');
    }

    copyVersion(): Promise<void> {
        return this.copy('version', this.appVersion, 'Sürüm numarası');
    }

    copyNote(note: ReleaseNoteView): Promise<void> {
        return this.copy(note.version.text, noteToText(note), `Sürüm ${note.version.text} notları`);
    }

    copySection(note: ReleaseNoteView, section: ReleaseNoteSectionView, index: number): Promise<void> {
        return this.copy(`${note.version.text}#${index}`, sectionToText(section), `${section.title.text || 'Not'} maddeleri`);
    }

    // İlk açılışta sürüm listesi de okunur; her çağrıda sıradaki sürümlerin notu listeye eklenir
    // (arama varken kalan bütün sürümler)
    private async load(): Promise<void> {
        if (this.isLoading) {
            return;
        }
        this.isLoading = true;
        this.errorMessage = '';
        try {
            this.versions ??= await this.releaseNotesService.getVersions();
            const end = this.isSearching ? this.versions.length : this.notes.length + PAGE_SIZE;
            const next = this.versions.slice(this.notes.length, end);
            this.notes = [...this.notes, ...await this.releaseNotesService.getNotes(next)];
        } catch {
            this.errorMessage = 'Sürüm notları okunamadı. Sayfayı yenileyip tekrar deneyin.';
        } finally {
            this.isLoading = false;
        }

        // Yükleme sürerken arama yazıldıysa kalan sürümler de okunur
        if (this.isSearching && this.hasMore && !this.errorMessage) {
            return this.load();
        }
        this.applyFilter();
    }

    private applyFilter(): void {
        this.visibleNotes = filterNotes(this.notes, this.searchText);
    }

    private async copy(key: string, text: string, label: string): Promise<void> {
        try {
            await this.clipboardService.copyText(text);
        } catch {
            this.toast('error', 'Kopyalanamadı');
            return;
        }
        this.toast('success', `${label} kopyalandı`);
        this.copiedKey = key;
        if (this.copiedTimer) {
            clearTimeout(this.copiedTimer);
        }
        this.copiedTimer = setTimeout(() => {
            this.copiedTimer = null;
            this.copiedKey = null;
        }, COPIED_MS);
    }

    private toast(icon: 'success' | 'error', title: string): void {
        Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: 2000 });
    }
}
