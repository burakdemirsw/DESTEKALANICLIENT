// Sürüm Notları: bir v<sürüm>.txt dosyasının okunmuş hali (ekran adı başlık, altında maddeler)
export interface ReleaseNoteSection {
    title: string;
    items: string[];
}

export interface ReleaseNote {
    version: string;
    date: string;
    sections: ReleaseNoteSection[];
}

// Ekranda gösterilen metin: aranan kelime parçalara bölünür, eşleşen parça <mark> ile vurgulanır
export interface TextPart {
    text: string;
    match: boolean;
}

export interface HighlightedText {
    text: string;
    parts: TextPart[];
}

// Aramaya uyan bölüm ve maddeler (arama yoksa notun tamamı)
export interface ReleaseNoteSectionView {
    title: HighlightedText;
    items: HighlightedText[];
}

export interface ReleaseNoteView {
    version: HighlightedText;
    date: HighlightedText;
    sections: ReleaseNoteSectionView[];
}
