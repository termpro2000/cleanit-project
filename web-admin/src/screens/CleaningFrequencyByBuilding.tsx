import React, { useState, useEffect } from 'react';
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  where,
  orderBy,
} from 'firebase/firestore';
import app from '../firebase';
import { Job, Building, User } from '../types';
import BackToDashboard from '../components/BackToDashboard';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const db = getFirestore(app);

const CleaningFrequencyByBuilding: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [buildingData] = useState<{ [key: string]: number }>({});
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | 'all'>(
    'all'
  );
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [chartType, setChartType] = useState<'bar' | 'line' | 'doughnut'>(
    'bar'
  );
  const [sortBy, setSortBy] = useState<'frequency' | 'name'>('frequency');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [timeGrouping] = useState<'all' | 'monthly' | 'weekly'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch buildings
    const unsubscribeBuildings = onSnapshot(
      collection(db, 'buildings'),
      (snapshot) => {
        const fetchedBuildings: Building[] = [];
        snapshot.forEach((doc) =>
          fetchedBuildings.push({ id: doc.id, ...doc.data() } as Building)
        );
        setBuildings(fetchedBuildings);
      },
      (err) => {
        console.error('Error fetching buildings:', err);
        setError('건물 목록을 불러오는데 실패했습니다.');
      }
    );

    // Fetch clients
    const unsubscribeClients = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'client')),
      (snapshot) => {
        const fetchedClients: User[] = [];
        snapshot.forEach((doc) =>
          fetchedClients.push({ id: doc.id, ...doc.data() } as User)
        );
        setClients(fetchedClients);
      },
      (err) => {
        console.error('Error fetching clients:', err);
      }
    );

    // Fetch all jobs
    const unsubscribeJobs = onSnapshot(
      query(collection(db, 'jobs'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const fetchedJobs: Job[] = [];
        snapshot.forEach((doc) => {
          fetchedJobs.push({ id: doc.id, ...doc.data() } as Job);
        });
        setJobs(fetchedJobs);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching jobs:', err);
        setError('작업 데이터를 불러오는데 실패했습니다.');
        setLoading(false);
      }
    );

    return () => {
      unsubscribeBuildings();
      unsubscribeClients();
      unsubscribeJobs();
    };
  }, []);

  // Filter and process data
  const filteredJobs = jobs.filter((job) => {
    // Only completed jobs
    if (job.status !== 'completed') return false;

    // Client filter
    if (selectedClientId !== 'all') {
      const building = buildings.find((b) => b.id === job.buildingId);
      if (!building || building.ownerId !== selectedClientId) {
        return false;
      }
    }

    // Date range filter
    if (dateRange.start && job.completedAt) {
      const jobDate = job.completedAt.toDate();
      const startDate = new Date(dateRange.start);
      if (jobDate < startDate) return false;
    }
    if (dateRange.end && job.completedAt) {
      const jobDate = job.completedAt.toDate();
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      if (jobDate > endDate) return false;
    }

    return true;
  });

  // Calculate building frequency data
  const calculateBuildingData = () => {
    const counts: { [key: string]: number } = {};
    filteredJobs.forEach((job) => {
      if (job.buildingId) {
        counts[job.buildingId] = (counts[job.buildingId] || 0) + 1;
      }
    });
    return counts;
  };

  // Get chart data based on current filters
  const getChartData = () => {
    const counts = calculateBuildingData();

    let buildingList = [...buildings];

    // Filter buildings by client if selected
    if (selectedClientId !== 'all') {
      buildingList = buildings.filter((b) => b.ownerId === selectedClientId);
    }

    // Sort buildings
    if (sortBy === 'frequency') {
      buildingList.sort(
        (a, b) => (counts[b.id || ''] || 0) - (counts[a.id || ''] || 0)
      );
    } else {
      buildingList.sort((a, b) => a.name.localeCompare(b.name));
    }

    const labels = buildingList.map((b) => b.name);
    const dataValues = buildingList.map((b) => counts[b.id || ''] || 0);

    const colors = [
      '#FF6384',
      '#36A2EB',
      '#FFCE56',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40',
      '#FF6384',
      '#C9CBCF',
      '#4BC0C0',
      '#FF6384',
    ];

    return {
      labels,
      datasets: [
        {
          label: '청소 횟수',
          data: dataValues,
          backgroundColor:
            chartType === 'doughnut' ? colors : 'rgba(54, 162, 235, 0.6)',
          borderColor:
            chartType === 'doughnut' ? colors : 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          tension: chartType === 'line' ? 0.4 : undefined,
        },
      ],
    };
  };

  // Calculate statistics
  const getStatistics = () => {
    const counts = calculateBuildingData();
    const values = Object.values(counts);
    const total = values.reduce((sum, count) => sum + count, 0);
    const average = values.length > 0 ? total / values.length : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    const min = values.length > 0 ? Math.min(...values) : 0;

    return { total, average, max, min, buildingCount: values.length };
  };

  // Export data as CSV
  const exportToCSV = () => {
    const counts = calculateBuildingData();
    let csvContent = 'Building Name,Address,Client,Cleaning Count\n';

    buildings.forEach((building) => {
      if (selectedClientId === 'all' || building.ownerId === selectedClientId) {
        const client = clients.find((c) => c.id === building.ownerId);
        const count = counts[building.id || ''] || 0;
        csvContent += `"${building.name}","${building.address}","${client?.email || ''}",${count}\n`;
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `building_cleaning_frequency_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = getChartData();
  const statistics = getStatistics();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        display: chartType !== 'doughnut',
      },
      title: {
        display: true,
        text: `건물별 청소 빈도 (${chartType === 'bar' ? '막대' : chartType === 'line' ? '선형' : '원형'} 차트)`,
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          afterLabel: function (context: any) {
            const building = buildings.find((b) => b.name === context.label);
            if (building) {
              const client = clients.find((c) => c.id === building.ownerId);
              return `Client: ${client?.email || '정보 없음'}`;
            }
            return '';
          },
        },
      },
    },
    scales:
      chartType !== 'doughnut'
        ? {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
              },
            },
          }
        : undefined,
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>{error}</div>;
  }

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return <Line data={chartData} options={chartOptions} />;
      case 'doughnut':
        return <Doughnut data={chartData} options={chartOptions} />;
      default:
        return <Bar data={chartData} options={chartOptions} />;
    }
  };

  return (
    <>
      <BackToDashboard />
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1
          style={{ color: '#333', marginBottom: '30px', textAlign: 'center' }}
        >
          건물별 청소 빈도 통계
        </h1>

        {/* Controls */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold',
              }}
            >
              Client 필터:
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <option value="all">모든 Client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold',
              }}
            >
              시작 날짜:
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold',
              }}
            >
              종료 날짜:
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold',
              }}
            >
              차트 타입:
            </label>
            <select
              value={chartType}
              onChange={(e) =>
                setChartType(e.target.value as 'bar' | 'line' | 'doughnut')
              }
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <option value="bar">막대 차트</option>
              <option value="line">선형 차트</option>
              <option value="doughnut">원형 차트</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold',
              }}
            >
              정렬 기준:
            </label>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'frequency' | 'name')
              }
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <option value="frequency">청소 빈도순</option>
              <option value="name">건물명순</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              onClick={exportToCSV}
              style={{
                width: '100%',
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = '#218838')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = '#28a745')
              }
            >
              📊 CSV 내보내기
            </button>
          </div>
        </div>

        {/* Statistics Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '30px',
          }}
        >
          <div
            style={{
              padding: '20px',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #90caf9',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>
              총 청소 횟수
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#0d47a1',
              }}
            >
              {statistics.total}회
            </p>
          </div>
          <div
            style={{
              padding: '20px',
              backgroundColor: '#f3e5f5',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #ce93d8',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', color: '#7b1fa2' }}>
              평균 청소 횟수
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#4a148c',
              }}
            >
              {statistics.average.toFixed(1)}회
            </p>
          </div>
          <div
            style={{
              padding: '20px',
              backgroundColor: '#e8f5e8',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #a5d6a7',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', color: '#388e3c' }}>
              최대 청소 횟수
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#1b5e20',
              }}
            >
              {statistics.max}회
            </p>
          </div>
          <div
            style={{
              padding: '20px',
              backgroundColor: '#fff3e0',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #ffcc02',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>건물 수</h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#e65100',
              }}
            >
              {statistics.buildingCount}개
            </p>
          </div>
        </div>

        {/* Chart */}
        {chartData.labels.length > 0 ? (
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              height: chartType === 'doughnut' ? '500px' : '600px',
            }}
          >
            {renderChart()}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              color: '#666',
            }}
          >
            <h3>표시할 데이터가 없습니다</h3>
            <p>선택한 조건에 맞는 청소 이력이 없습니다.</p>
            <p>필터 조건을 변경해보세요.</p>
          </div>
        )}

        {/* Detailed Table */}
        {chartData.labels.length > 0 && (
          <div
            style={{
              marginTop: '30px',
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <h3
              style={{
                margin: 0,
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #ddd',
              }}
            >
              상세 데이터
            </h3>
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      건물명
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      주소
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      Client
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      청소 횟수
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      비율
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.labels.map((label, index) => {
                    const building = buildings.find((b) => b.name === label);
                    const client = clients.find(
                      (c) => c.id === building?.ownerId
                    );
                    const count = chartData.datasets[0].data[index] as number;
                    const percentage =
                      statistics.total > 0
                        ? ((count / statistics.total) * 100).toFixed(1)
                        : '0.0';

                    return (
                      <tr
                        key={label}
                        style={{ borderBottom: '1px solid #eee' }}
                      >
                        <td style={{ padding: '12px' }}>{label}</td>
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '14px',
                            color: '#666',
                          }}
                        >
                          {building?.address || '정보 없음'}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          {client?.email || '정보 없음'}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                          }}
                        >
                          {count}회
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CleaningFrequencyByBuilding;
