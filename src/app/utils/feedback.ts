// Kullanıcıya geri bildirim yardımcıları: tarayıcının alert penceresi yerine sağ üstte kısa bilgi / hata mesajı (toast)
// ve HTTP hatasından kullanıcıya gösterilecek metin.
import Swal from 'sweetalert2';

export function showToast(icon: 'success' | 'error' | 'info' | 'warning', title: string): void {
    Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: icon === 'error' ? 4000 : 2200 });
}

// API'nin döndüğü mesaj; yoksa boş metin döner, çağıran kendi varsayılan mesajını ekler (`|| 'Kaydedilemedi.'`).
export function describeHttpError(err: unknown): string {
    const httpError = err as { status?: number; error?: { message?: string; title?: string } } | null;
    if (httpError?.status === 0) return 'Sunucuya bağlanılamadı.';
    if (httpError?.status === 403) return 'Bu işlem için yetkiniz yok.';
    return httpError?.error?.message || httpError?.error?.title || '';
}
