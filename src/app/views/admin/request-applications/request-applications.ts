import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageTitle } from '@app/components/page-title';
import { AuthStateService } from '@core/services/auth-state.service';
import { RequestApplicationsService } from '@core/services/request-applications.service';
import {
  RequestApplicationResponse,
  CreateRequestApplicationRequest,
  UpdateRequestApplicationRequest,
} from '@core/models/request-application/request-application.models';

interface RequestApplicationForm {
  applicationName: string;
  description: string;
  photoUrl: string;
  isBlocked: boolean;
}

@Component({
  selector: 'app-request-applications-page',
  imports: [CommonModule, FormsModule, PageTitle],
  templateUrl: './request-applications.html',
})
export class RequestApplicationsPage implements OnInit {
  items: RequestApplicationResponse[] = [];
  loading = false;
  showModal = false;
  editMode = false;
  selectedItem: RequestApplicationResponse | null = null;

  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 1;
  totalPagesArray: number[] = [];

  form: RequestApplicationForm = {
    applicationName: '',
    description: '',
    photoUrl: '',
    isBlocked: false,
  };

  constructor(
    private requestApplicationsService: RequestApplicationsService,
    private authStateService: AuthStateService,
  ) {}

  ngOnInit(): void {
    this.loadItems();
  }

  async loadItems(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.requestApplicationsService.getPaged({
        companyId: this.authStateService.profile?.companyId ?? '',
        pageNumber: this.currentPage,
        pageSize: this.pageSize,
        searchTerm: this.searchTerm,
      });

      const paged = response?.data;
      this.items = paged?.items ?? [];
      this.totalCount = paged?.totalCount ?? this.items.length;
      this.totalPages = paged?.totalPages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));
      this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    } catch (err) {
      console.error('RequestApplications load error:', err);
    } finally {
      this.loading = false;
    }
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.loadItems();
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadItems();
  }

  private extractArray<T>(response: unknown): T[] {
    if (Array.isArray(response)) return response;

    const objectResponse = response as {
      $values?: T[];
      data?: T[] | T;
      items?: T[];
      result?: T[] | T;
    };

    if (objectResponse?.$values) return objectResponse.$values;
    if (objectResponse?.data) return Array.isArray(objectResponse.data) ? objectResponse.data : [objectResponse.data];
    if (objectResponse?.items) return objectResponse.items;
    if (objectResponse?.result) return Array.isArray(objectResponse.result) ? objectResponse.result : [objectResponse.result];
    return [];
  }

  openCreate(): void {
    this.editMode = false;
    this.selectedItem = null;
    this.form = {
      applicationName: '',
      description: '',
      photoUrl: '',
      isBlocked: false,
    };
    this.showModal = true;
  }

  openEdit(item: RequestApplicationResponse): void {
    this.editMode = true;
    this.selectedItem = item;
    this.form = {
      applicationName: item.applicationName ?? '',
      description: item.description ?? '',
      photoUrl: item.photoUrl ?? '',
      isBlocked: item.isBlocked ?? false,
    };
    this.showModal = true;
  }

  async save(): Promise<void> {
    try {
      if (this.editMode && this.selectedItem) {
        const requestBody: UpdateRequestApplicationRequest = {
          applicationName: this.form.applicationName,
          description: this.form.description,
          photoUrl: this.form.photoUrl || null,
          isBlocked: this.form.isBlocked,
        };
        await this.requestApplicationsService.update(this.selectedItem.id, requestBody);
      } else {
        const requestBody: CreateRequestApplicationRequest = {
          applicationName: this.form.applicationName,
          description: this.form.description,
          photoUrl: this.form.photoUrl || null,
        };
        await this.requestApplicationsService.create(requestBody);
      }

      this.showModal = false;
      await this.loadItems();
    } catch (err) {
      console.error('RequestApplications save error:', err);
    }
  }

  async deleteItem(item: RequestApplicationResponse): Promise<void> {
    if (!confirm(`"${item.applicationName ?? ''}" uygulamasini silmek istediginize emin misiniz?`)) {
      return;
    }

    try {
      await this.requestApplicationsService.delete(item.id);
      await this.loadItems();
    } catch (err) {
      console.error('RequestApplications delete error:', err);
    }
  }

  closeModal(): void {
    this.showModal = false;
  }
}
