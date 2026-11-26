import { isAllowedAttachment, sanitizeAttachmentFileName } from './file-security';

// Talep açarken ve yanıt yazarken eklenen dosyanın ortak kuralları: dosya seçme, Ctrl+V ile yapıştırma ve
// sürükleyip bırakma aynı denetimden geçer. İzin verilen türler file-security.ts'tedir.
export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = 'image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.zip,.rar,.7z';
export const ATTACHMENT_RULES_TEXT = 'Resim (JPG, PNG, WEBP, GIF, BMP, SVG) ya da ZIP / RAR / 7Z, en çok 5 MB.';

export type AttachmentCheck = { file: File; error: null } | { file: null; error: string };

// Dosyayı denetler, adını güvenli hâle getirir. Panodan gelen ekran görüntüsünün adı tarayıcıda "image.png"
// olduğu için tarihli bir ad verilir.
export function prepareAttachment(file: File): AttachmentCheck {
    const fileName = isGenericPastedName(file.name) ? buildScreenshotName(file.type) : file.name;
    const sanitizedName = sanitizeAttachmentFileName(fileName);

    if (!isAllowedAttachment(file.type || '', sanitizedName)) {
        return { file: null, error: `Bu dosya türü eklenemez. ${ATTACHMENT_RULES_TEXT}` };
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        return { file: null, error: 'Dosya boyutu 5 MB\'ı geçemez.' };
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
