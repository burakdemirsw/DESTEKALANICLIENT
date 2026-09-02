import { isAllowedAttachment, sanitizeAttachmentFileName, recordAttachmentAccess } from './file-security';

describe('file security helpers', () => {
  it('rejects unsafe attachment types', () => {
    expect(isAllowedAttachment('application/x-msdownload', 'virus.exe')).toBeFalse();
    expect(isAllowedAttachment('application/pdf', 'report.pdf')).toBeFalse();
    expect(isAllowedAttachment('image/png', 'photo.png')).toBeTrue();
    expect(isAllowedAttachment('image/jpeg', 'avatar.jpg')).toBeTrue();
  });

  it('sanitizes dangerous file names', () => {
    expect(sanitizeAttachmentFileName('../admin/payload.jsp')).toBe('payload.jsp');
    expect(sanitizeAttachmentFileName('report .pdf')).toBe('report.pdf');
  });

  it('records access events with request context', () => {
    const result = recordAttachmentAccess({
      requestId: 'req-1',
      fileName: 'invoice.pdf',
      userId: 'u-1',
      mimeType: 'application/pdf',
    });

    expect(result.requestId).toBe('req-1');
    expect(result.fileName).toBe('invoice.pdf');
    expect(result.userId).toBe('u-1');
    expect(result.accessedAt).toBeTruthy();
  });
});
