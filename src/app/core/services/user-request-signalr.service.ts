import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '@/environments/environment';
import { UserRequestMessageResponse } from '@/app/core/models/user-request/user-request.models';
import { UserRequestActivityEvent } from '@/app/core/models/user-request/user-request-activity.models';

const HUB_URL = environment.apiBaseUrl.replace('/api', '') + '/hubs/user-request';
const SEEN_EVENT_LIMIT = 200;

// Talep hub'ı bağlantısı. Bağlantı ortaktır: uygulama geneli bildirim (RequestActivityNotifierService) ve talep
// detayı aynı bağlantıyı kullanır; start / stop sayaçlıdır, son kullanıcı bırakınca kapanır. Token her bağlantı
// ve yeniden bağlanma denemesinde localStorage'dan okunur (süresi dolan token ile bağlantı kopmasın).
@Injectable({ providedIn: 'root' })
export class UserRequestSignalRService implements OnDestroy {
    private connection: signalR.HubConnection | null = null;
    private startPromise: Promise<void> | null = null;
    private consumers = 0;
    private currentRequestId: string | null = null;
    private seenEventIds: string[] = [];

    private newMessageSubject = new Subject<UserRequestMessageResponse>();
    private activitySubject = new Subject<UserRequestActivityEvent>();
    private connectionStateSubject = new BehaviorSubject<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

    newMessage$: Observable<UserRequestMessageResponse> = this.newMessageSubject.asObservable();
    // Uygulamanın her yerinde gösterilen talep olayları (yeni mesaj, iç not, yeni talep, yeniden açma, çözüm onayı)
    activity$: Observable<UserRequestActivityEvent> = this.activitySubject.asObservable();
    connectionState$: Observable<'connected' | 'disconnected' | 'reconnecting'> = this.connectionStateSubject.asObservable();

    async start(): Promise<void> {
        this.consumers++;
        await this.ensureConnected();
    }

    async stop(): Promise<void> {
        this.consumers = Math.max(0, this.consumers - 1);
        if (this.consumers > 0) return;
        await this.disconnect();
    }

    private async ensureConnected(): Promise<void> {
        if (this.startPromise) return this.startPromise;
        // Bağlı ya da kendiliğinden yeniden bağlanıyorsa yeniden başlatılmaz
        if (this.connection && this.connection.state !== signalR.HubConnectionState.Disconnected) return;
        if (!localStorage.getItem('accessToken')) return;

        this.connection ??= this.buildConnection();
        const connection = this.connection;
        this.startPromise = connection.start()
            .then(() => this.connectionStateSubject.next('connected'))
            .catch(err => {
                console.error('UserRequest hub connection error:', err);
                this.connectionStateSubject.next('disconnected');
            })
            .finally(() => (this.startPromise = null));
        return this.startPromise;
    }

