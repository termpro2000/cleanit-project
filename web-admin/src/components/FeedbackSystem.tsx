import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { logger } from '../monitoring/logger';

interface Feedback {
  id?: string;
  userId: string;
  userRole: 'manager' | 'worker' | 'client';
  category: 'bug' | 'feature' | 'usability' | 'performance' | 'general';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  steps?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  screenshot?: string;
  deviceInfo: {
    userAgent: string;
    screenSize: string;
    browser: string;
  };
  currentPage: string;
  satisfactionScore?: number; // 1-5
  createdAt: Timestamp;
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userRole: 'manager' | 'worker' | 'client';
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  userId,
  userRole,
}) => {
  const [category, setCategory] = useState<Feedback['category']>('general');
  const [severity, setSeverity] = useState<Feedback['severity']>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [satisfactionScore, setSatisfactionScore] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setCategory('general');
    setSeverity('medium');
    setTitle('');
    setDescription('');
    setSteps('');
    setExpectedBehavior('');
    setActualBehavior('');
    setSatisfactionScore(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('제목과 설명은 필수입니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      const feedback: Omit<Feedback, 'id'> = {
        userId,
        userRole,
        category,
        severity,
        title: title.trim(),
        description: description.trim(),
        steps: steps.trim() || undefined,
        expectedBehavior: expectedBehavior.trim() || undefined,
        actualBehavior: actualBehavior.trim() || undefined,
        deviceInfo: {
          userAgent: navigator.userAgent,
          screenSize: `${window.screen.width}x${window.screen.height}`,
          browser: getBrowserInfo(),
        },
        currentPage: window.location.pathname,
        satisfactionScore:
          category === 'general' ? satisfactionScore : undefined,
        createdAt: Timestamp.now(),
        status: 'new',
      };

      await addDoc(collection(db, 'feedback'), feedback);

      logger.userAction('feedback_submitted', {
        category,
        severity,
        userRole,
        page: window.location.pathname,
      });

      alert('피드백이 성공적으로 제출되었습니다. 감사합니다!');
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('피드백 제출 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBrowserInfo = (): string => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>📝 피드백 보내기</h2>
          <button onClick={onClose} style={styles.closeButton}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>카테고리 *</label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as Feedback['category'])
                }
                style={styles.select}
              >
                <option value="general">일반 피드백</option>
                <option value="bug">버그 신고</option>
                <option value="feature">기능 요청</option>
                <option value="usability">사용성 개선</option>
                <option value="performance">성능 문제</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>심각도</label>
              <select
                value={severity}
                onChange={(e) =>
                  setSeverity(e.target.value as Feedback['severity'])
                }
                style={styles.select}
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
                <option value="critical">심각</option>
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="간단한 제목을 입력해 주세요"
              style={styles.input}
              maxLength={100}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>상세 설명 *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="문제나 개선사항에 대해 자세히 설명해 주세요"
              style={styles.textarea}
              rows={4}
              maxLength={1000}
            />
          </div>

          {category === 'bug' && (
            <>
              <div style={styles.formGroup}>
                <label style={styles.label}>재현 단계</label>
                <textarea
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder="문제를 재현하는 단계를 순서대로 설명해 주세요"
                  style={styles.textarea}
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>예상된 동작</label>
                  <textarea
                    value={expectedBehavior}
                    onChange={(e) => setExpectedBehavior(e.target.value)}
                    placeholder="어떻게 동작해야 한다고 생각하나요?"
                    style={styles.textarea}
                    rows={2}
                    maxLength={300}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>실제 동작</label>
                  <textarea
                    value={actualBehavior}
                    onChange={(e) => setActualBehavior(e.target.value)}
                    placeholder="실제로는 어떻게 동작하나요?"
                    style={styles.textarea}
                    rows={2}
                    maxLength={300}
                  />
                </div>
              </div>
            </>
          )}

          {category === 'general' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>전반적인 만족도</label>
              <div style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setSatisfactionScore(score)}
                    style={{
                      ...styles.ratingButton,
                      ...(satisfactionScore >= score
                        ? styles.ratingButtonActive
                        : {}),
                    }}
                  >
                    ⭐
                  </button>
                ))}
                <span style={styles.ratingText}>
                  {satisfactionScore}/5 (
                  {satisfactionScore <= 2
                    ? '불만족'
                    : satisfactionScore <= 3
                      ? '보통'
                      : satisfactionScore <= 4
                        ? '만족'
                        : '매우 만족'}
                  )
                </span>
              </div>
            </div>
          )}

          <div style={styles.deviceInfo}>
            <small style={styles.deviceInfoText}>
              📱 기기 정보: {getBrowserInfo()} • {window.screen.width}x
              {window.screen.height} • {window.location.pathname}
            </small>
          </div>

          <div style={styles.formActions}>
            <button type="button" onClick={onClose} style={styles.cancelButton}>
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              style={{
                ...styles.submitButton,
                ...(isSubmitting ? styles.submitButtonDisabled : {}),
              }}
            >
              {isSubmitting ? '전송 중...' : '피드백 전송'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 플로팅 피드백 버튼
interface FloatingFeedbackButtonProps {
  userId: string;
  userRole: 'manager' | 'worker' | 'client';
}

export const FloatingFeedbackButton: React.FC<FloatingFeedbackButtonProps> = ({
  userId,
  userRole,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // 베타 테스트 기간에만 표시
    const isBetaTesting = process.env.REACT_APP_BETA_TESTING === 'true';
    if (!isBetaTesting) {
      setIsMinimized(true);
    }
  }, []);

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        style={styles.minimizedButton}
        title="피드백 보내기"
      >
        💬
      </button>
    );
  }

  return (
    <>
      <div style={styles.floatingContainer}>
        <div style={styles.betaBadge}>BETA</div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={styles.feedbackButton}
          title="피드백 보내기"
        >
          📝 피드백
        </button>
        <button
          onClick={() => setIsMinimized(true)}
          style={styles.minimizeButton}
          title="최소화"
        >
          ▼
        </button>
      </div>

      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
        userRole={userRole}
      />
    </>
  );
};

