import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import OverallJobStatus from '../components/OverallJobStatus';
import LoginForm from '../components/LoginForm';

const SimpleDashboard: React.FC = () => {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // localStorage에서 인증 정보 확인
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    const savedUserInfo = localStorage.getItem('userInfo');

    if (isAuth && savedUserInfo) {
      setUserInfo(JSON.parse(savedUserInfo));
      setIsAuthenticated(true);
    } else {
      setUserInfo(null);
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    // localStorage에서 인증 정보 다시 로드
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    const savedUserInfo = localStorage.getItem('userInfo');

    if (isAuth && savedUserInfo) {
      setUserInfo(JSON.parse(savedUserInfo));
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    // localStorage에서 인증 정보 제거
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userInfo');
    setUserInfo(null);
    setIsAuthenticated(false);
  };

  // 로딩 중일 때
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#666', fontSize: '18px' }}>로딩 중...</p>
        </div>
      </div>
    );
  }

  // 로그인되지 않은 경우 로그인 폼 표시
  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

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
          textAlign: 'center',
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
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '48px',
          marginBottom: '12px',
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
          marginBottom: '8px',
        }}
      >
        {title}
      </h3>
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

  return (
    <div
      style={{
        background: '#f5f5f5',
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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          textAlign: 'center',
        }}
      >
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: 'rgba(255,255,255,0.9)',
                fontSize: '18px',
              }}
            >
              환영합니다, {userInfo?.displayName || userInfo?.username}님! 👋
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              color: 'white',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }}
          >
            🚪 로그아웃
          </button>
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
        <StatCard title="전체 Workers" value={12} icon="👷" color="#4CAF50" />
        <StatCard title="활성 Workers" value={8} icon="✅" color="#2196F3" />
        <StatCard title="관리 건물 수" value={25} icon="🏢" color="#FF9800" />
        <StatCard title="오늘 작업" value={6} icon="📅" color="#9C27B0" />
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
            📋 최근 활동
          </h3>
          <div style={{ color: '#666', textAlign: 'center', margin: '40px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
            <p>새로운 작업이 곧 표시됩니다!</p>
          </div>
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
            color="#4CAF50"
          />
          <QuickActionCard
            title="스케줄 관리"
            link="/scheduler"
            icon="📅"
            color="#2196F3"
          />
          <QuickActionCard
            title="건물 등록"
            link="/register-building"
            icon="🏢"
            color="#FF9800"
          />
          <QuickActionCard
            title="고객 관리"
            link="/manage-clients"
            icon="👥"
            color="#9C27B0"
          />
          <QuickActionCard
            title="성과 분석"
            link="/worker-performance"
            icon="📊"
            color="#607D8B"
          />
          <QuickActionCard
            title="베타 테스트"
            link="/test-analytics"
            icon="🧪"
            color="#E91E63"
          />
          <QuickActionCard
            title="매출 분석"
            link="/revenue-analysis"
            icon="💰"
            color="#795548"
          />
          <QuickActionCard
            title="메시지"
            link="/messaging"
            icon="💬"
            color="#FF5722"
          />
        </div>
      </div>
    </div>
  );
};

export default SimpleDashboard;
