import { api } from './api';

export interface Report {
  id: number;
  type: string;
  name: string;
  data?: string;
  generatedAt: string;
  generatedBy: number;
}

export interface GenerateReportDto {
  type: string;
  name: string;
  startDate?: string;
  endDate?: string;
  userId?: number;
  productId?: number;
  orderId?: number;
}

export const reportService = {
  getAll: () => api.get<Report[]>('/api/reports'),
  getById: (id: number) => api.get<Report>(`/api/reports/${id}`),
  getByType: (type: string) => api.get<Report[]>(`/api/reports/type/${type}`),
  generate: (data: GenerateReportDto) => api.post<Report>('/api/reports/generate', data),
  delete: (id: number) => api.delete<void>(`/api/reports/${id}`),
  getSummary: () => api.get<{
    totalReports: number;
    reportsThisWeek: number;
    reportsThisMonth: number;
    reportsByType: Record<string, number>;
  }>('/api/reports/summary'),
};