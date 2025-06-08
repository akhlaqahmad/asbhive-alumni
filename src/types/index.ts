export interface AlumniData {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  education: string[];
  summary: string;
  linkedinUrl: string;
  pastRoles: PastRole[];
  scrapedAt: string;
  status: 'success' | 'failed' | 'pending';
  error?: string;
}

export interface PastRole {
  title: string;
  company: string;
  years: string;
  location?: string;
}

export interface ScrapingJob {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalProfiles: number;
  processedProfiles: number;
  successfulProfiles: number;
  failedProfiles: number;
  currentProfile?: string;
  results?: AlumniData[];
  startedAt: string;
  completedAt?: string;
  errors: string[];
}

export interface UploadedFile {
  name: string;
  linkedin_url: string;
}