export type AttachmentAccessLog = {
  requestId: string;
  fileName: string;
  userId: string;
  mimeType: string;
  accessedAt: string;
  action: 'view' | 'download';
};

const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'
]);

const ALLOWED_ARCHIVE_EXTENSIONS = new Set([
  '.zip', '.rar', '.7z'
]);

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.js', '.jsp', '.jspx', '.php', '.aspx', '.dll', '.scr', '.com', '.ps1', '.msi', '.jar', '.app', '.vbs', '.hta', '.lnk'
]);

export function sanitizeAttachmentFileName(fileName: string): string {
  const normalized = (fileName || '').trim().replace(/\\/g, '/');
  const lastSegment = normalized.split('/').pop() ?? normalized;
  const safeName = lastSegment.replace(/[^a-zA-Z0-9_.-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  if (!safeName) {
    return 'attachment';
  }

  const lowerName = safeName.toLowerCase();
  if (BLOCKED_EXTENSIONS.has(lowerName.slice(lowerName.lastIndexOf('.')) || lowerName)) {
    return 'blocked-file';
  }

  return safeName;
}

export function isAllowedAttachment(mimeType: string, fileName?: string): boolean {
  const normalizedMime = (mimeType || '').toLowerCase().trim();
  const normalizedName = (fileName || '').toLowerCase();
  const extension = normalizedName.includes('.') ? normalizedName.slice(normalizedName.lastIndexOf('.')) : '';

  if (BLOCKED_EXTENSIONS.has(extension)) {
    return false;
  }

  if (ALLOWED_ARCHIVE_EXTENSIONS.has(extension)) {
    return true;
  }

  if (normalizedMime && !normalizedMime.startsWith('image/')) {
    return false;
  }

  if (extension && !ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    return false;
  }

  if (!normalizedMime && !extension) {
    return false;
  }

  if (!normalizedMime) {
    return ALLOWED_IMAGE_EXTENSIONS.has(extension);
  }

  return ALLOWED_ATTACHMENT_TYPES.has(normalizedMime);
}

export function recordAttachmentAccess(params: {
  requestId: string;
  fileName: string;
  userId: string;
  mimeType: string;
  action?: 'view' | 'download';
}): AttachmentAccessLog {
  return {
    requestId: params.requestId,
    fileName: sanitizeAttachmentFileName(params.fileName),
    userId: params.userId,
    mimeType: params.mimeType || 'application/octet-stream',
    accessedAt: new Date().toISOString(),
    action: params.action ?? 'view',
  };
}