// 관리자용 피드백 대시보드
export const FeedbackDashboard: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState<'all' | Feedback['status']>('all');
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | Feedback['category']
  >('all');

  useEffect(() => {
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feedbackList: Feedback[] = [];
      snapshot.forEach((doc) => {
        feedbackList.push({
          id: doc.id,
          ...doc.data(),
        } as Feedback);
      });
      setFeedbacks(feedbackList);
    });

    return () => unsubscribe();
  }, []);

  const filteredFeedbacks = feedbacks.filter((feedback) => {
    const statusMatch = filter === 'all' || feedback.status === filter;
    const categoryMatch =
      categoryFilter === 'all' || feedback.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  const getStatusColor = (status: Feedback['status']) => {
    switch (status) {
      case 'new':
        return '#ff4444';
      case 'acknowledged':
        return '#ff8800';
      case 'in_progress':
        return '#2196f3';
      case 'resolved':
        return '#4caf50';
      case 'closed':
        return '#9e9e9e';
      default:
        return '#666';
    }
  };

  const getSeverityColor = (severity: Feedback['severity']) => {
    switch (severity) {
      case 'critical':
        return '#d32f2f';
      case 'high':
        return '#f57c00';
      case 'medium':
        return '#1976d2';
      case 'low':
        return '#388e3c';
      default:
        return '#666';
    }
  };

  return (
    <div style={styles.dashboard}>
      <div style={styles.dashboardHeader}>
        <h2>📊 사용자 피드백 대시보드</h2>

        <div style={styles.filters}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            style={styles.filterSelect}
          >
            <option value="all">모든 상태</option>
            <option value="new">신규</option>
            <option value="acknowledged">확인됨</option>
            <option value="in_progress">진행중</option>
            <option value="resolved">해결됨</option>
            <option value="closed">종료</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            style={styles.filterSelect}
          >
            <option value="all">모든 카테고리</option>
            <option value="bug">버그</option>
            <option value="feature">기능 요청</option>
            <option value="usability">사용성</option>
            <option value="performance">성능</option>
            <option value="general">일반</option>
          </select>
        </div>
      </div>

      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{feedbacks.length}</div>
          <div style={styles.statLabel}>전체 피드백</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>
            {feedbacks.filter((f) => f.status === 'new').length}
          </div>
          <div style={styles.statLabel}>신규</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>
            {feedbacks.filter((f) => f.category === 'bug').length}
          </div>
          <div style={styles.statLabel}>버그</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>
            {feedbacks.filter((f) => f.satisfactionScore).length > 0
              ? (
                  feedbacks
                    .filter((f) => f.satisfactionScore)
                    .reduce((sum, f) => sum + (f.satisfactionScore || 0), 0) /
                  feedbacks.filter((f) => f.satisfactionScore).length
                ).toFixed(1)
              : 'N/A'}
          </div>
          <div style={styles.statLabel}>평균 만족도</div>
        </div>
      </div>

      <div style={styles.feedbackList}>
        {filteredFeedbacks.map((feedback) => (
          <div key={feedback.id} style={styles.feedbackItem}>
            <div style={styles.feedbackHeader}>
              <div style={styles.feedbackTitle}>{feedback.title}</div>
              <div style={styles.feedbackMeta}>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor: getStatusColor(feedback.status),
                  }}
                >
                  {feedback.status}
                </span>
                <span
                  style={{
                    ...styles.severityBadge,
                    backgroundColor: getSeverityColor(feedback.severity),
                  }}
                >
                  {feedback.severity}
                </span>
                <span style={styles.categoryBadge}>{feedback.category}</span>
              </div>
            </div>

            <div style={styles.feedbackContent}>
              <p>{feedback.description}</p>

              {feedback.satisfactionScore && (
                <div style={styles.rating}>
                  만족도: {'⭐'.repeat(feedback.satisfactionScore)} (
                  {feedback.satisfactionScore}/5)
                </div>
              )}
            </div>

            <div style={styles.feedbackFooter}>
              <span>👤 {feedback.userRole}</span>
              <span>📱 {feedback.deviceInfo.browser}</span>
              <span>📄 {feedback.currentPage}</span>
              <span>
                📅 {feedback.createdAt?.toDate?.()?.toLocaleDateString('ko-KR')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  // Modal styles
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '0',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #eee',
  },
  modalTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
  },
  form: {
    padding: '20px',
  },
  formRow: {
    display: 'flex',
    gap: '15px',
    marginBottom: '15px',
  },
  formGroup: {
    marginBottom: '15px',
    flex: 1,
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  ratingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  ratingButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    opacity: 0.3,
    transition: 'opacity 0.2s',
  },
  ratingButtonActive: {
    opacity: 1,
  },
  ratingText: {
    marginLeft: '10px',
    fontSize: '14px',
    color: '#666',
  },
  deviceInfo: {
    margin: '15px 0',
    padding: '10px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
  },
  deviceInfoText: {
    color: '#666',
    fontSize: '12px',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  cancelButton: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    backgroundColor: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  submitButton: {
    padding: '10px 20px',
    border: 'none',
    backgroundColor: '#2196f3',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },

  // Floating button styles
  floatingContainer: {
    position: 'fixed' as const,
    bottom: '20px',
    right: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '5px',
    zIndex: 999,
  },
  betaBadge: {
    backgroundColor: '#ff4444',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  feedbackButton: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '12px 16px',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    boxShadow: '0 2px 10px rgba(33, 150, 243, 0.3)',
    transition: 'all 0.2s',
  },
  minimizeButton: {
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '10px',
  },
  minimizedButton: {
    position: 'fixed' as const,
    bottom: '20px',
    right: '20px',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '20px',
    zIndex: 999,
    boxShadow: '0 2px 10px rgba(33, 150, 243, 0.3)',
  },

  // Dashboard styles
  dashboard: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  dashboardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  filters: {
    display: 'flex',
    gap: '10px',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center' as const,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2196f3',
    marginBottom: '5px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
  },
  feedbackList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  feedbackItem: {
    backgroundColor: 'white',
    border: '1px solid #eee',
    borderRadius: '8px',
    padding: '15px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  feedbackHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  feedbackTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    flex: 1,
  },
  feedbackMeta: {
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap' as const,
  },
  statusBadge: {
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
  },
  severityBadge: {
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
  },
  categoryBadge: {
    backgroundColor: '#f0f0f0',
    color: '#666',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  feedbackContent: {
    marginBottom: '10px',
    lineHeight: '1.5',
  },
  rating: {
    marginTop: '10px',
    fontSize: '14px',
    color: '#666',
  },
  feedbackFooter: {
    display: 'flex',
    gap: '15px',
    fontSize: '12px',
    color: '#666',
    flexWrap: 'wrap' as const,
  },
};

export default FeedbackModal;
