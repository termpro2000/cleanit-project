import { Timestamp } from 'firebase/firestore';

export type UserRole = 'client' | 'worker' | 'manager';
export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type RequestType = 'general' | 'additional' | 'urgent' | 'special';
export type RequestPriority = 'normal' | 'high' | 'urgent';
export type RequestStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
export type MessageType = 'text' | 'image' | 'system';

export interface User {
  id?: string;
  role: UserRole;
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
  };
  managerInfo?: {
    name: string;
    companyId: string;
    companyAddress: string;
  };
}

export interface Company {
  id?: string;
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

export interface Building {
  id?: string;
  name: string;
  address: string;
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
  id?: string;
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
  id?: string;
  buildingId: string;
  requesterId: string;
  type: RequestType;
  priority: RequestPriority;
  title: string;
  content: string;
  location?: string;
  photos: string[];
  assignedTo: {
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Conversation {
  id?: string;
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
  id?: string;
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
  id?: string;
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

export type NotificationType =
  | 'job_assigned'
  | 'job_started'
  | 'job_completed'
  | 'request_created'
  | 'request_assigned'
  | 'request_completed'
  | 'message_received'
  | 'review_received'
  | 'system_announcement';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id?: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: {
    jobId?: string;
    requestId?: string;
    buildingId?: string;
    conversationId?: string;
    reviewId?: string;
    [key: string]: any;
  };
  isRead: boolean;
  readAt?: Timestamp;
  actionUrl?: string;
  expiresAt?: Timestamp;
  createdAt: Timestamp;
}

export interface NotificationSettings {
  id?: string;
  userId: string;
  preferences: {
    jobAssigned: boolean;
    jobStatusChanges: boolean;
    requestUpdates: boolean;
    messages: boolean;
    reviews: boolean;
    systemAnnouncements: boolean;
  };
  pushNotifications: boolean;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  updatedAt: Timestamp;
}
