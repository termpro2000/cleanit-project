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
import { Bar, Line, Doughnut, Radar } from 'react-chartjs-2';
import app from '../firebase';
import { User, Job, Review } from '../types';
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

interface WorkerProductivityMetrics {
  id: string;
  email: string;
  totalJobs: number;
  completedJobs: number;
  avgDuration: number;
  avgCompletionRate: number;
  avgRating: number;
  totalRatings: number;
  onTimeRate: number;
  productivityScore: number;
  efficiency: number;
  consistency: number;
  qualityScore: number;
  monthlyTrend: { month: string; jobs: number; rating: number }[];
  topPerformingAreas: string[];
  improvementAreas: string[];
}

interface ProductivityTrend {
  date: string;
  totalJobs: number;
  avgRating: number;
  avgDuration: number;
  efficiency: number;
}

const WorkerProductivityAnalysisScreen: React.FC = () => {
  const [workers, setWorkers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [metrics, setMetrics] = useState<WorkerProductivityMetrics[]>([]);
  const [trends, setTrends] = useState<ProductivityTrend[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<string | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [viewMode, setViewMode] = useState<
    'overview' | 'individual' | 'comparison'
  >('overview');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'radar'>('bar');
  const [sortBy, setSortBy] = useState<
    'productivity' | 'efficiency' | 'quality'
  >('productivity');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch Workers
    const unsubscribeWorkers = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'worker')),
      (snapshot) => {
        const fetchedWorkers: User[] = [];
        snapshot.forEach((doc) =>
          fetchedWorkers.push({ id: doc.id, ...doc.data() } as User)
        );
        setWorkers(fetchedWorkers);
      },
      (err) => {
        console.error('Error fetching workers:', err);
        setError('Worker 목록을 불러오는데 실패했습니다.');
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

    // Fetch Reviews
    const unsubscribeReviews = onSnapshot(
      collection(db, 'reviews'),
      (snapshot) => {
        const fetchedReviews: Review[] = [];
        snapshot.forEach((doc) =>
          fetchedReviews.push({ id: doc.id, ...doc.data() } as Review)
        );
        setReviews(fetchedReviews);
      },
      (err) => {
        console.error('Error fetching reviews:', err);
      }
    );

    return () => {
      unsubscribeWorkers();
      unsubscribeJobs();
      unsubscribeReviews();
    };
  }, []);

  // Calculate metrics when data changes
  useEffect(() => {
    if (workers.length > 0 && jobs.length > 0) {
      calculateProductivityMetrics();
      calculateTrends();
    }
  }, [workers, jobs, reviews, dateRange]);

  const calculateProductivityMetrics = () => {
    const calculatedMetrics: WorkerProductivityMetrics[] = workers.map(
      (worker) => {
        let workerJobs = jobs.filter((job) => job.workerId === worker.id);

        // Apply date filter
        if (dateRange.start || dateRange.end) {
          workerJobs = workerJobs.filter((job) => {
            if (!job.createdAt) return false;
            const jobDate = job.createdAt.toDate();

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

        const completedJobs = workerJobs.filter(
          (job) => job.status === 'completed'
        );
        const workerReviews = reviews.filter(
          (review) => review.workerId === worker.id
        );

        // Calculate basic metrics
        const totalJobs = workerJobs.length;
        const completedJobsCount = completedJobs.length;

        // Average duration (in minutes)
        const avgDuration =
          completedJobs.length > 0
            ? completedJobs.reduce((sum, job) => {
                if (job.startedAt && job.completedAt) {
                  return (
                    sum +
                    (job.completedAt.toDate().getTime() -
                      job.startedAt.toDate().getTime()) /
                      (1000 * 60)
                  );
                }
                return sum;
              }, 0) / completedJobs.length
            : 0;

        // Average completion rate
        const avgCompletionRate =
          completedJobs.length > 0
            ? completedJobs.reduce(
                (sum, job) => sum + (job.completionRate || 0),
                0
              ) / completedJobs.length
            : 0;

        // Average rating from reviews
        const avgRating =
          workerReviews.length > 0
            ? workerReviews.reduce((sum, review) => sum + review.rating, 0) /
              workerReviews.length
            : 0;

        // On-time completion rate
        const onTimeJobs = completedJobs.filter((job) => {
          if (!job.scheduledAt || !job.completedAt) return false;
          return job.completedAt.toDate() <= job.scheduledAt.toDate();
        });
        const onTimeRate =
          completedJobs.length > 0
            ? (onTimeJobs.length / completedJobs.length) * 100
            : 0;

        // Efficiency (jobs per hour)
        const totalHours = completedJobs.reduce((sum, job) => {
          if (job.startedAt && job.completedAt) {
            return (
              sum +
              (job.completedAt.toDate().getTime() -
                job.startedAt.toDate().getTime()) /
                (1000 * 60 * 60)
            );
          }
          return sum;
        }, 0);
        const efficiency = totalHours > 0 ? completedJobsCount / totalHours : 0;

        // Consistency (standard deviation of completion times)
        const durations = completedJobs
          .map((job) => {
            if (job.startedAt && job.completedAt) {
              return (
                (job.completedAt.toDate().getTime() -
                  job.startedAt.toDate().getTime()) /
                (1000 * 60)
              );
            }
            return 0;
          })
          .filter((d) => d > 0);

        const consistencyScore =
          durations.length > 1
            ? 100 -
              Math.min(
                100,
                (standardDeviation(durations) / average(durations)) * 100
              )
            : 100;

        // Quality score (combination of completion rate and rating)
        const qualityScore = avgCompletionRate * 0.6 + avgRating * 20 * 0.4;

        // Overall productivity score
        const productivityScore =
          efficiency * 20 +
          consistencyScore * 0.3 +
          qualityScore * 0.3 +
          onTimeRate * 0.2;

        // Monthly trend (last 6 months)
        const monthlyTrend = calculateMonthlyTrend(workerJobs, workerReviews);

        return {
          id: worker.id || '',
          email: worker.email,
          totalJobs,
          completedJobs: completedJobsCount,
          avgDuration,
          avgCompletionRate,
          avgRating,
          totalRatings: workerReviews.length,
          onTimeRate,
          productivityScore,
          efficiency,
          consistency: consistencyScore,
          qualityScore,
          monthlyTrend,
          topPerformingAreas: getTopPerformingAreas(completedJobs),
          improvementAreas: getImprovementAreas(
            completedJobs,
            avgCompletionRate
          ),
        };
      }
    );

    setMetrics(calculatedMetrics);
  };

  const calculateTrends = () => {
    // Calculate overall productivity trends over time
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const trendData: ProductivityTrend[] = last30Days.map((date) => {
      const dayJobs = jobs.filter((job) => {
        if (!job.createdAt) return false;
        return job.createdAt.toDate().toISOString().split('T')[0] === date;
      });

      const completedJobs = dayJobs.filter((job) => job.status === 'completed');
      const totalJobs = dayJobs.length;

      const avgRating =
        reviews.length > 0
          ? reviews
              .filter((review) => {
                if (!review.createdAt) return false;
                return (
                  review.createdAt.toDate().toISOString().split('T')[0] === date
                );
              })
              .reduce((sum, review, _, arr) => {
                return arr.length > 0 ? sum + review.rating / arr.length : 0;
              }, 0)
          : 0;

      const avgDuration =
        completedJobs.length > 0
          ? completedJobs.reduce((sum, job) => {
              if (job.startedAt && job.completedAt) {
                return (
                  sum +
                  (job.completedAt.toDate().getTime() -
                    job.startedAt.toDate().getTime()) /
                    (1000 * 60)
                );
              }
              return sum;
            }, 0) / completedJobs.length
          : 0;

      const efficiency = completedJobs.length > 0 ? totalJobs / 8 : 0; // Assuming 8-hour workday

      return {
        date,
        totalJobs,
        avgRating,
        avgDuration,
        efficiency,
      };
    });

    setTrends(trendData);
  };

  const calculateMonthlyTrend = (
    workerJobs: Job[],
    workerReviews: Review[]
  ) => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
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

    return last6Months.map(({ month, monthStart, monthEnd }) => {
      const monthJobs = workerJobs.filter((job) => {
        if (!job.createdAt) return false;
        const jobDate = job.createdAt.toDate();
        return jobDate >= monthStart && jobDate <= monthEnd;
      });

      const monthReviews = workerReviews.filter((review) => {
        if (!review.createdAt) return false;
        const reviewDate = review.createdAt.toDate();
        return reviewDate >= monthStart && reviewDate <= monthEnd;
      });

      const avgRating =
        monthReviews.length > 0
          ? monthReviews.reduce((sum, review) => sum + review.rating, 0) /
            monthReviews.length
          : 0;

      return {
        month,
        jobs: monthJobs.length,
        rating: avgRating,
      };
    });
  };

  const getTopPerformingAreas = (completedJobs: Job[]): string[] => {
    const areaPerformance: { [key: string]: number[] } = {};

    completedJobs.forEach((job) => {
      job.areas.forEach((area) => {
        if (!areaPerformance[area]) {
          areaPerformance[area] = [];
        }
        areaPerformance[area].push(job.completionRate || 0);
      });
    });

    const avgPerformance = Object.entries(areaPerformance)
      .map(([area, rates]) => ({
        area,
        avgRate: rates.reduce((sum, rate) => sum + rate, 0) / rates.length,
      }))
      .sort((a, b) => b.avgRate - a.avgRate)
      .slice(0, 3);

    return avgPerformance.map((item) => item.area);
  };

  const getImprovementAreas = (
    completedJobs: Job[],
    avgCompletionRate: number
  ): string[] => {
    const areaPerformance: { [key: string]: number[] } = {};

    completedJobs.forEach((job) => {
      job.areas.forEach((area) => {
        if (!areaPerformance[area]) {
          areaPerformance[area] = [];
        }
        areaPerformance[area].push(job.completionRate || 0);
      });
    });

    const belowAverage = Object.entries(areaPerformance)
      .map(([area, rates]) => ({
        area,
        avgRate: rates.reduce((sum, rate) => sum + rate, 0) / rates.length,
      }))
      .filter((item) => item.avgRate < avgCompletionRate)
      .sort((a, b) => a.avgRate - b.avgRate)
      .slice(0, 3);

    return belowAverage.map((item) => item.area);
  };

  const standardDeviation = (values: number[]): number => {
    const avg = average(values);
    const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
    const avgSquareDiff = average(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  };

  const average = (values: number[]): number => {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  // Get sorted metrics based on selected criteria
  const getSortedMetrics = () => {
    return [...metrics].sort((a, b) => {
      switch (sortBy) {
        case 'efficiency':
          return b.efficiency - a.efficiency;
        case 'quality':
          return b.qualityScore - a.qualityScore;
        default:
          return b.productivityScore - a.productivityScore;
      }
    });
  };

  // Export data as CSV
  const exportToCSV = () => {
    let csvContent =
      'Worker,Total Jobs,Completed Jobs,Avg Duration (min),Completion Rate (%),Avg Rating,On-Time Rate (%),Productivity Score,Efficiency,Consistency,Quality Score\n';

    metrics.forEach((metric) => {
      csvContent += `"${metric.email}",${metric.totalJobs},${metric.completedJobs},${metric.avgDuration.toFixed(1)},${metric.avgCompletionRate.toFixed(1)},${metric.avgRating.toFixed(1)},${metric.onTimeRate.toFixed(1)},${metric.productivityScore.toFixed(1)},${metric.efficiency.toFixed(2)},${metric.consistency.toFixed(1)},${metric.qualityScore.toFixed(1)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `worker_productivity_analysis_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart data preparation
  const getOverviewChartData = () => {
    const sortedMetrics = getSortedMetrics();
    const labels = sortedMetrics.map((m) => m.email);

    if (chartType === 'radar') {
      // For radar chart, show individual worker performance across multiple dimensions
      const selectedMetric = sortedMetrics[0]; // Top performer
      return {
        labels: ['생산성', '효율성', '일관성', '품질', '정시완료율'],
        datasets: [
          {
            label: selectedMetric?.email || '',
            data: [
              selectedMetric?.productivityScore || 0,
              selectedMetric?.efficiency * 20 || 0,
              selectedMetric?.consistency || 0,
              selectedMetric?.qualityScore || 0,
              selectedMetric?.onTimeRate || 0,
            ],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
          },
        ],
      };
    }

    const dataValues = sortedMetrics.map((m) => {
      switch (sortBy) {
        case 'efficiency':
          return m.efficiency;
        case 'quality':
          return m.qualityScore;
        default:
          return m.productivityScore;
      }
    });

    return {
      labels,
      datasets: [
        {
          label:
            sortBy === 'efficiency'
              ? '효율성'
              : sortBy === 'quality'
                ? '품질 점수'
                : '생산성 점수',
          data: dataValues,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          tension: chartType === 'line' ? 0.4 : undefined,
        },
      ],
    };
  };

  const getTrendChartData = () => {
    return {
      labels: trends.map((t) =>
        new Date(t.date).toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
        })
      ),
      datasets: [
        {
          label: '일일 작업 수',
          data: trends.map((t) => t.totalJobs),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          yAxisID: 'y',
        },
        {
          label: '평균 평점',
          data: trends.map((t) => t.avgRating),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          yAxisID: 'y1',
        },
      ],
    };
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
          Worker별 생산성 분석
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
              보기 모드:
            </label>
            <select
              value={viewMode}
              onChange={(e) =>
                setViewMode(
                  e.target.value as 'overview' | 'individual' | 'comparison'
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
              <option value="individual">개별 분석</option>
              <option value="comparison">비교 분석</option>
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
                setChartType(e.target.value as 'bar' | 'line' | 'radar')
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
              <option value="radar">레이더 차트</option>
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
                setSortBy(
                  e.target.value as 'productivity' | 'efficiency' | 'quality'
                )
              }
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <option value="productivity">생산성 점수</option>
              <option value="efficiency">효율성</option>
              <option value="quality">품질 점수</option>
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
              📊 CSV 내보내기
            </button>
          </div>
        </div>

        {/* Summary Statistics */}
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
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #90caf9',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>
              총 Worker 수
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#0d47a1',
              }}
            >
              {metrics.length}명
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
              평균 생산성
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#4a148c',
              }}
            >
              {metrics.length > 0
                ? (
                    metrics.reduce((sum, m) => sum + m.productivityScore, 0) /
                    metrics.length
                  ).toFixed(1)
                : '0.0'}
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
              최고 효율성
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#1b5e20',
              }}
            >
              {metrics.length > 0
                ? Math.max(...metrics.map((m) => m.efficiency)).toFixed(2)
                : '0.00'}
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
              평균 품질 점수
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#e65100',
              }}
            >
              {metrics.length > 0
                ? (
                    metrics.reduce((sum, m) => sum + m.qualityScore, 0) /
                    metrics.length
                  ).toFixed(1)
                : '0.0'}
            </p>
          </div>
        </div>

        {/* Main Chart */}
        {metrics.length > 0 && (
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              height: chartType === 'radar' ? '500px' : '400px',
              marginBottom: '30px',
            }}
          >
            {chartType === 'radar' ? (
              <Radar
                data={getOverviewChartData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    r: {
                      beginAtZero: true,
                      max: 100,
                    },
                  },
                }}
              />
            ) : chartType === 'line' ? (
              <Line
                data={getOverviewChartData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    title: {
                      display: true,
                      text: `Worker별 ${sortBy === 'efficiency' ? '효율성' : sortBy === 'quality' ? '품질 점수' : '생산성 점수'} 분석`,
                    },
                  },
                }}
              />
            ) : (
              <Bar
                data={getOverviewChartData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    title: {
                      display: true,
                      text: `Worker별 ${sortBy === 'efficiency' ? '효율성' : sortBy === 'quality' ? '품질 점수' : '생산성 점수'} 분석`,
                    },
                  },
                }}
              />
            )}
          </div>
        )}

        {/* Trend Analysis */}
        {trends.length > 0 && (
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              height: '400px',
              marginBottom: '30px',
            }}
          >
            <Bar
              data={getTrendChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  title: {
                    display: true,
                    text: '30일간 생산성 트렌드',
                  },
                },
                scales: {
                  y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                      display: true,
                      text: '작업 수',
                    },
                  },
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                      display: true,
                      text: '평균 평점',
                    },
                    grid: {
                      drawOnChartArea: false,
                    },
                    max: 5,
                  },
                },
              }}
            />
          </div>
        )}

        {/* Detailed Metrics Table */}
        {metrics.length > 0 && (
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
              상세 생산성 지표
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
                      Worker
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
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      완료율
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      평균 시간
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      평점
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      정시율
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      효율성
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      일관성
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      생산성 점수
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedMetrics().map((metric, index) => (
                    <tr
                      key={metric.id}
                      style={{ borderBottom: '1px solid #eee' }}
                    >
                      <td style={{ padding: '12px' }}>
                        <div>
                          <strong>{metric.email}</strong>
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
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {metric.totalJobs}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {metric.avgCompletionRate.toFixed(1)}%
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {metric.avgDuration.toFixed(0)}분
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        ⭐ {metric.avgRating.toFixed(1)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {metric.onTimeRate.toFixed(1)}%
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {metric.efficiency.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {metric.consistency.toFixed(1)}%
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          textAlign: 'center',
                          fontWeight: 'bold',
                        }}
                      >
                        {metric.productivityScore.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default WorkerProductivityAnalysisScreen;
