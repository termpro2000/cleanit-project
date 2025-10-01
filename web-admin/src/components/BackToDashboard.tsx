import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BackToDashboardProps {
  style?: React.CSSProperties;
}

const BackToDashboard: React.FC<BackToDashboardProps> = ({ style = {} }) => {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const defaultStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    left: '20px',
    zIndex: 1000,
    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    ...style,
  };

  return (
    <button
      onClick={handleBackToDashboard}
      style={defaultStyle}
      onMouseEnter={(e) => {
        (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
        (e.target as HTMLButtonElement).style.boxShadow =
          '0 6px 16px rgba(52, 152, 219, 0.4)';
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
        (e.target as HTMLButtonElement).style.boxShadow =
          '0 4px 12px rgba(52, 152, 219, 0.3)';
      }}
    >
      <span style={{ fontSize: '16px' }}>🏠</span>
      대시보드
    </button>
  );
};

export default BackToDashboard;
