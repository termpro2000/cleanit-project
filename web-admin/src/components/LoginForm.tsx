import React, { useState } from 'react';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('🔐 Attempting login with:', username);

      // 간단한 ID/Password 검증
      if (username === 'admin' && password === 'admin123') {
        console.log('✅ Login successful');
        // 로그인 성공시 localStorage에 인증 정보 저장
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem(
          'userInfo',
          JSON.stringify({
            username: 'admin',
            displayName: 'CleanIT Admin',
            role: 'manager',
          })
        );
        onLoginSuccess();
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setError('로그인에 실패했습니다. ID와 비밀번호를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '48px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧹</div>
          <h1
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: '700',
              color: '#333',
              marginBottom: '8px',
            }}
          >
            CleanIT Manager
          </h1>
          <p
            style={{
              margin: 0,
              color: '#666',
              fontSize: '16px',
            }}
          >
            관리자 로그인
          </p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#333',
              }}
            >
              아이디
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e1e5e9';
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#333',
              }}
            >
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e1e5e9';
              }}
            />
          </div>

          {error && (
            <div
              style={{
                background: '#ffebee',
                border: '1px solid #f8bbd9',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                color: '#c62828',
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading
                ? '#ccc'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow =
                  '0 4px 12px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 기본 계정 정보 */}
        <div
          style={{
            marginTop: '32px',
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#666',
              textAlign: 'center',
              marginBottom: '8px',
            }}
          >
            🔑 기본 관리자 계정
          </div>
          <div
            style={{
              fontSize: '14px',
              color: '#495057',
              textAlign: 'center',
            }}
          >
            <div>
              <strong>아이디:</strong> admin
            </div>
            <div>
              <strong>비밀번호:</strong> admin123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
