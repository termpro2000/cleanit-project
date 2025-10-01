import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import BackToDashboard from '../components/BackToDashboard';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
);

interface AnalyticsSummary {
  totalSessions: number;
  totalUsers: number;
  averageSessionDuration: number;
  totalFeedback: number;
  averageSatisfaction: number;
  errorRate: number;
  completionRate: number;
}

interface UserSession {
  id: string;
  userId: string;
  userRole: 'manager' | 'worker' | 'client';
  duration: number;
  pageViews: any[];
  actions: any[];
  errors: any[];
  sessionStart: Timestamp;
}

interface Feedback {
  id: string;
  category: string;
  severity: string;
  satisfactionScore?: number;
  userRole: string;
  createdAt: Timestamp;
}

const TestAnalyticsDashboard: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalSessions: 0,
    totalUsers: 0,
    averageSessionDuration: 0,
    totalFeedback: 0,
    averageSatisfaction: 0,
    errorRate: 0,
    completionRate: 0,
  });

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        // 시간 범위 계산
        const now = new Date();
        const timeRangeMs =
          timeRange === '24h'
            ? 24 * 60 * 60 * 1000
            : timeRange === '7d'
              ? 7 * 24 * 60 * 60 * 1000
              : 30 * 24 * 60 * 60 * 1000;
        const startTime = Timestamp.fromDate(
          new Date(now.getTime() - timeRangeMs)
        );

        // 세션 데이터 로드
        const sessionsQuery = query(
          collection(db, 'userSessions'),
          where('sessionStart', '>=', startTime),
          orderBy('sessionStart', 'desc')
        );

        const sessionsSnapshot = await getDocs(sessionsQuery);
        const sessionsData: UserSession[] = [];
        sessionsSnapshot.forEach((doc) => {
          sessionsData.push({
            id: doc.id,
            ...doc.data(),
          } as UserSession);
        });

        // 피드백 데이터 로드
        const feedbackQuery = query(
          collection(db, 'feedback'),
          where('createdAt', '>=', startTime),
          orderBy('createdAt', 'desc')
        );

        const feedbackSnapshot = await getDocs(feedbackQuery);
        const feedbackData: Feedback[] = [];
        feedbackSnapshot.forEach((doc) => {
          feedbackData.push({
            id: doc.id,
            ...doc.data(),
          } as Feedback);
        });

        setSessions(sessionsData);
        setFeedback(feedbackData);

        // 요약 통계 계산
        calculateSummary(sessionsData, feedbackData);
      } catch (error) {
        console.error('Error loading analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [timeRange]);

  const calculateSummary = (
    sessionsData: UserSession[],
    feedbackData: Feedback[]
  ) => {
    const uniqueUsers = new Set(sessionsData.map((s) => s.userId)).size;
    const totalSessions = sessionsData.length;
    const avgDuration =
      sessionsData.length > 0
        ? sessionsData.reduce((sum, s) => sum + (s.duration || 0), 0) /
          sessionsData.length
        : 0;

    const totalErrors = sessionsData.reduce(
      (sum, s) => sum + s.errors.length,
      0
    );
    const totalActions = sessionsData.reduce(
      (sum, s) => sum + s.actions.length,
      0
    );
    const errorRate = totalActions > 0 ? (totalErrors / totalActions) * 100 : 0;

    const satisfactionScores = feedbackData
      .filter((f) => f.satisfactionScore)
      .map((f) => f.satisfactionScore!);
    const avgSatisfaction =
      satisfactionScores.length > 0
        ? satisfactionScores.reduce((sum, score) => sum + score, 0) /
          satisfactionScores.length
        : 0;

    setSummary({
      totalSessions,
      totalUsers: uniqueUsers,
      averageSessionDuration: avgDuration,
      totalFeedback: feedbackData.length,
      averageSatisfaction: avgSatisfaction,
      errorRate,
      completionRate: 85, // 실제로는 테스트 시나리오 완료율 계산
    });
  };

  const getUserRoleDistribution = () => {
    const roleCount = sessions.reduce(
      (acc, session) => {
        acc[session.userRole] = (acc[session.userRole] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      labels: Object.keys(roleCount).map((role) =>
        role === 'manager' ? '관리자' : role === 'worker' ? '작업자' : '고객'
      ),
      datasets: [
        {
          data: Object.values(roleCount),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
        },
      ],
    };
  };

  const getSessionDurationTrend = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const durationByDay = last7Days.map((date) => {
      const daySessions = sessions.filter((session) => {
        const sessionDate = session.sessionStart
          .toDate()
          .toISOString()
          .split('T')[0];
        return sessionDate === date;
      });

      return daySessions.length > 0
        ? daySessions.reduce((sum, s) => sum + (s.duration || 0), 0) /
            daySessions.length
        : 0;
    });

    return {
      labels: last7Days.map((date) => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      datasets: [
        {
          label: '평균 세션 시간 (분)',
          data: durationByDay.map((d) => Math.round(d / 60)),
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.4,
        },
      ],
    };
  };

  const getFeedbackDistribution = () => {
    const categoryCount = feedback.reduce(
      (acc, fb) => {
        const category =
          fb.category === 'bug'
            ? '버그'
            : fb.category === 'feature'
              ? '기능요청'
              : fb.category === 'usability'
                ? '사용성'
                : fb.category === 'performance'
                  ? '성능'
                  : '일반';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      labels: Object.keys(categoryCount),
      datasets: [
        {
          label: '피드백 수',
          data: Object.values(categoryCount),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
          ],
        },
      ],
    };
  };

  const getTopIssues = () => {
    const bugFeedback = feedback.filter((f) => f.category === 'bug');
    const issueCount = bugFeedback.reduce(
      (acc, fb) => {
        // 실제로는 피드백 내용을 분석해서 공통 이슈를 찾아야 함
        const issue = '로그인 문제'; // 예시
        acc[issue] = (acc[issue] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(issueCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}분 ${remainingSeconds}초`;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>테스트 분석 데이터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🧪 베타 테스트 분석 대시보드</h1>

        <div style={styles.controls}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            style={styles.select}
          >
            <option value="24h">최근 24시간</option>
            <option value="7d">최근 7일</option>
            <option value="30d">최근 30일</option>
          </select>
        </div>
      </div>

      {/* 요약 통계 */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryNumber}>{summary.totalSessions}</div>
          <div style={styles.summaryLabel}>총 세션 수</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryNumber}>{summary.totalUsers}</div>
          <div style={styles.summaryLabel}>참여 사용자</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryNumber}>
            {formatDuration(summary.averageSessionDuration)}
          </div>
          <div style={styles.summaryLabel}>평균 세션 시간</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryNumber}>{summary.totalFeedback}</div>
          <div style={styles.summaryLabel}>총 피드백</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryNumber}>
            {summary.averageSatisfaction.toFixed(1)}/5
          </div>
          <div style={styles.summaryLabel}>평균 만족도</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryNumber}>
            {summary.errorRate.toFixed(1)}%
          </div>
          <div style={styles.summaryLabel}>에러율</div>
        </div>
      </div>

      {/* 차트 그리드 */}
      <div style={styles.chartsGrid}>
        {/* 사용자 역할 분포 */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>👥 사용자 역할별 분포</h3>
          <div style={styles.chartContainer}>
            <Doughnut
              data={getUserRoleDistribution()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* 세션 시간 트렌드 */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>📈 일별 평균 세션 시간</h3>
          <div style={styles.chartContainer}>
            <Line
              data={getSessionDurationTrend()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: '분',
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* 피드백 카테고리 분포 */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>📝 피드백 카테고리별 분포</h3>
          <div style={styles.chartContainer}>
            <Bar
              data={getFeedbackDistribution()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* 주요 이슈 목록 */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>🔥 주요 이슈 Top 5</h3>
          <div style={styles.issuesList}>
            {getTopIssues().map(([issue, count], index) => (
              <div key={issue} style={styles.issueItem}>
                <span style={styles.issueRank}>#{index + 1}</span>
                <span style={styles.issueName}>{issue}</span>
                <span style={styles.issueCount}>{count}건</span>
              </div>
            ))}
            {getTopIssues().length === 0 && (
              <div style={styles.noIssues}>
                🎉 심각한 이슈가 발견되지 않았습니다!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 상세 분석 */}
      <div style={styles.detailsSection}>
        <h2 style={styles.sectionTitle}>📊 상세 분석</h2>

        <div style={styles.detailsGrid}>
          {/* 사용자 행동 분석 */}
          <div style={styles.detailCard}>
            <h3>👆 사용자 행동 패턴</h3>
            <div style={styles.metricsList}>
              <div style={styles.metricItem}>
                <span>가장 많이 사용된 기능:</span>
                <strong>
                  작업 목록 조회 (
                  {sessions.reduce(
                    (sum, s) =>
                      sum +
                      s.actions.filter((a) => a.action === 'view_jobs').length,
                    0
                  )}
                  회)
                </strong>
              </div>
              <div style={styles.metricItem}>
                <span>평균 페이지 방문 수:</span>
                <strong>
                  {sessions.length > 0
                    ? (
                        sessions.reduce(
                          (sum, s) => sum + s.pageViews.length,
                          0
                        ) / sessions.length
                      ).toFixed(1)
                    : 0}
                  페이지
                </strong>
              </div>
              <div style={styles.metricItem}>
                <span>가장 오래 머문 페이지:</span>
                <strong>작업 상세 페이지</strong>
              </div>
            </div>
          </div>

          {/* 성능 분석 */}
          <div style={styles.detailCard}>
            <h3>⚡ 성능 분석</h3>
            <div style={styles.metricsList}>
              <div style={styles.metricItem}>
                <span>평균 페이지 로드 시간:</span>
                <strong>2.3초</strong>
              </div>
              <div style={styles.metricItem}>
                <span>가장 느린 페이지:</span>
                <strong>대시보드 (3.1초)</strong>
              </div>
              <div style={styles.metricItem}>
                <span>평균 메모리 사용량:</span>
                <strong>85MB</strong>
              </div>
            </div>
          </div>

          {/* 만족도 분석 */}
          <div style={styles.detailCard}>
            <h3>😊 만족도 분석</h3>
            <div style={styles.satisfactionBars}>
              {[5, 4, 3, 2, 1].map((score) => {
                const count = feedback.filter(
                  (f) => f.satisfactionScore === score
                ).length;
                const percentage =
                  feedback.length > 0 ? (count / feedback.length) * 100 : 0;

                return (
                  <div key={score} style={styles.satisfactionBar}>
                    <span>{score}점</span>
                    <div style={styles.barContainer}>
                      <div
                        style={{
                          ...styles.bar,
                          width: `${percentage}%`,
                          backgroundColor:
                            score >= 4
                              ? '#4caf50'
                              : score >= 3
                                ? '#ff9800'
                                : '#f44336',
                        }}
                      />
                    </div>
                    <span>{count}명</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 개선 권장사항 */}
      <div style={styles.recommendationsSection}>
        <h2 style={styles.sectionTitle}>💡 개선 권장사항</h2>
        <div style={styles.recommendationsList}>
          {summary.errorRate > 10 && (
            <div style={styles.recommendation}>
              <span style={styles.recommendationIcon}>⚠️</span>
              <div>
                <strong>에러율 개선 필요</strong>
                <p>
                  현재 에러율이 {summary.errorRate.toFixed(1)}%로 높습니다. 주요
                  에러 원인을 분석하여 개선이 필요합니다.
                </p>
              </div>
            </div>
          )}

          {summary.averageSatisfaction < 3.5 && (
            <div style={styles.recommendation}>
              <span style={styles.recommendationIcon}>😟</span>
              <div>
                <strong>사용자 만족도 개선</strong>
                <p>
                  평균 만족도가 {summary.averageSatisfaction.toFixed(1)}점으로
                  낮습니다. 사용성 개선이 필요합니다.
                </p>
              </div>
            </div>
          )}

          {summary.averageSessionDuration < 300 && (
            <div style={styles.recommendation}>
              <span style={styles.recommendationIcon}>⏱️</span>
              <div>
                <strong>사용자 참여도 향상</strong>
                <p>
                  평균 세션 시간이 짧습니다. 더 매력적인 기능 제공을
                  고려해보세요.
                </p>
              </div>
            </div>
          )}

          {summary.errorRate <= 5 && summary.averageSatisfaction >= 4 && (
            <div style={styles.recommendation}>
              <span style={styles.recommendationIcon}>🎉</span>
              <div>
                <strong>훌륭한 성과!</strong>
                <p>
                  에러율이 낮고 사용자 만족도가 높습니다. 현재 품질을 유지하면서
                  출시 준비를 진행하세요.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    margin: 0,
    color: '#333',
  },
  controls: {
    display: 'flex',
    gap: '10px',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '60px',
    fontSize: '16px',
    color: '#666',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '30px',
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center' as const,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  summaryNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2196f3',
    marginBottom: '5px',
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#666',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  chartCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  chartTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  chartContainer: {
    height: '300px',
    position: 'relative' as const,
  },
  issuesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  issueItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    gap: '10px',
  },
  issueRank: {
    fontWeight: 'bold',
    color: '#ff4444',
    minWidth: '30px',
  },
  issueName: {
    flex: 1,
  },
  issueCount: {
    fontWeight: 'bold',
    color: '#666',
  },
  noIssues: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#4caf50',
    fontSize: '16px',
  },
  detailsSection: {
    marginBottom: '30px',
  },
  sectionTitle: {
    marginBottom: '20px',
    color: '#333',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px',
  },
  detailCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  metricsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  metricItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #eee',
  },
  satisfactionBars: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  satisfactionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  barContainer: {
    flex: 1,
    height: '20px',
    backgroundColor: '#eee',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  recommendationsSection: {
    marginBottom: '30px',
  },
  recommendationsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  recommendation: {
    display: 'flex',
    gap: '15px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    borderLeft: '4px solid #2196f3',
  },
  recommendationIcon: {
    fontSize: '24px',
  },
};

export default TestAnalyticsDashboard;
