import { Timestamp } from 'firebase/firestore';

export type UserRole = 'client' | 'worker' | 'manager' | 'admin';
export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type RequestType = 'general' | 'additional' | 'urgent' | 'special';
export type RequestPriority = 'normal' | 'high' | 'urgent';
export type RequestStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type MessageType = 'text' | 'image' | 'system';

export interface User {
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  emergencyPhone?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  clientInfo?: {
    address: string;
  };
  workerInfo?: {
    bankName: string;
    accountNumber: string;
    companyId?: string;
    address?: string;
    experience?: string;
    specialSkills?: string;
    joinDate?: Timestamp;
    rating?: number;
    completedJobs?: number;
  };
  managerInfo?: {
    name: string;
    companyId: string;
    companyAddress: string;
  };
  adminInfo?: {
    name: string;
    permissions: string[];
    department?: string;
  };
}

export interface Company {
  name: string;
  managerId: string;
  address: string;
  phone: string;
  workerCount: number;
  buildingCount: number;
  monthlyRevenue?: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type BuildingType = 'apartment' | 'office' | 'commercial' | 'house' | 'other';

export interface Building {
  id?: string;
  name: string;
  address: string;
  type: BuildingType;
  area?: number;
  contact: {
    name: string;
    phone: string;
    address: string;
  };
  floors: {
    basement: number;
    ground: number;
    total: number;
    hasElevator: boolean;
  };
  parking: {
    available: boolean;
    spaces?: number;
  };
  ownerId: string;
  companyId?: string;
  cleaningAreas: string[];
  specialNotes?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Job {
  buildingId: string;
  workerId: string;
  companyId: string;
  scheduledAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  duration?: number;
  status: JobStatus;
  areas: string[];
  beforePhotos: string[];
  afterPhotos: string[];
  workerNotes?: string;
  completionRate: number;
  isVisible: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Request {
  buildingId: string;
  requesterId: string;
  type: RequestType;
  priority: RequestPriority;
  title: string;
  content: string;
  location?: string;
  photos: string[];
  assignedTo: {
    adminId?: string;  // admin에게 먼저 할당
    workerId?: string;
    companyId?: string;
  };
  status: RequestStatus;
  response?: {
    status: 'completed' | 'incomplete';
    notes: string;
    photos: string[];
    completedAt: Timestamp;
  };
  approvedByAdmin?: boolean;  // admin 승인 여부
  adminNotes?: string;        // admin 메모
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Conversation {
  participants: string[];
  participantRoles: string[];
  lastMessage: {
    content: string;
    senderId: string;
    timestamp: Timestamp;
    type: MessageType;
  };
  buildingId?: string;
  jobId?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Message {
  senderId: string;
  content: string;
  type: MessageType;
  imageUrl?: string;
  readBy: {
    [userId: string]: Timestamp;
  };
  createdAt: Timestamp;
}

export interface Review {
  jobId: string;
  buildingId: string;
  reviewerId: string;
  workerId: string;
  companyId: string;
  rating: number;
  comment?: string;
  categories: {
    cleanliness: number;
    punctuality: number;
    communication: number;
    overall: number;
  };
  improvements?: string[];
  isVisible: boolean;
  createdAt: Timestamp;
}