import { isAllowedAttachment, sanitizeAttachmentFileName } from './file-security';

// Talep açarken ve yanıt yazarken eklenen dosyanın ortak kuralları: dosya seçme, Ctrl+V ile yapıştırma ve
// sürükleyip bırakma aynı denetimden geçer. İzin verilen türler file-security.ts'tedir; sınırlar sunucudaki
// AttachmentFilePolicy ile aynıdır (dosya başına 5 MB, yeni talepte en çok 5 dosya).
export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_REQUEST_ATTACHMENTS = 5;
// iPhone'da fotoğraf seçilince HEIC'in JPEG'e çevrilmesi için resim türleri MIME olarak da yazılır.
export const ATTACHMENT_ACCEPT =
    'image/jpeg,image/png,image/gif,image/webp,image/bmp,.jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf,.docx,.xlsx,.pptx,.txt,.csv,.log,.zip';
export const ATTACHMENT_RULES_TEXT =
    'Resim (JPG, PNG, WEBP, GIF, BMP), PDF, Word / Excel / PowerPoint (DOCX, XLSX, PPTX), metin (TXT, CSV, LOG) ya da ZIP; dosya başına en çok 5 MB. EXE gibi çalıştırılabilir dosyalar eklenemez.';

export type AttachmentCheck = { file: File; error: null } | { file: null; error: string };

// Dosyayı denetler, adını güvenli hâle getirir. Panodan gelen ekran görüntüsünün adı tarayıcıda "image.png"
// olduğu için tarihli bir ad verilir.
export function prepareAttachment(file: File): AttachmentCheck {
    const fileName = isGenericPastedName(file.name) ? buildScreenshotName(file.type) : file.name;
    const sanitizedName = sanitizeAttachmentFileName(fileName);

    if (!isAllowedAttachment(file.type || '', sanitizedName)) {
        return { file: null, error: `${sanitizedName}: bu dosya türü eklenemez. ${ATTACHMENT_RULES_TEXT}` };
    }
    if (file.size === 0) {
        return { file: null, error: `${sanitizedName}: dosya boş.` };
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        return { file: null, error: `${sanitizedName}: dosya boyutu 5 MB'ı geçemez.` };
    }

    return {
        file: new File([file], sanitizedName, {
            type: file.type || 'application/octet-stream',
            lastModified: file.lastModified,
        }),
        error: null,
    };
}

// Panoda dosya (ekran görüntüsü) yoksa boş liste döner; o durumda yapıştırılan metin normal yapıştırılır.
export function getClipboardFiles(event: ClipboardEvent): File[] {
    const items = Array.from(event.clipboardData?.items ?? []);
    return items
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
        .filter((file): file is File => !!file);
}

// Yetkili uçtan indirilen eki kullanıcının bilgisayarına kaydettirir.
export function saveAttachmentBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Ek indirme hatasının kullanıcıya gösterilecek metni. Yanıt Blob beklendiği için sunucunun hata mesajı Blob içinde gelir.
export async function describeAttachmentDownloadError(err: unknown): Promise<string> {
    const httpError = err as { status?: number; error?: unknown } | null;
    if (httpError?.status === 0) return 'Sunucuya bağlanılamadı.';

    if (httpError?.error instanceof Blob) {
        try {
            const body = JSON.parse(await httpError.error.text()) as { message?: string };
            if (body?.message) return body.message;
        } catch {
            // Gövde JSON değilse durum koduna göre metin verilir.
        }
    }

    if (httpError?.status === 404) return 'Dosya bulunamadı.';
    if (httpError?.status === 403) return 'Bu dosyayı açma yetkiniz yok.';
    return 'Dosya indirilemedi.';
}

export function getDroppedFiles(event: DragEvent): File[] {
    return Array.from(event.dataTransfer?.files ?? []);
}

export function isFileDrag(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

function isGenericPastedName(name: string): boolean {
    return !name || /^image\.(png|jpe?g|gif|webp|bmp)$/i.test(name);
}

function buildScreenshotName(mimeType: string): string {
    const extension = (mimeType.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `ekran-goruntusu-${stamp}.${extension}`;
}
