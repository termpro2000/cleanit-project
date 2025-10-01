import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const OverallJobStatus: React.FC = () => {
  const [jobCounts, setJobCounts] = useState({
    scheduled: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 데모용 데이터로 시뮬레이션
    const simulateData = () => {
      const scheduled = 8;
      const in_progress = 5;
      const completed = 32;
      const cancelled = 2;
      const total = scheduled + in_progress + completed + cancelled;

      setJobCounts({
        scheduled,
        in_progress,
        completed,
        cancelled,
        total,
      });
      setLoading(false);
    };

    // 로딩 시뮬레이션
    const timer = setTimeout(simulateData, 1000);
    return () => clearTimeout(timer);
  }, []);

  const chartData = {
    labels: ['예정', '진행 중', '완료', '취소'],
    datasets: [
      {
        label: '작업 수',
        data: [
          jobCounts.scheduled,
          jobCounts.in_progress,
          jobCounts.completed,
          jobCounts.cancelled,
        ],
        backgroundColor: [
          'rgba(255, 193, 7, 0.8)',
          'rgba(33, 150, 243, 0.8)',
          'rgba(76, 175, 80, 0.8)',
          'rgba(244, 67, 54, 0.8)',
        ],
        borderColor: [
          'rgba(245, 127, 23, 1)',
          'rgba(13, 71, 161, 1)',
          'rgba(27, 94, 32, 1)',
          'rgba(183, 28, 28, 1)',
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#f0f0f0',
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
          <p style={{ color: '#666' }}>작업 현황 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          background: '#ffebee',
          borderRadius: '8px',
          border: '1px solid #f8bbd9',
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
        <p style={{ color: '#c62828', margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2
        style={{
          margin: '0 0 24px 0',
          color: '#333',
          fontSize: '20px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        📊 전체 작업 현황
      </h2>

      {/* 통계 카드들 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #FFF3C4 0%, #FFC107 100%)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            border: '1px solid #FFE082',
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📅</div>
          <div
            style={{ fontSize: '24px', fontWeight: 'bold', color: '#F57F17' }}
          >
            {jobCounts.scheduled}
          </div>
          <div
            style={{ fontSize: '12px', color: '#F57F17', fontWeight: '500' }}
          >
            예정
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #E3F2FD 0%, #2196F3 100%)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            border: '1px solid #90CAF9',
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
          <div
            style={{ fontSize: '24px', fontWeight: 'bold', color: '#0D47A1' }}
          >
            {jobCounts.in_progress}
          </div>
          <div
            style={{ fontSize: '12px', color: '#0D47A1', fontWeight: '500' }}
          >
            진행중
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #E8F5E8 0%, #4CAF50 100%)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            border: '1px solid #A5D6A7',
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
          <div
            style={{ fontSize: '24px', fontWeight: 'bold', color: '#1B5E20' }}
          >
            {jobCounts.completed}
          </div>
          <div
            style={{ fontSize: '12px', color: '#1B5E20', fontWeight: '500' }}
          >
            완료
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #FFEBEE 0%, #F44336 100%)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            border: '1px solid #EF9A9A',
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>❌</div>
          <div
            style={{ fontSize: '24px', fontWeight: 'bold', color: '#B71C1C' }}
          >
            {jobCounts.cancelled}
          </div>
          <div
            style={{ fontSize: '12px', color: '#B71C1C', fontWeight: '500' }}
          >
            취소
          </div>
        </div>
      </div>

      {/* 총합 표시 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
          marginBottom: '24px',
          border: '2px solid #dee2e6',
        }}
      >
        <div
          style={{ fontSize: '16px', color: '#495057', marginBottom: '8px' }}
        >
          📈 총 작업 수
        </div>
        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#212529' }}>
          {jobCounts.total}
        </div>
      </div>

      {/* 차트 */}
      <div
        style={{
          background: '#fafafa',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e0e0e0',
          height: '300px',
        }}
      >
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default OverallJobStatus;
