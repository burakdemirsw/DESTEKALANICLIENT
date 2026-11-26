// Sisteme eklenebilecek dosya türleri (izin listesi). Asıl denetim sunucudadır: DESTEKALANIAPI
// Core/Application/Helpers/AttachmentFilePolicy.cs uzantıya ek olarak dosyanın içeriğini (imzasını) da denetler, ZIP'in
// içindekileri de aynı listeden geçirir. Buradaki liste kullanıcıya dosyayı seçtiği anda uyarı vermek içindir; iki liste
// birlikte güncellenir. exe, script, SVG, HTML gibi türler listede olmadığı için eklenemez.
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
  '.pdf',
  '.docx', '.xlsx', '.pptx',
  '.txt', '.csv', '.log',
  '.zip',
]);

// Tarayıcının bildirdiği tür bunlardan biriyse uzantı ne olursa olsun reddedilir.
const BLOCKED_MIME_TYPES = new Set([
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-ms-installer',
  'application/x-msi',
  'application/x-sh',
  'application/x-bat',
  'application/javascript',
  'text/javascript',
  'text/html',
  'image/svg+xml',
  'application/java-archive',
]);

const INVALID_NAME_CHARS = /[<>:"/\\|?*]/g;
// Görünmez / yön değiştiren karakterler ("fdp.exe"yi "exe.pdf" gibi gösteren U+202E vb.) ve kontrol karakterleri.
const HIDDEN_CHARS = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}]/gu;
const MAX_FILE_NAME_LENGTH = 120;

export function getAttachmentExtension(fileName: string): string {
  const name = (fileName || '').toLowerCase();
  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.slice(dotIndex) : '';
}

export function isAllowedAttachment(mimeType: string, fileName?: string): boolean {
  if (BLOCKED_MIME_TYPES.has((mimeType || '').toLowerCase().trim())) {
    return false;
  }

  return ALLOWED_EXTENSIONS.has(getAttachmentExtension(fileName || ''));
}

// Dosya adını ekranda ve sunucuda güvenle kullanılacak hâle getirir (sunucu da aynı temizliği yapar): klasör kısmı,
// görünmez karakterler ve geçersiz karakterler atılır, sondaki nokta / boşluklar kesilir. Türkçe harfler korunur.
export function sanitizeAttachmentFileName(fileName: string): string {
  const normalized = (fileName || '').replace(/\\/g, '/');
  const lastSegment = normalized.slice(normalized.lastIndexOf('/') + 1);
  const cleaned = lastSegment
    .replace(HIDDEN_CHARS, '')
    .replace(INVALID_NAME_CHARS, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s]+/, '')
    .replace(/[.\s]+$/, '');

  const extension = getAttachmentExtension(cleaned);
  let baseName = (extension ? cleaned.slice(0, -extension.length) : cleaned).replace(/[.\s]+$/, '');
  if (!baseName) {
    baseName = 'dosya';
  }

  const maxBaseLength = Math.max(1, MAX_FILE_NAME_LENGTH - extension.length);
  return baseName.slice(0, maxBaseLength) + extension;
}
