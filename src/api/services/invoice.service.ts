import apiClient from '../api-client';
import { InvoiceDto } from '@/src/types';

/**
 * Service for managing Dynamic Invoices.
 * Handles uploads, processing, validation, and CRUD operations.
 */
export class InvoiceService {
    static async upload(file: File): Promise<InvoiceDto> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<InvoiceDto>('/api/dynamic-invoices/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    }

    static async uploadBatch(files: File[]): Promise<InvoiceDto[]> {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const response = await apiClient.post<InvoiceDto[]>('/api/dynamic-invoices/upload/batch', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return Array.isArray(response.data) ? response.data : [];
    }

    static async getAll(params?: { status?: string; templateId?: number; limit?: number }): Promise<InvoiceDto[]> {
        const response = await apiClient.get<{ invoices?: InvoiceDto[] } | InvoiceDto[]>('/api/dynamic-invoices', {
            params: { limit: 1000, ...params },
        });
        const data = response.data as any;
        if (Array.isArray(data)) return data;
        if (data?.invoices && Array.isArray(data.invoices)) return data.invoices;
        return [];
    }

    static async getById(id: number): Promise<InvoiceDto> {
        const response = await apiClient.get<InvoiceDto>(`/api/dynamic-invoices/${id}`);
        return response.data;
    }

    static async process(id: number): Promise<InvoiceDto> {
        const response = await apiClient.post<InvoiceDto>(`/api/dynamic-invoices/${id}/process`);
        return response.data;
    }

    static async validate(id: number): Promise<InvoiceDto> {
        const response = await apiClient.post<InvoiceDto>(`/api/dynamic-invoices/${id}/validate`);
        return response.data;
    }

    static async updateFields(id: number, fields: Record<string, any>): Promise<InvoiceDto> {
        const response = await apiClient.put<InvoiceDto>(`/api/dynamic-invoices/${id}/fields`, fields);
        return response.data;
    }

    static async delete(id: number): Promise<void> {
        await apiClient.delete(`/api/dynamic-invoices/${id}`);
    }

    static async bulkDelete(ids: number[]): Promise<void> {
        await apiClient.post('/api/dynamic-invoices/bulk/delete', { ids });
    }

    static async bulkProcess(ids: number[]): Promise<void> {
        await apiClient.post('/api/dynamic-invoices/bulk/process', { ids });
    }

    static async bulkValidate(ids: number[]): Promise<void> {
        await apiClient.post('/api/dynamic-invoices/bulk/validate', { ids });
    }

    static async comptabiliser(id: number): Promise<Record<string, any>> {
        const response = await apiClient.post<Record<string, any>>(
            `/api/accounting/journal/entries/from-invoice/${id}`
        );
        return response.data;
    }

    static async previewComptabilisation(id: number): Promise<Record<string, any>> {
        const response = await apiClient.get<Record<string, any>>(
            `/api/accounting/journal/entries/preview/from-invoice/${id}`
        );
        return response.data;
    }

    static async getStats(): Promise<Record<string, any>> {
        const response = await apiClient.get<Record<string, any>>('/api/dynamic-invoices/stats');
        return response.data;
    }

    static getFileUrl(filename: string): string {
        const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
        return `${base}/api/dynamic-invoices/files/${encodeURIComponent(filename)}`;
    }

    static async downloadFile(filename: string): Promise<Blob> {
        const response = await apiClient.get(
            `/api/dynamic-invoices/files/${encodeURIComponent(filename)}`,
            { responseType: 'blob' }
        );
        return response.data as Blob;
    }
}
