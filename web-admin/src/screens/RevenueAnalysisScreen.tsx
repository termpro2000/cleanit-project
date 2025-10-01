import React, { useState, useEffect } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import app from '../firebase';
import { User, Job, Building } from '../types';
import BackToDashboard from '../components/BackToDashboard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const db = getFirestore(app);

interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  avgRevenuePerJob: number;
  avgRevenuePerClient: number;
  totalJobs: number;
  activeClients: number;
  growthRate: number;
  profitMargin: number;
}

interface MonthlyRevenueData {
  month: string;
  revenue: number;
  jobs: number;
  clients: number;
  avgJobValue: number;
  costs: number;
  profit: number;
}

interface ClientRevenueData {
  clientId: string;
  clientEmail: string;
  totalRevenue: number;
  totalJobs: number;
  avgJobValue: number;
  buildingCount: number;
  lastJobDate: Date | null;
}

interface ServiceRevenueData {
  area: string;
  revenue: number;
  jobCount: number;
  avgPrice: number;
}

const RevenueAnalysisScreen: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<RevenueMetrics>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    avgRevenuePerJob: 0,
    avgRevenuePerClient: 0,
    totalJobs: 0,
    activeClients: 0,
    growthRate: 0,
    profitMargin: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenueData[]>([]);
  const [clientData, setClientData] = useState<ClientRevenueData[]>([]);
  const [serviceData, setServiceData] = useState<ServiceRevenueData[]>([]);

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [selectedClient, setSelectedClient] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<
    'overview' | 'monthly' | 'clients' | 'services'
  >('overview');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'doughnut'>(
    'bar'
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pricing configuration (이것은 실제로는 데이터베이스나 설정에서 가져와야 함)
  const PRICING = {
    basePrice: 50000, // 기본 청소 비용 (원)
    areaMultiplier: {
      화장실: 1.5,
      주방: 1.3,
      거실: 1.0,
      침실: 1.0,
      사무실: 1.2,
      복도: 0.8,
      계단: 1.1,
      기타: 1.0,
    } as { [key: string]: number },
    workerHourlyRate: 15000, // 시간당 인건비
    operatingCostRate: 0.3, // 운영비 비율 (30%)
  };

  useEffect(() => {
    // Fetch Buildings
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
        setError('건물 데이터를 불러오는데 실패했습니다.');
      }
    );

    // Fetch Clients
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

    // Fetch Jobs
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

  // Calculate metrics when data changes
  useEffect(() => {
    if (jobs.length > 0 && buildings.length > 0) {
      calculateRevenueMetrics();
      calculateMonthlyData();
      calculateClientData();
      calculateServiceData();
    }
  }, [jobs, buildings, clients, dateRange]);

  const calculateJobRevenue = (job: Job): number => {
    let revenue = PRICING.basePrice;

    // Apply area multipliers
    job.areas.forEach((area) => {
      const multiplier = PRICING.areaMultiplier[area] || 1.0;
      revenue *= multiplier;
    });

    return Math.round(revenue);
  };

  const calculateJobCost = (job: Job): number => {
    let cost = 0;

    // Calculate labor cost
    if (job.startedAt && job.completedAt) {
      const durationHours =
        (job.completedAt.toDate().getTime() -
          job.startedAt.toDate().getTime()) /
        (1000 * 60 * 60);
      cost += durationHours * PRICING.workerHourlyRate;
    } else {
      // Estimate 2 hours average if no time data
      cost += 2 * PRICING.workerHourlyRate;
    }

    // Add operating costs
    cost += cost * PRICING.operatingCostRate;

    return Math.round(cost);
  };

  const calculateRevenueMetrics = () => {
    let filteredJobs = jobs.filter((job) => job.status === 'completed');

    // Apply date filter
    if (dateRange.start || dateRange.end) {
      filteredJobs = filteredJobs.filter((job) => {
        if (!job.completedAt) return false;
        const jobDate = job.completedAt.toDate();

        if (dateRange.start) {
          const startDate = new Date(dateRange.start);
          if (jobDate < startDate) return false;
        }

        if (dateRange.end) {
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          if (jobDate > endDate) return false;
        }

        return true;
      });
    }

    // Apply client filter
    if (selectedClient !== 'all') {
      filteredJobs = filteredJobs.filter((job) => {
        const building = buildings.find((b) => b.id === job.buildingId);
        return building?.ownerId === selectedClient;
      });
    }

    const totalRevenue = filteredJobs.reduce(
      (sum, job) => sum + calculateJobRevenue(job),
      0
    );
    const totalCosts = filteredJobs.reduce(
      (sum, job) => sum + calculateJobCost(job),
      0
    );
    const totalJobs = filteredJobs.length;

    // Get unique clients
    const uniqueClients = new Set(
      filteredJobs
        .map((job) => {
          const building = buildings.find((b) => b.id === job.buildingId);
          return building?.ownerId;
        })
        .filter(Boolean)
    );

    // Calculate monthly revenue (current month)
    const currentMonth = new Date();
    const monthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );

    const monthlyJobs = filteredJobs.filter((job) => {
      if (!job.completedAt) return false;
      const jobDate = job.completedAt.toDate();
      return jobDate >= monthStart && jobDate <= monthEnd;
    });

    const monthlyRevenue = monthlyJobs.reduce(
      (sum, job) => sum + calculateJobRevenue(job),
      0
    );

    // Calculate growth rate (compare to last month)
    const lastMonthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1
    );
    const lastMonthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      0
    );

    const lastMonthJobs = filteredJobs.filter((job) => {
      if (!job.completedAt) return false;
      const jobDate = job.completedAt.toDate();
      return jobDate >= lastMonthStart && jobDate <= lastMonthEnd;
    });

    const lastMonthRevenue = lastMonthJobs.reduce(
      (sum, job) => sum + calculateJobRevenue(job),
      0
    );
    const growthRate =
      lastMonthRevenue > 0
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    setMetrics({
      totalRevenue,
      monthlyRevenue,
      avgRevenuePerJob: totalJobs > 0 ? totalRevenue / totalJobs : 0,
      avgRevenuePerClient:
        uniqueClients.size > 0 ? totalRevenue / uniqueClients.size : 0,
      totalJobs,
      activeClients: uniqueClients.size,
      growthRate,
      profitMargin:
        totalRevenue > 0
          ? ((totalRevenue - totalCosts) / totalRevenue) * 100
          : 0,
    });
  };

  const calculateMonthlyData = () => {
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: date.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'short',
        }),
        monthStart: new Date(date.getFullYear(), date.getMonth(), 1),
        monthEnd: new Date(date.getFullYear(), date.getMonth() + 1, 0),
      };
    }).reverse();

    const monthlyData: MonthlyRevenueData[] = last12Months.map(
      ({ month, monthStart, monthEnd }) => {
        const monthJobs = jobs.filter((job) => {
          if (job.status !== 'completed' || !job.completedAt) return false;
          const jobDate = job.completedAt.toDate();
          return jobDate >= monthStart && jobDate <= monthEnd;
        });

        const revenue = monthJobs.reduce(
          (sum, job) => sum + calculateJobRevenue(job),
          0
        );
        const costs = monthJobs.reduce(
          (sum, job) => sum + calculateJobCost(job),
          0
        );

        const uniqueClients = new Set(
          monthJobs
            .map((job) => {
              const building = buildings.find((b) => b.id === job.buildingId);
              return building?.ownerId;
            })
            .filter(Boolean)
        );

        return {
          month,
          revenue,
          jobs: monthJobs.length,
          clients: uniqueClients.size,
          avgJobValue: monthJobs.length > 0 ? revenue / monthJobs.length : 0,
          costs,
          profit: revenue - costs,
        };
      }
    );

    setMonthlyData(monthlyData);
  };

  const calculateClientData = () => {
    const clientRevenue: { [key: string]: ClientRevenueData } = {};

    jobs
      .filter((job) => job.status === 'completed')
      .forEach((job) => {
        const building = buildings.find((b) => b.id === job.buildingId);
        if (!building?.ownerId) return;

        const client = clients.find((c) => c.id === building.ownerId);
        if (!client) return;

        const revenue = calculateJobRevenue(job);
        const jobDate = job.completedAt?.toDate() || null;

        if (!clientRevenue[building.ownerId]) {
          clientRevenue[building.ownerId] = {
            clientId: building.ownerId,
            clientEmail: client.email,
            totalRevenue: 0,
            totalJobs: 0,
            avgJobValue: 0,
            buildingCount: 0,
            lastJobDate: null,
          };
        }

        clientRevenue[building.ownerId].totalRevenue += revenue;
        clientRevenue[building.ownerId].totalJobs += 1;

        if (
          !clientRevenue[building.ownerId].lastJobDate ||
          (jobDate && jobDate > clientRevenue[building.ownerId].lastJobDate!)
        ) {
          clientRevenue[building.ownerId].lastJobDate = jobDate;
        }
      });

    // Calculate building counts for each client
    buildings.forEach((building) => {
      if (building.ownerId && clientRevenue[building.ownerId]) {
        clientRevenue[building.ownerId].buildingCount += 1;
      }
    });

    // Calculate average job values
    Object.values(clientRevenue).forEach((client) => {
      client.avgJobValue =
        client.totalJobs > 0 ? client.totalRevenue / client.totalJobs : 0;
    });

    setClientData(
      Object.values(clientRevenue).sort(
        (a, b) => b.totalRevenue - a.totalRevenue
      )
    );
  };

  const calculateServiceData = () => {
    const serviceRevenue: { [key: string]: ServiceRevenueData } = {};

    jobs
      .filter((job) => job.status === 'completed')
      .forEach((job) => {
        const jobRevenue = calculateJobRevenue(job);
        const areaCount = job.areas.length;
        const revenuePerArea = areaCount > 0 ? jobRevenue / areaCount : 0;

        job.areas.forEach((area) => {
          if (!serviceRevenue[area]) {
            serviceRevenue[area] = {
              area,
              revenue: 0,
              jobCount: 0,
              avgPrice: 0,
            };
          }

          serviceRevenue[area].revenue += revenuePerArea;
          serviceRevenue[area].jobCount += 1;
        });
      });

    // Calculate average prices
    Object.values(serviceRevenue).forEach((service) => {
      service.avgPrice =
        service.jobCount > 0 ? service.revenue / service.jobCount : 0;
    });

    setServiceData(
      Object.values(serviceRevenue).sort((a, b) => b.revenue - a.revenue)
    );
  };

  // Export data as CSV
  const exportToCSV = () => {
    let csvContent = '';

    if (viewMode === 'monthly') {
      csvContent = 'Month,Revenue,Jobs,Clients,Avg Job Value,Costs,Profit\n';
      monthlyData.forEach((data) => {
        csvContent += `"${data.month}",${data.revenue},${data.jobs},${data.clients},${data.avgJobValue.toFixed(0)},${data.costs},${data.profit}\n`;
      });
    } else if (viewMode === 'clients') {
      csvContent =
        'Client,Total Revenue,Total Jobs,Avg Job Value,Building Count,Last Job Date\n';
      clientData.forEach((data) => {
        csvContent += `"${data.clientEmail}",${data.totalRevenue},${data.totalJobs},${data.avgJobValue.toFixed(0)},${data.buildingCount},"${data.lastJobDate?.toLocaleDateString() || ''}"\n`;
      });
    } else if (viewMode === 'services') {
      csvContent = 'Service Area,Revenue,Job Count,Avg Price\n';
      serviceData.forEach((data) => {
        csvContent += `"${data.area}",${data.revenue.toFixed(0)},${data.jobCount},${data.avgPrice.toFixed(0)}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `revenue_analysis_${viewMode}_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart data preparation
  const getChartData = () => {
    if (viewMode === 'monthly') {
      const labels = monthlyData.map((d) => d.month);

      if (chartType === 'doughnut') {
        // Show revenue distribution by month (last 6 months)
        const last6Months = monthlyData.slice(-6);
        return {
          labels: last6Months.map((d) => d.month),
          datasets: [
            {
              data: last6Months.map((d) => d.revenue),
              backgroundColor: [
                '#FF6384',
                '#36A2EB',
                '#FFCE56',
                '#4BC0C0',
                '#9966FF',
                '#FF9F40',
              ],
            },
          ],
        };
      }

      return {
        labels,
        datasets: [
          {
            label: '매출',
            data: monthlyData.map((d) => d.revenue),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            tension: chartType === 'line' ? 0.4 : undefined,
            yAxisID: 'y',
          },
          {
            label: '수익',
            data: monthlyData.map((d) => d.profit),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            tension: chartType === 'line' ? 0.4 : undefined,
            yAxisID: 'y',
          },
        ],
      };
    } else if (viewMode === 'clients') {
      const topClients = clientData.slice(0, 10);

      if (chartType === 'doughnut') {
        return {
          labels: topClients.map((c) => c.clientEmail),
          datasets: [
            {
              data: topClients.map((c) => c.totalRevenue),
              backgroundColor: [
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
              ],
            },
          ],
        };
      }

      return {
        labels: topClients.map((c) => c.clientEmail),
        datasets: [
          {
            label: '총 매출',
            data: topClients.map((c) => c.totalRevenue),
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
            tension: chartType === 'line' ? 0.4 : undefined,
          },
        ],
      };
    } else if (viewMode === 'services') {
      if (chartType === 'doughnut') {
        return {
          labels: serviceData.map((s) => s.area),
          datasets: [
            {
              data: serviceData.map((s) => s.revenue),
              backgroundColor: [
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
              ],
            },
          ],
        };
      }

      return {
        labels: serviceData.map((s) => s.area),
        datasets: [
          {
            label: '서비스별 매출',
            data: serviceData.map((s) => s.revenue),
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
            tension: chartType === 'line' ? 0.4 : undefined,
          },
        ],
      };
    }

    return { labels: [], datasets: [] };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `${viewMode === 'monthly' ? '월별' : viewMode === 'clients' ? '고객별' : '서비스별'} 매출 분석`,
      },
      legend: {
        display: chartType !== 'doughnut' || viewMode === 'monthly',
      },
    },
    scales:
      chartType !== 'doughnut'
        ? {
            y: {
              type: 'linear' as const,
              display: true,
              position: 'left' as const,
              title: {
                display: true,
                text: '매출 (원)',
              },
            },
          }
        : undefined,
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>로딩 중...</div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>
        {error}
      </div>
    );
  }

  return (
    <>
      <BackToDashboard />
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1
          style={{ color: '#333', marginBottom: '30px', textAlign: 'center' }}
        >
          매출 분석 대시보드
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
              분석 보기:
            </label>
            <select
              value={viewMode}
              onChange={(e) =>
                setViewMode(
                  e.target.value as
                    | 'overview'
                    | 'monthly'
                    | 'clients'
                    | 'services'
                )
              }
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <option value="overview">전체 개요</option>
              <option value="monthly">월별 분석</option>
              <option value="clients">고객별 분석</option>
              <option value="services">서비스별 분석</option>
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
              고객 필터:
            </label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <option value="all">모든 고객</option>
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
              💰 CSV 내보내기
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '15px',
            marginBottom: '30px',
          }}
        >
          <div
            style={{
              padding: '20px',
              backgroundColor: '#e8f5e8',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #a5d6a7',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', color: '#388e3c' }}>총 매출</h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#1b5e20',
              }}
            >
              ₩{metrics.totalRevenue.toLocaleString()}
            </p>
          </div>

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
              월별 매출
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#0d47a1',
              }}
            >
              ₩{metrics.monthlyRevenue.toLocaleString()}
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
              작업당 평균 매출
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#4a148c',
              }}
            >
              ₩{metrics.avgRevenuePerJob.toLocaleString()}
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
            <h3 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>
              활성 고객 수
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#e65100',
              }}
            >
              {metrics.activeClients}명
            </p>
          </div>

          <div
            style={{
              padding: '20px',
              backgroundColor: '#fce4ec',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #f8bbd9',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', color: '#c2185b' }}>성장률</h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: metrics.growthRate >= 0 ? '#2e7d32' : '#d32f2f',
              }}
            >
              {metrics.growthRate >= 0 ? '+' : ''}
              {metrics.growthRate.toFixed(1)}%
            </p>
          </div>

          <div
            style={{
              padding: '20px',
              backgroundColor: '#f1f8e9',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #c8e6c9',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', color: '#558b2f' }}>수익률</h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#33691e',
              }}
            >
              {metrics.profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Chart */}
        {(monthlyData.length > 0 ||
          clientData.length > 0 ||
          serviceData.length > 0) && (
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              height: chartType === 'doughnut' ? '500px' : '400px',
              marginBottom: '30px',
            }}
          >
            {chartType === 'doughnut' ? (
              <Doughnut data={getChartData()} options={chartOptions} />
            ) : chartType === 'line' ? (
              <Line data={getChartData()} options={chartOptions} />
            ) : (
              <Bar data={getChartData()} options={chartOptions} />
            )}
          </div>
        )}

        {/* Detailed Data Tables */}
        {viewMode === 'monthly' && monthlyData.length > 0 && (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '30px',
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
              월별 상세 데이터
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
                      월
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'right',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      매출
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      작업 수
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      고객 수
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'right',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      평균 작업가
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'right',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      비용
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'right',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      순익
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((data) => (
                    <tr
                      key={data.month}
                      style={{ borderBottom: '1px solid #eee' }}
                    >
                      <td style={{ padding: '12px' }}>{data.month}</td>
                      <td
                        style={{
                          padding: '12px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                        }}
                      >
                        ₩{data.revenue.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {data.jobs}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {data.clients}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        ₩{data.avgJobValue.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        ₩{data.costs.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: data.profit >= 0 ? '#2e7d32' : '#d32f2f',
                        }}
                      >
                        ₩{data.profit.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'clients' && clientData.length > 0 && (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '30px',
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
              고객별 상세 데이터
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
                      고객
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'right',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      총 매출
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      총 작업
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'right',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      평균 작업가
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      건물 수
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      최근 작업일
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientData.map((data, index) => (
                    <tr
                      key={data.clientId}
                      style={{ borderBottom: '1px solid #eee' }}
                    >
                      <td style={{ padding: '12px' }}>
                        <div>
                          {data.clientEmail}
                          {index < 3 && (
                            <span
                              style={{
                                marginLeft: '8px',
                                padding: '2px 6px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                backgroundColor:
                                  index === 0
                                    ? '#ffd700'
                                    : index === 1
                                      ? '#c0c0c0'
                                      : '#cd7f32',
                                color: 'white',
                              }}
                            >
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          textAlign: 'right',
                          fontWeight: 'bold',
                        }}
                      >
                        ₩{data.totalRevenue.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {data.totalJobs}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        ₩{data.avgJobValue.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {data.buildingCount}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {data.lastJobDate?.toLocaleDateString() || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'services' && serviceData.length > 0 && (
          <div
            style={{
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
              서비스별 상세 데이터
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
                      서비스 영역
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'right',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      총 매출
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      작업 횟수
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'right',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      평균 단가
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      매출 비중
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {serviceData.map((data) => {
                    const totalServiceRevenue = serviceData.reduce(
                      (sum, s) => sum + s.revenue,
                      0
                    );
                    const percentage =
                      totalServiceRevenue > 0
                        ? (data.revenue / totalServiceRevenue) * 100
                        : 0;

                    return (
                      <tr
                        key={data.area}
                        style={{ borderBottom: '1px solid #eee' }}
                      >
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>
                          {data.area}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            textAlign: 'right',
                            fontWeight: 'bold',
                          }}
                        >
                          ₩{data.revenue.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {data.jobCount}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          ₩{data.avgPrice.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {percentage.toFixed(1)}%
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

export default RevenueAnalysisScreen;
