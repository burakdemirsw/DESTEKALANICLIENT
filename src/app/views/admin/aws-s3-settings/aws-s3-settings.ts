import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AwsS3SettingsService } from '@/app/core/services/aws-s3-settings.service';
import { AwsS3SettingResponse, CreateAwsS3SettingRequest, UpdateAwsS3SettingRequest } from '@/app/core/models/aws-s3/aws-s3.models';
import { RowActions } from '@app/components/row-actions/row-actions';
import { describeHttpError, showToast } from '@/app/utils/feedback';
import { ConfirmModal } from '@app/components/confirm-modal';

@Component({
    selector: 'app-aws-s3-settings-page',
    imports: [CommonModule, FormsModule, RowActions, ConfirmModal],
    templateUrl: './aws-s3-settings.html',
})
export class AwsS3SettingsPage implements OnInit {
    settings: AwsS3SettingResponse[] = [];
    filteredItems: AwsS3SettingResponse[] = [];
    pagedItems: AwsS3SettingResponse[] = [];
    loading = false;
    showModal = false;
    editMode = false;
    selectedSetting: AwsS3SettingResponse | null = null;

    filterText = '';
    currentPage = 1;
    pageSize = 10;
    totalPages = 1;
    totalPagesArray: number[] = [];

    form: any = {
        region: '',
        bucketName: '',
        accessKey: '',
        secretKey: '',
        isActive: true,
        isBlocked: false,
    };

    constructor(private awsS3Service: AwsS3SettingsService) {}

    ngOnInit(): void {
        this.loadSettings();
    }

    async loadSettings(): Promise<void> {
        this.loading = true;
        try {
            const response = await this.awsS3Service.getAll();
            this.settings = this.extractArray(response);
            this.applyFilterAndPaging();
        } catch (err) {
            console.error('AwsS3Settings error:', err);
        } finally {
            this.loading = false;
        }
    }

    private extractArray(response: any): AwsS3SettingResponse[] {
        if (Array.isArray(response)) return response;
        if (response?.$values) return response.$values;
        if (response?.data) return Array.isArray(response.data) ? response.data : [response.data];
        if (response?.items) return response.items;
        if (response?.result) return Array.isArray(response.result) ? response.result : [response.result];
        return [];
    }

    onFilterChange(): void {
        this.currentPage = 1;
        this.applyFilterAndPaging();
    }

    setPage(page: number): void {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.applyFilterAndPaging();
    }

    applyFilterAndPaging(): void {
        const term = this.filterText.toLowerCase();
        this.filteredItems = this.settings.filter(s =>
            s.region?.toLowerCase().includes(term) ||
            s.bucketName?.toLowerCase().includes(term) ||
            s.accessKey?.toLowerCase().includes(term)
        );
        this.totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize));
        this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
        const start = (this.currentPage - 1) * this.pageSize;
        this.pagedItems = this.filteredItems.slice(start, start + this.pageSize);
    }

    openCreate(): void {
        this.editMode = false;
        this.selectedSetting = null;
        this.form = { region: '', bucketName: '', accessKey: '', secretKey: '', isActive: true, isBlocked: false };
        this.showModal = true;
    }

    openEdit(setting: AwsS3SettingResponse): void {
        this.editMode = true;
        this.selectedSetting = setting;
        this.form = {
            region: setting.region,
            bucketName: setting.bucketName,
            accessKey: setting.accessKey,
            secretKey: setting.secretKey,
            isActive: setting.isActive,
            isBlocked: setting.isBlocked,
        };
        this.showModal = true;
    }

    async save(): Promise<void> {
        try {
            if (this.editMode && this.selectedSetting) {
                const req: UpdateAwsS3SettingRequest = {
                    region: this.form.region,
                    bucketName: this.form.bucketName,
                    accessKey: this.form.accessKey,
                    secretKey: this.form.secretKey,
                    isActive: this.form.isActive,
                    isBlocked: this.form.isBlocked,
                };
                await this.awsS3Service.update(this.selectedSetting.id, req);
            } else {
                const req: CreateAwsS3SettingRequest = {
                    region: this.form.region,
                    bucketName: this.form.bucketName,
                    accessKey: this.form.accessKey,
                    secretKey: this.form.secretKey,
                    isActive: this.form.isActive,
                };
                await this.awsS3Service.create(req);
            }
            this.showModal = false;
            await this.loadSettings();
        } catch (err) {
            console.error('Save error:', err);
        }
    }

    // Silme onayı sayfa içi modalda sorulur (tarayıcının confirm penceresi yerine)
    pendingDelete: AwsS3SettingResponse | null = null;
    deleting = false;

    deleteSetting(setting: AwsS3SettingResponse): void {
        this.pendingDelete = setting;
    }

    cancelDelete(): void {
        if (!this.deleting) this.pendingDelete = null;
    }

    async confirmDelete(): Promise<void> {
        const setting = this.pendingDelete;
        if (!setting || this.deleting) return;

        this.deleting = true;
        try {
            await this.awsS3Service.delete(setting.id);
            this.pendingDelete = null;
            showToast('success', 'AWS S3 ayarı silindi.');
            await this.loadSettings();
        } catch (err) {
            console.error('Delete error:', err);
            showToast('error', describeHttpError(err) || 'AWS S3 ayarı silinemedi.');
        } finally {
            this.deleting = false;
        }
    }

    closeModal(): void {
        this.showModal = false;
    }
}
