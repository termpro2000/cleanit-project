import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from 'firebase/firestore';
import app from '../firebase';
import OverallJobStatus from '../components/OverallJobStatus';
import { Job, User } from '../types';

const auth = getAuth(app);
const db = getFirestore(app);

interface DashboardStats {
  totalWorkers: number;
  activeWorkers: number;
  totalBuildings: number;
  todayJobs: number;
  pendingRequests: number;
  monthlyRevenue: number;
}

const ManagerDashboard: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkers: 0,
    activeWorkers: 0,
    totalBuildings: 0,
    todayJobs: 0,
    pendingRequests: 0,
    monthlyRevenue: 0,
  });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
      } else {
        setUserEmail(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // 통계 데이터 수집
    const fetchStats = async () => {
      try {
        // Workers 통계
        const workersUnsubscribe = onSnapshot(
          query(collection(db, 'users'), where('role', '==', 'worker')),
          (snapshot) => {
            const totalWorkers = snapshot.size;
            const activeWorkers = snapshot.docs.filter(
              (doc) => (doc.data() as User).isActive
            ).length;

            setStats((prev) => ({ ...prev, totalWorkers, activeWorkers }));
          }
        );

        // Buildings 통계
        const buildingsUnsubscribe = onSnapshot(
          collection(db, 'buildings'),
          (snapshot) => {
            setStats((prev) => ({ ...prev, totalBuildings: snapshot.size }));
          }
        );

        // 오늘 작업 통계
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const jobsUnsubscribe = onSnapshot(
          query(
            collection(db, 'jobs'),
            where('scheduledDate', '>=', today),
            where('scheduledDate', '<', tomorrow)
          ),
          (snapshot) => {
            setStats((prev) => ({ ...prev, todayJobs: snapshot.size }));
          }
        );

        // 최근 작업 목록
        const recentJobsUnsubscribe = onSnapshot(
          query(collection(db, 'jobs'), orderBy('createdAt', 'desc'), limit(5)),
          (snapshot) => {
            const jobs = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Job[];
            setRecentJobs(jobs);
          }
        );

        setLoading(false);

        return () => {
          workersUnsubscribe();
          buildingsUnsubscribe();
          jobsUnsubscribe();
          recentJobsUnsubscribe();
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const QuickActionCard: React.FC<{
    title: string;
    link: string;
    icon: string;
    color: string;
  }> = ({ title, link, icon, color }) => (
    <Link to={link} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: `2px solid ${color}`,
          transition: 'transform 0.2s, box-shadow 0.2s',
          cursor: 'pointer',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>{icon}</div>
        <h3
          style={{
            margin: 0,
            color: color,
            fontSize: '16px',
            fontWeight: '600',
          }}
        >
          {title}
        </h3>
      </div>
    </Link>
  );

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: string;
    color: string;
  }> = ({ title, value, icon, color }) => (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}
      >
        <div
          style={{
            fontSize: '24px',
            marginRight: '12px',
            padding: '8px',
            borderRadius: '8px',
            background: `${color}20`,
          }}
        >
          {icon}
        </div>
        <h3
          style={{
            margin: 0,
            color: '#666',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {title}
        </h3>
      </div>
      <div
        style={{
          fontSize: '32px',
          fontWeight: '700',
          color: color,
        }}
      >
        {value}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#ecf0f1',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p>대시보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#ecf0f1',
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      {/* Header */}
      <div
        style={{
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                color: 'white',
                fontSize: '32px',
                fontWeight: '700',
                marginBottom: '8px',
              }}
            >
              🧹 CleanIT Manager
            </h1>
            {userEmail ? (
              <p
                style={{
                  margin: 0,
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '18px',
                }}
              >
                환영합니다, {userEmail.split('@')[0]}님! 👋
              </p>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                로그인되지 않았습니다.
              </p>
            )}
          </div>
          <div style={{ fontSize: '64px' }}>📊</div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <StatCard
          title="전체 Workers"
          value={stats.totalWorkers}
          icon="👷"
          color="#3498db"
        />
        <StatCard
          title="활성 Workers"
          value={stats.activeWorkers}
          icon="✅"
          color="#2c3e50"
        />
        <StatCard
          title="관리 건물 수"
          value={stats.totalBuildings}
          icon="🏢"
          color="#5a6c7d"
        />
        <StatCard
          title="오늘 작업"
          value={stats.todayJobs}
          icon="📅"
          color="#34495e"
        />
      </div>

      {/* 메인 컨텐츠 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {/* 작업 현황 차트 */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <OverallJobStatus />
        </div>

        {/* 최근 활동 */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ marginTop: 0, color: '#333', marginBottom: '20px' }}>
            📋 최근 작업
          </h3>
          {recentJobs.length > 0 ? (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {recentJobs.map((job, index) => (
                <div
                  key={job.id}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    background: '#f8f9fa',
                    border: '1px solid #e9ecef',
                  }}
                >
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '4px',
                      color: '#333',
                    }}
                  >
                    {job.buildingId || `작업 ${index + 1}`}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                    }}
                  >
                    상태:{' '}
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background:
                          job.status === 'completed'
                            ? '#d4edda'
                            : job.status === 'in_progress'
                              ? '#cce5ff'
                              : '#fff3cd',
                        color:
                          job.status === 'completed'
                            ? '#155724'
                            : job.status === 'in_progress'
                              ? '#004085'
                              : '#856404',
                        fontSize: '11px',
                      }}
                    >
                      {job.status === 'completed'
                        ? '완료'
                        : job.status === 'in_progress'
                          ? '진행중'
                          : job.status === 'scheduled'
                            ? '예정'
                            : job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', textAlign: 'center', margin: '40px 0' }}>
              최근 작업이 없습니다.
            </p>
          )}
        </div>
      </div>

      {/* 빠른 액션 버튼 */}
      <div>
        <h2
          style={{
            color: '#333',
            marginBottom: '20px',
            fontSize: '24px',
            fontWeight: '600',
          }}
        >
          🚀 빠른 작업
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
          }}
        >
          <QuickActionCard
            title="작업자 배정"
            link="/assign-workers"
            icon="👥"
            color="#3498db"
          />
          <QuickActionCard
            title="스케줄 관리"
            link="/scheduler"
            icon="📅"
            color="#2c3e50"
          />
          <QuickActionCard
            title="건물 등록"
            link="/register-building"
            icon="🏢"
            color="#5a6c7d"
          />
          <QuickActionCard
            title="고객 관리"
            link="/manage-clients"
            icon="👥"
            color="#34495e"
          />
          <QuickActionCard
            title="성과 분석"
            link="/worker-performance"
            icon="📊"
            color="#78909c"
          />
          <QuickActionCard
            title="베타 테스트"
            link="/test-analytics"
            icon="🧪"
            color="#7f8c8d"
          />
          <QuickActionCard
            title="매출 분석"
            link="/revenue-analysis"
            icon="💰"
            color="#95a5a6"
          />
          <QuickActionCard
            title="메시지"
            link="/messaging"
            icon="💬"
            color="#bdc3c7"
          />
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
