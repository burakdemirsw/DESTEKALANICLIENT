import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '@/environments/environment';
import { UserRequestMessageResponse } from '@/app/core/models/user-request/user-request.models';

const HUB_URL = environment.apiBaseUrl.replace('/api', '') + '/hubs/user-request';

@Injectable({ providedIn: 'root' })
export class UserRequestSignalRService implements OnDestroy {
    private connection: signalR.HubConnection | null = null;
    private currentRequestId: string | null = null;

    private newMessageSubject = new Subject<UserRequestMessageResponse>();
    private connectionStateSubject = new BehaviorSubject<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

    newMessage$: Observable<UserRequestMessageResponse> = this.newMessageSubject.asObservable();
    connectionState$: Observable<'connected' | 'disconnected' | 'reconnecting'> = this.connectionStateSubject.asObservable();

    async start(): Promise<void> {
        if (this.connection?.state === signalR.HubConnectionState.Connected) return;

        const token = localStorage.getItem('accessToken') || '';
        const hubUrlWithToken = `${HUB_URL}?access_token=${encodeURIComponent(token)}`;

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrlWithToken)
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        this.registerHandlers();
        this.registerConnectionEvents();

        try {
            await this.connection.start();
            this.connectionStateSubject.next('connected');
        } catch (err) {
            console.error('UserRequest hub connection error:', err);
            this.connectionStateSubject.next('disconnected');
        }
    }

    async stop(): Promise<void> {
        if (this.currentRequestId) {
            await this.leaveRequestRoom(this.currentRequestId);
        }

        if (!this.connection) return;

        try {
            await this.connection.stop();
        } catch {
            // no-op
        }

        this.connection = null;
        this.connectionStateSubject.next('disconnected');
    }

    async joinRequestRoom(requestId: string): Promise<void> {
        const normalizedRequestId = this.normalizeRequestId(requestId);
        if (!normalizedRequestId) return;

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

        if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) return;

        try {
            await this.connection.invoke('LeaveRequestRoom', normalizedRequestId);
            if (this.currentRequestId === normalizedRequestId) {
                this.currentRequestId = null;
            }
        } catch (err) {
            console.error('LeaveRequestRoom error:', err);
        }
    }

    private registerHandlers(): void {
        if (!this.connection) return;

        this.connection.on('ReceiveRequestMessage', (payload: unknown) => {
            const message = this.normalizeIncomingMessage(payload);
            if (!message) {
                console.warn('ReceiveRequestMessage payload could not be normalized:', payload);
                return;
            }

            this.newMessageSubject.next(message);
        });
    }

    private normalizeIncomingMessage(payload: unknown): UserRequestMessageResponse | null {
        if (!payload || typeof payload !== 'object') return null;

        const data = payload as Record<string, unknown>;
        const pick = (camel: string, pascal: string): unknown => data[camel] ?? data[pascal];

        const id = String(pick('id', 'Id') ?? '');
        const requestId = String(pick('requestId', 'RequestId') ?? '');
        const senderUserId = String(pick('senderUserId', 'SenderUserId') ?? '');
        const message = String(pick('message', 'Message') ?? '');
        const createdDateRaw = pick('createdDate', 'CreatedDate');
        const updatedDateRaw = pick('updatedDate', 'UpdatedDate');
        const createdDate = String(createdDateRaw ?? new Date().toISOString());
        const updatedDate = String(updatedDateRaw ?? createdDate);

        if (!id || !requestId || !message) {
            return null;
        }

        return {
            id,
            requestId: this.normalizeRequestId(requestId) || requestId,
            senderUserId,
            message,
            fileUrl: (pick('fileUrl', 'FileUrl') as string | null | undefined) ?? null,
            fileType: (pick('fileType', 'FileType') as string | null | undefined) ?? null,
            isRead: Boolean(pick('isRead', 'IsRead')),
            isBlocked: Boolean(pick('isBlocked', 'IsBlocked')),
            createdDate,
            updatedDate,
            senderUserName: String(pick('senderUserName', 'SenderUserName') ?? ''),
            from: String(pick('from', 'From') ?? ''),
        };
    }

    private normalizeRequestId(requestId: string | null | undefined): string {
        return (requestId || '').trim().toLowerCase();
    }

    private registerConnectionEvents(): void {
        if (!this.connection) return;

        this.connection.onreconnecting(() => {
            this.connectionStateSubject.next('reconnecting');
        });

        this.connection.onreconnected(async () => {
            this.connectionStateSubject.next('connected');
            if (this.currentRequestId) {
                await this.joinRequestRoom(this.currentRequestId);
            }
        });

        this.connection.onclose(() => {
            this.connectionStateSubject.next('disconnected');
        });
    }

    ngOnDestroy(): void {
        this.stop();
    }
}
