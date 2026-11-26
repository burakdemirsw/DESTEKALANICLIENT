import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { UserRequestSignalRService } from './user-request-signalr.service';
import { UserMenuService } from './user-menu.service';
import { UserRequestActivityEvent } from '../models/user-request/user-request-activity.models';

// Uygulama açıkken talep olaylarını (yeni yanıt, iç not, yeni talep, yeniden açma, çözüm onayı) her sayfada bildirir:
// köşede tıklanınca talebi açan bildirim, sekme arka plandaysa başlıkta sayaç "(2) ...". Liste ve anasayfa changes$
// ile kendini yeniler. Ana yerleşim (MainLayout) açılınca başlar, kapanınca durur.
@Injectable({ providedIn: 'root' })
export class RequestActivityNotifierService {
    private subscription: Subscription | null = null;
    private started = false;
    private baseTitle: string | null = null;
    private unseenCount = 0;
    private readonly changesSubject = new Subject<UserRequestActivityEvent>();
    private readonly onVisibilityChange = () => {
        if (!document.hidden) this.resetTitle();
    };

    // Bu kullanıcının görebileceği her talep olayı (kendi yaptıkları dahil değil)
    readonly changes$: Observable<UserRequestActivityEvent> = this.changesSubject.asObservable();

    constructor(
        private signalR: UserRequestSignalRService,
        private router: Router,
        private userMenuService: UserMenuService,
    ) {}

    async start(): Promise<void> {
        if (this.started) return;
        this.started = true;
        document.addEventListener('visibilitychange', this.onVisibilityChange);
        this.subscription = this.signalR.activity$.subscribe(activity => this.handle(activity));
        await this.signalR.start();
    }

    async stop(): Promise<void> {
        if (!this.started) return;
        this.started = false;
        this.subscription?.unsubscribe();
        this.subscription = null;
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        this.resetTitle();
        await this.signalR.stop();
    }

    private handle(activity: UserRequestActivityEvent): void {
        const currentUserId = (this.userMenuService.getUserIdFromToken() ?? '').toLowerCase();
        if (activity.actorUserId.toLowerCase() === currentUserId) return;

        this.changesSubject.next(activity);
        this.bumpTitle();

        // Açık olan talebin yeni mesajını talep detayı kendisi gösterir
        const viewingRequest = this.router.url.toLowerCase().includes(`/admin/user-requests/${activity.requestId}`);
        if (viewingRequest && (activity.type === 'message' || activity.type === 'note')) return;

        this.showToast(activity);
    }

    private showToast(activity: UserRequestActivityEvent): void {
        const requestNo = activity.requestNo || 'Talep';
        const actor = activity.actorName?.trim() || 'Bir kullanıcı';
        const titles: Record<string, string> = {
            message: `${requestNo} · ${actor} yanıt yazdı`,
            note: `${requestNo} · ${actor} iç not ekledi`,
            created: `Yeni talep: ${requestNo}`,
            reopened: `${requestNo} yeniden açıldı`,
            resolved: `${requestNo} çözüldü olarak onaylandı`,
        };
        const text = activity.type === 'created' || !activity.preview ? activity.subject : activity.preview;

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: titles[activity.type] ?? requestNo,
            text: text.length > 120 ? `${text.slice(0, 120)}…` : text,
            showConfirmButton: true,
            confirmButtonText: 'Talebi Aç',
            showCloseButton: true,
            timer: 7000,
            timerProgressBar: true,
        }).then(result => {
            if (result.isConfirmed) {
                this.router.navigate(['/admin/user-requests', activity.requestId]);
            }
        });
    }

    // Sekme arka plandayken gelen olay sayısı başlıkta gösterilir: "(2) Talepler | Destek Alanı"
    private bumpTitle(): void {
        if (!document.hidden) return;
        if (this.baseTitle === null) this.baseTitle = document.title;
        this.unseenCount++;
        document.title = `(${this.unseenCount}) ${this.baseTitle}`;
    }

    private resetTitle(): void {
        if (this.baseTitle !== null) document.title = this.baseTitle;
        this.baseTitle = null;
        this.unseenCount = 0;
    }
}
