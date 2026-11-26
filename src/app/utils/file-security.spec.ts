import { isAllowedAttachment, sanitizeAttachmentFileName } from './file-security';

describe('file security helpers', () => {
  it('rejects unsafe attachment types', () => {
    expect(isAllowedAttachment('application/x-msdownload', 'virus.exe')).toBeFalse();
    expect(isAllowedAttachment('', 'kurulum.exe')).toBeFalse();
    expect(isAllowedAttachment('application/pdf', 'fatura.pdf.exe')).toBeFalse();
    expect(isAllowedAttachment('image/svg+xml', 'logo.svg')).toBeFalse();
    expect(isAllowedAttachment('text/html', 'sayfa.html')).toBeFalse();
    expect(isAllowedAttachment('application/x-msdownload', 'virus.png')).toBeFalse();
    expect(isAllowedAttachment('', 'arsiv.rar')).toBeFalse();
    expect(isAllowedAttachment('', 'makro.xlsm')).toBeFalse();
  });

  it('accepts images, documents, text and zip', () => {
    expect(isAllowedAttachment('image/png', 'photo.png')).toBeTrue();
    expect(isAllowedAttachment('image/jpeg', 'avatar.JPG')).toBeTrue();
    expect(isAllowedAttachment('application/pdf', 'report.pdf')).toBeTrue();
    expect(isAllowedAttachment('', 'tablo.xlsx')).toBeTrue();
    expect(isAllowedAttachment('application/vnd.ms-excel', 'liste.csv')).toBeTrue();
    expect(isAllowedAttachment('application/x-zip-compressed', 'loglar.zip')).toBeTrue();
  });

  it('sanitizes dangerous file names', () => {
    expect(sanitizeAttachmentFileName('../admin/payload.jsp')).toBe('payload.jsp');
    expect(sanitizeAttachmentFileName('C:\\Users\\a\\report .pdf')).toBe('report.pdf');
    expect(sanitizeAttachmentFileName('fatura\u202Efdp.exe')).toBe('faturafdp.exe');
    expect(sanitizeAttachmentFileName('ekran:görüntüsü.png')).toBe('ekran_görüntüsü.png');
    expect(sanitizeAttachmentFileName('dosya.txt. . ')).toBe('dosya.txt');
    expect(sanitizeAttachmentFileName('...')).toBe('dosya');
  });
});