    private buildConnection(): signalR.HubConnection {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL, { accessTokenFactory: () => localStorage.getItem('accessToken') || '' })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Warning)
            .build();
        this.registerHandlers(connection);
        this.registerConnectionEvents(connection);
        return connection;
    }

    private async disconnect(): Promise<void> {
        if (this.currentRequestId) {
            await this.leaveRequestRoom(this.currentRequestId);
        }
        const connection = this.connection;
        this.connection = null;
        if (!connection) return;

        try {
            await connection.stop();
        } catch {
            // no-op
        }
        this.connectionStateSubject.next('disconnected');
    }

    async joinRequestRoom(requestId: string): Promise<void> {
        const normalizedRequestId = this.normalizeRequestId(requestId);
        if (!normalizedRequestId) return;

        if (this.startPromise) await this.startPromise;
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;

        if (this.currentRequestId && this.currentRequestId !== normalizedRequestId) {
            await this.leaveRequestRoom(this.currentRequestId);
        }

        try {
            await this.connection.invoke('JoinRequestRoom', normalizedRequestId);
            this.currentRequestId = normalizedRequestId;
        } catch (err) {
            console.error('JoinRequestRoom error:', err);
        }
    }

    async leaveRequestRoom(requestId: string): Promise<void> {
        const normalizedRequestId = this.normalizeRequestId(requestId);
        if (!normalizedRequestId) return;

        if (this.currentRequestId === normalizedRequestId) {
            this.currentRequestId = null;
        }
        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;

        try {
            await this.connection.invoke('LeaveRequestRoom', normalizedRequestId);
        } catch (err) {
            console.error('LeaveRequestRoom error:', err);
        }
    }

    private registerHandlers(connection: signalR.HubConnection): void {
        connection.on('ReceiveRequestMessage', (payload: unknown) => {
            const message = this.normalizeIncomingMessage(payload);
            if (message) this.newMessageSubject.next(message);
        });

        connection.on('RequestActivity', (payload: unknown) => {
            const activity = this.normalizeActivity(payload);
            // Aynı bağlantı birden çok grupta olabilir (kendi grubu + yöneticiler); olay bir kez işlenir
            if (!activity || this.seenEventIds.includes(activity.eventId)) return;
            this.seenEventIds = [...this.seenEventIds.slice(-(SEEN_EVENT_LIMIT - 1)), activity.eventId];
            this.activitySubject.next(activity);
        });
    }

    private normalizeIncomingMessage(payload: unknown): UserRequestMessageResponse | null {
        if (!payload || typeof payload !== 'object') return null;

        const data = payload as Record<string, unknown>;
        const pick = (camel: string, pascal: string): unknown => data[camel] ?? data[pascal];

        const id = String(pick('id', 'Id') ?? '');
        const requestId = String(pick('requestId', 'RequestId') ?? '');
        const createdDate = String(pick('createdDate', 'CreatedDate') ?? new Date().toISOString());

        // Yalnız dosyadan oluşan mesajın metni boş olabilir
        if (!id || !requestId) return null;

        return {
            id,
            requestId: this.normalizeRequestId(requestId) || requestId,
            senderUserId: String(pick('senderUserId', 'SenderUserId') ?? ''),
            message: String(pick('message', 'Message') ?? ''),
            fileUrl: (pick('fileUrl', 'FileUrl') as string | null | undefined) ?? null,
            fileType: (pick('fileType', 'FileType') as string | null | undefined) ?? null,
            isRead: Boolean(pick('isRead', 'IsRead')),
            isBlocked: Boolean(pick('isBlocked', 'IsBlocked')),
            createdDate,
            updatedDate: String(pick('updatedDate', 'UpdatedDate') ?? createdDate),
            senderUserName: String(pick('senderUserName', 'SenderUserName') ?? ''),
            from: String(pick('from', 'From') ?? ''),
            isFromManager: Boolean(pick('isFromManager', 'IsFromManager')),
            isInternal: Boolean(pick('isInternal', 'IsInternal')),
        };
    }

    private normalizeActivity(payload: unknown): UserRequestActivityEvent | null {
        if (!payload || typeof payload !== 'object') return null;

        const data = payload as Record<string, unknown>;
        const pick = (camel: string, pascal: string): unknown => data[camel] ?? data[pascal];
        const eventId = String(pick('eventId', 'EventId') ?? '');
        const requestId = this.normalizeRequestId(String(pick('requestId', 'RequestId') ?? ''));
        if (!eventId || !requestId) return null;

        return {
            eventId,
            type: String(pick('type', 'Type') ?? ''),
            requestId,
            requestNo: String(pick('requestNo', 'RequestNo') ?? ''),
            subject: String(pick('subject', 'Subject') ?? ''),
            actorUserId: String(pick('actorUserId', 'ActorUserId') ?? ''),
            actorName: String(pick('actorName', 'ActorName') ?? ''),
            preview: (pick('preview', 'Preview') as string | null | undefined) ?? null,
            fromManager: Boolean(pick('fromManager', 'FromManager')),
            date: String(pick('date', 'Date') ?? new Date().toISOString()),
        };
    }

    private normalizeRequestId(requestId: string | null | undefined): string {
        return (requestId || '').trim().toLowerCase();
    }

    private registerConnectionEvents(connection: signalR.HubConnection): void {
        connection.onreconnecting(() => this.connectionStateSubject.next('reconnecting'));

        connection.onreconnected(async () => {
            this.connectionStateSubject.next('connected');
            if (this.currentRequestId) {
                const requestId = this.currentRequestId;
                this.currentRequestId = null;
                await this.joinRequestRoom(requestId);
            }
        });

        connection.onclose(() => this.connectionStateSubject.next('disconnected'));
    }

    ngOnDestroy(): void {
        this.consumers = 0;
        this.disconnect();
    }
}
