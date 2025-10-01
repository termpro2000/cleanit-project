import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  getFirestore,
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { app } from '../firebase';
import { Notification, NotificationType, NotificationPriority } from '../types';
import BackToDashboard from '../components/BackToDashboard';

const db = getFirestore(app);

const NotificationScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>(
    'all'
  );

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationList: Notification[] = [];
      snapshot.forEach((doc) => {
        notificationList.push({
          id: doc.id,
          ...doc.data(),
        } as Notification);
      });
      setNotifications(notificationList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true,
        readAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.isRead);

    try {
      const promises = unreadNotifications.map((notification) =>
        updateDoc(doc(db, 'notifications', notification.id!), {
          isRead: true,
          readAt: Timestamp.now(),
        })
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'job_assigned':
        return '👷';
      case 'job_started':
        return '🏃';
      case 'job_completed':
        return '✅';
      case 'request_created':
        return '📝';
      case 'request_assigned':
        return '📋';
      case 'request_completed':
        return '✨';
      case 'message_received':
        return '💬';
      case 'review_received':
        return '⭐';
      case 'system_announcement':
        return '📢';
      default:
        return '🔔';
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return '#ff4444';
      case 'high':
        return '#ff8800';
      case 'normal':
        return '#2196f3';
      case 'low':
        return '#9e9e9e';
      default:
        return '#2196f3';
    }
  };

  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case 'job_assigned':
        return '작업 배정';
      case 'job_started':
        return '작업 시작';
      case 'job_completed':
        return '작업 완료';
      case 'request_created':
        return '요청 생성';
      case 'request_assigned':
        return '요청 배정';
      case 'request_completed':
        return '요청 완료';
      case 'message_received':
        return '메시지 수신';
      case 'review_received':
        return '리뷰 수신';
      case 'system_announcement':
        return '시스템 공지';
      default:
        return '알림';
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.isRead;
    return notification.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>알림을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <>
      <BackToDashboard />
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            🔔 알림 센터
            {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
          </h2>

          <div style={styles.actions}>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={styles.markAllButton}>
                모두 읽음 처리
              </button>
            )}
          </div>
        </div>

        <div style={styles.filters}>
          <button
            onClick={() => setFilter('all')}
            style={{
              ...styles.filterButton,
              ...(filter === 'all' ? styles.filterButtonActive : {}),
            }}
          >
            전체 ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            style={{
              ...styles.filterButton,
              ...(filter === 'unread' ? styles.filterButtonActive : {}),
            }}
          >
            읽지 않음 ({unreadCount})
          </button>
          {(
            [
              'job_assigned',
              'request_created',
              'message_received',
              'system_announcement',
            ] as NotificationType[]
          ).map((type) => {
            const count = notifications.filter((n) => n.type === type).length;
            if (count === 0) return null;

            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                style={{
                  ...styles.filterButton,
                  ...(filter === type ? styles.filterButtonActive : {}),
                }}
              >
                {getTypeLabel(type)} ({count})
              </button>
            );
          })}
        </div>

        <div style={styles.notificationList}>
          {filteredNotifications.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🔔</div>
              <div style={styles.emptyText}>
                {filter === 'all'
                  ? '알림이 없습니다.'
                  : `${filter === 'unread' ? '읽지 않은' : getTypeLabel(filter as NotificationType)} 알림이 없습니다.`}
              </div>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  ...styles.notificationItem,
                  ...(notification.isRead ? {} : styles.notificationItemUnread),
                }}
              >
                <div style={styles.notificationIcon}>
                  {getNotificationIcon(notification.type)}
                </div>

                <div style={styles.notificationContent}>
                  <div style={styles.notificationHeader}>
                    <span style={styles.notificationTitle}>
                      {notification.title}
                    </span>
                    <div style={styles.notificationMeta}>
                      <span
                        style={{
                          ...styles.priorityBadge,
                          backgroundColor: getPriorityColor(
                            notification.priority
                          ),
                        }}
                      >
                        {notification.priority}
                      </span>
                      <span style={styles.notificationTime}>
                        {notification.createdAt
                          ?.toDate?.()
                          ?.toLocaleString('ko-KR') || '시간 정보 없음'}
                      </span>
                    </div>
                  </div>

                  <div style={styles.notificationMessage}>
                    {notification.message}
                  </div>

                  <div style={styles.notificationActions}>
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id!)}
                        style={styles.actionButton}
                      >
                        읽음 처리
                      </button>
                    )}
                    {notification.actionUrl && (
                      <button
                        onClick={() => {
                          if (!notification.isRead) {
                            markAsRead(notification.id!);
                          }
                          // Navigate to action URL
                          window.location.href = notification.actionUrl!;
                        }}
                        style={styles.actionButtonPrimary}
                      >
                        상세 보기
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id!)}
                      style={styles.deleteButton}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '2px solid #e0e0e0',
    paddingBottom: '15px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  badge: {
    backgroundColor: '#ff4444',
    color: 'white',
    borderRadius: '12px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  actions: {
    display: 'flex',
    gap: '10px',
  },
  markAllButton: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  filters: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
  },
  filterButton: {
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '20px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: '#2196f3',
    color: 'white',
    borderColor: '#2196f3',
  },
  notificationList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  notificationItem: {
    display: 'flex',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '15px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.2s',
  },
  notificationItemUnread: {
    borderLeftColor: '#2196f3',
    borderLeftWidth: '4px',
    backgroundColor: '#f8f9ff',
  },
  notificationIcon: {
    fontSize: '24px',
    marginRight: '15px',
    display: 'flex',
    alignItems: 'flex-start',
    paddingTop: '2px',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  notificationTitle: {
    fontWeight: 'bold',
    fontSize: '16px',
    color: '#333',
  },
  notificationMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '4px',
  },
  priorityBadge: {
    color: 'white',
    borderRadius: '12px',
    padding: '2px 8px',
    fontSize: '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
  },
  notificationTime: {
    fontSize: '12px',
    color: '#666',
  },
  notificationMessage: {
    color: '#555',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  notificationActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  actionButton: {
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
  },
  actionButtonPrimary: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#666',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '16px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    fontSize: '16px',
    color: '#666',
  },
};

export default NotificationScreen;
