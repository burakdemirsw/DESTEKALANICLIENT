import { Injectable } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { ApiResponse } from '../models/api-response.model';
import {
    CannedReplyResponse,
    CreateCannedReplyRequest,
    UpdateCannedReplyRequest,
} from '../models/canned-reply/canned-reply.models';

export interface CannedReply {
    id: string;
    title: string;
    text: string;
}

// Destek yöneticilerinin ortak hazır yanıtları (API'de, ekip içinde ortak). Yalnız destek yöneticisi çağırabilir.
@Injectable({ providedIn: 'root' })
export class CannedRepliesService {
    private static readonly TITLE_LENGTH = 60;

    constructor(private http: HttpClientService) {}

    getAllRaw(includeBlocked = false): Promise<ApiResponse<CannedReplyResponse[]>> {
        return this.http.get<CannedReplyResponse[]>({
            controller: 'CannedReplies',
            queryString: includeBlocked ? 'includeBlocked=true' : undefined,
        });
    }

    create(request: CreateCannedReplyRequest): Promise<ApiResponse<CannedReplyResponse>> {
        return this.http.post<CannedReplyResponse>({ controller: 'CannedReplies' }, request);
    }

    update(id: string, request: UpdateCannedReplyRequest): Promise<ApiResponse<unknown>> {
        return this.http.post<unknown>({ controller: 'CannedReplies', action: `update/${id}` }, request);
    }

    delete(id: string): Promise<ApiResponse<unknown>> {
        return this.http.post<unknown>({ controller: 'CannedReplies', action: `delete/${id}` }, {});
    }

    // Yanıt kutusunda kullanılan aktif hazır yanıtlar
    async getAll(): Promise<CannedReply[]> {
        const response = await this.getAllRaw();
        return (response?.data ?? []).map(item => ({ id: item.id, title: item.title, text: item.text }));
    }

    // Yazılan metni hazır yanıt olarak ekler; başlık metnin başından üretilir. Güncel listeyi döner.
    async add(text: string, order = 0): Promise<CannedReply[]> {
        const trimmed = text.trim();
        if (!trimmed) return this.getAll();
        const firstLine = trimmed.split(/\r?\n/)[0];
        const title = firstLine.length > CannedRepliesService.TITLE_LENGTH
            ? `${firstLine.slice(0, CannedRepliesService.TITLE_LENGTH - 1)}…`
            : firstLine;
        await this.create({ title, text: trimmed, order });
        return this.getAll();
    }

    async remove(id: string): Promise<CannedReply[]> {
        await this.delete(id);
        return this.getAll();
    }
}
