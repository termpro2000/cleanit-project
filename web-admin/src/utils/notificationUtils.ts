import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  Timestamp,
  getFirestore,
} from 'firebase/firestore';
import { app } from '../firebase';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationSettings,
} from '../types';

const db = getFirestore(app);

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  expiresAt?: Timestamp;
}

// 알림 생성
export const createNotification = async (
  params: CreateNotificationParams
): Promise<void> => {
  try {
    const notification: Omit<Notification, 'id'> = {
      userId: params.userId,
      type: params.type,
      priority: params.priority || 'normal',
      title: params.title,
      message: params.message,
      data: params.data,
      isRead: false,
      actionUrl: params.actionUrl,
      expiresAt: params.expiresAt,
      createdAt: Timestamp.now(),
    };

    await addDoc(collection(db, 'notifications'), notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// 사용자 설정 확인 후 알림 생성
export const createNotificationWithSettings = async (
  params: CreateNotificationParams
): Promise<void> => {
  try {
    // 사용자의 알림 설정 확인
    const settings = await getUserNotificationSettings(params.userId);

    if (!settings || !settings.inAppNotifications) {
      return; // 인앱 알림이 비활성화된 경우
    }

    // 알림 유형별 설정 확인
    const typeEnabled = getNotificationTypeEnabled(settings, params.type);
    if (!typeEnabled) {
      return; // 해당 유형의 알림이 비활성화된 경우
    }

    // 방해 금지 시간 확인
    if (isQuietHours(settings)) {
      return; // 방해 금지 시간인 경우
    }

    await createNotification(params);
  } catch (error) {
    console.error('Error creating notification with settings:', error);
    throw error;
  }
};

// 사용자 알림 설정 조회
export const getUserNotificationSettings = async (
  userId: string
): Promise<NotificationSettings | null> => {
  try {
    const q = query(
      collection(db, 'notificationSettings'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as NotificationSettings;
  } catch (error) {
    console.error('Error getting user notification settings:', error);
    return null;
  }
};

// 알림 유형별 설정 확인
const getNotificationTypeEnabled = (
  settings: NotificationSettings,
  type: NotificationType
): boolean => {
  switch (type) {
    case 'job_assigned':
      return settings.preferences.jobAssigned;
    case 'job_started':
    case 'job_completed':
      return settings.preferences.jobStatusChanges;
    case 'request_created':
    case 'request_assigned':
    case 'request_completed':
      return settings.preferences.requestUpdates;
    case 'message_received':
      return settings.preferences.messages;
    case 'review_received':
      return settings.preferences.reviews;
    case 'system_announcement':
      return settings.preferences.systemAnnouncements;
    default:
      return true;
  }
};

// 방해 금지 시간 확인
const isQuietHours = (settings: NotificationSettings): boolean => {
  if (!settings.quietHours.enabled) {
    return false;
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMinute] = settings.quietHours.startTime
    .split(':')
    .map(Number);
  const [endHour, endMinute] = settings.quietHours.endTime
    .split(':')
    .map(Number);

  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  if (startTime <= endTime) {
    // 같은 날 내에서의 시간 범위 (예: 22:00 - 08:00이 아닌 경우)
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // 자정을 넘나드는 시간 범위 (예: 22:00 - 08:00)
    return currentTime >= startTime || currentTime <= endTime;
  }
};

// 작업 관련 알림 생성 함수들
export const notifyJobAssigned = async (
  workerId: string,
  jobId: string,
  buildingName: string
): Promise<void> => {
  await createNotificationWithSettings({
    userId: workerId,
    type: 'job_assigned',
    priority: 'normal',
    title: '새로운 작업이 배정되었습니다',
    message: `${buildingName}에서 청소 작업이 배정되었습니다.`,
    data: { jobId },
    actionUrl: `/jobs/${jobId}`,
  });
};

export const notifyJobStarted = async (
  clientId: string,
  jobId: string,
  buildingName: string,
  workerName: string
): Promise<void> => {
  await createNotificationWithSettings({
    userId: clientId,
    type: 'job_started',
    priority: 'normal',
    title: '청소 작업이 시작되었습니다',
    message: `${buildingName}에서 ${workerName}님이 청소를 시작했습니다.`,
    data: { jobId },
    actionUrl: `/jobs/${jobId}`,
  });
};

export const notifyJobCompleted = async (
  clientId: string,
  jobId: string,
  buildingName: string,
  workerName: string
): Promise<void> => {
  await createNotificationWithSettings({
    userId: clientId,
    type: 'job_completed',
    priority: 'high',
    title: '청소 작업이 완료되었습니다',
    message: `${buildingName}에서 ${workerName}님의 청소가 완료되었습니다. 결과를 확인해보세요.`,
    data: { jobId },
    actionUrl: `/jobs/${jobId}`,
  });
};

// 요청사항 관련 알림 생성 함수들
export const notifyRequestCreated = async (
  workerId: string,
  requestId: string,
  buildingName: string,
  requestTitle: string
): Promise<void> => {
  await createNotificationWithSettings({
    userId: workerId,
    type: 'request_created',
    priority: 'normal',
    title: '새로운 요청사항이 있습니다',
    message: `${buildingName}에서 "${requestTitle}" 요청이 등록되었습니다.`,
    data: { requestId },
    actionUrl: `/requests/${requestId}`,
  });
};

export const notifyRequestAssigned = async (
  workerId: string,
  requestId: string,
  buildingName: string,
  requestTitle: string
): Promise<void> => {
  await createNotificationWithSettings({
    userId: workerId,
    type: 'request_assigned',
    priority: 'high',
    title: '요청사항이 배정되었습니다',
    message: `${buildingName}의 "${requestTitle}" 요청이 배정되었습니다.`,
    data: { requestId },
    actionUrl: `/requests/${requestId}`,
  });
};

export const notifyRequestCompleted = async (
  clientId: string,
  requestId: string,
  buildingName: string,
  requestTitle: string
): Promise<void> => {
  await createNotificationWithSettings({
    userId: clientId,
    type: 'request_completed',
    priority: 'normal',
    title: '요청사항이 처리되었습니다',
    message: `${buildingName}의 "${requestTitle}" 요청이 처리되었습니다.`,
    data: { requestId },
    actionUrl: `/requests/${requestId}`,
  });
};

// 메시지 관련 알림
export const notifyMessageReceived = async (
  userId: string,
  senderId: string,
  senderName: string,
  conversationId: string,
  messagePreview: string
): Promise<void> => {
  await createNotificationWithSettings({
    userId,
    type: 'message_received',
    priority: 'normal',
    title: `${senderName}님이 메시지를 보냈습니다`,
    message:
      messagePreview.length > 50
        ? `${messagePreview.substring(0, 50)}...`
        : messagePreview,
    data: { senderId, conversationId },
    actionUrl: `/messages/${conversationId}`,
  });
};

// 리뷰 관련 알림
export const notifyReviewReceived = async (
  workerId: string,
  reviewId: string,
  buildingName: string,
  rating: number
): Promise<void> => {
  await createNotificationWithSettings({
    userId: workerId,
    type: 'review_received',
    priority: 'normal',
    title: '새로운 리뷰를 받았습니다',
    message: `${buildingName}에서 ${rating}점 리뷰를 받았습니다.`,
    data: { reviewId },
    actionUrl: `/reviews/${reviewId}`,
  });
};

// 시스템 공지 알림
export const notifySystemAnnouncement = async (
  userIds: string[],
  title: string,
  message: string,
  priority: NotificationPriority = 'normal',
  actionUrl?: string
): Promise<void> => {
  const promises = userIds.map((userId) =>
    createNotificationWithSettings({
      userId,
      type: 'system_announcement',
      priority,
      title,
      message,
      actionUrl,
    })
  );

  await Promise.all(promises);
};

// 만료된 알림 정리 (배치 작업용)
export const cleanupExpiredNotifications = async (): Promise<void> => {
  try {
    const now = Timestamp.now();
    const q = query(
      collection(db, 'notifications'),
      where('expiresAt', '<=', now)
    );

    const snapshot = await getDocs(q);

    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    console.log(`Cleaned up ${snapshot.docs.length} expired notifications`);
  } catch (error) {
    console.error('Error cleaning up expired notifications:', error);
  }
};
