import { api } from './api';

export interface HomepageContent {
  title: string;
  heroText: string;
  features: string[];
  stats: {
    shipments: number;
    customers: number;
    warehouses: number;
  };
}

export interface AboutContent {
  title: string;
  description: string;
  mission: string;
  vision: string;
}

export const cmsService = {
  getHomepage: () => api.get<HomepageContent>('/api/cms/homepage'),
  updateHomepage: (data: HomepageContent) => api.put<HomepageContent>('/api/cms/homepage', data),
  getAbout: () => api.get<AboutContent>('/api/cms/about'),
  updateAbout: (data: AboutContent) => api.put<AboutContent>('/api/cms/about', data),
};