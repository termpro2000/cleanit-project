import React, { useState, useEffect } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import app from '../firebase';
import { User, Job, Review } from '../types';
import BackToDashboard from '../components/BackToDashboard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const db = getFirestore(app);

interface WorkerPerformanceMetrics {
  id: string;
  email: string;
  totalJobs: number;
  avgDuration: number;
  avgCompletionRate: number;
  avgRating: number;
  totalRatings: number;
  onTimeRate: number;
  productivity: number;
}

const WorkerPerformanceScreen: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [workers, setWorkers] = useState<User[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [jobs, setJobs] = useState<Job[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [reviews, setReviews] = useState<Review[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<
    WorkerPerformanceMetrics[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let workersData: User[] = [];
    let jobsData: Job[] = [];
    let reviewsData: Review[] = [];

    // Fetch Workers
    const unsubscribeWorkers = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'worker')),
      (snapshot) => {
        workersData = [];
        snapshot.forEach((doc) =>
          workersData.push({ id: doc.id, ...doc.data() } as User)
        );
        setWorkers(workersData);
        calculatePerformanceMetrics(workersData, jobsData, reviewsData);
      },
      (err) => {
        console.error('Error fetching workers:', err);
        setError('Worker 목록을 불러오는데 실패했습니다.');
        setLoading(false);
      }
    );

    // Fetch all completed Jobs
    const unsubscribeJobs = onSnapshot(
      collection(db, 'jobs'),
      (snapshot) => {
        jobsData = [];
        snapshot.forEach((doc) =>
          jobsData.push({ id: doc.id, ...doc.data() } as Job)
        );
        setJobs(jobsData);
        calculatePerformanceMetrics(workersData, jobsData, reviewsData);
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
        reviewsData = [];
        snapshot.forEach((doc) =>
          reviewsData.push({ id: doc.id, ...doc.data() } as Review)
        );
        setReviews(reviewsData);
        calculatePerformanceMetrics(workersData, jobsData, reviewsData);
      },
      (err) => {
        console.error('Error fetching reviews:', err);
        setError('리뷰 데이터를 불러오는데 실패했습니다.');
        setLoading(false);
      }
    );

    return () => {
      unsubscribeWorkers();
      unsubscribeJobs();
      unsubscribeReviews();
    };
  }, []);

  const calculatePerformanceMetrics = (
    workers: User[],
    jobs: Job[],
    reviews: Review[]
  ) => {
    if (workers.length === 0) {
      setLoading(false);
      return;
    }

    const metrics: WorkerPerformanceMetrics[] = workers.map((worker) => {
      const workerJobs = jobs.filter((job) => job.workerId === worker.id);
      const completedJobs = workerJobs.filter(
        (job) => job.status === 'completed'
      );
      const workerReviews = reviews.filter(
        (review) => review.workerId === worker.id
      );

      // 평균 작업 시간 (분)
      const avgDuration =
        completedJobs.length > 0
          ? completedJobs.reduce((sum, job) => sum + (job.duration || 0), 0) /
            completedJobs.length
          : 0;

      // 평균 완료율
      const avgCompletionRate =
        completedJobs.length > 0
          ? completedJobs.reduce((sum, job) => sum + job.completionRate, 0) /
            completedJobs.length
          : 0;

      // 평균 평점
      const avgRating =
        workerReviews.length > 0
          ? workerReviews.reduce((sum, review) => sum + review.rating, 0) /
            workerReviews.length
          : 0;

      // 시간 준수율 계산 (예정 시간보다 늦게 시작한 비율)
      const onTimeJobs = completedJobs.filter((job) => {
        if (!job.startedAt || !job.scheduledAt) return false;
        const scheduledTime = job.scheduledAt.toDate();
        const startedTime = job.startedAt.toDate();
        const delayMinutes =
          (startedTime.getTime() - scheduledTime.getTime()) / (1000 * 60);
        return delayMinutes <= 15; // 15분 이내 지연은 정시로 간주
      });
      const onTimeRate =
        completedJobs.length > 0
          ? (onTimeJobs.length / completedJobs.length) * 100
          : 0;

      // 생산성 지수 (완료된 작업 수 / 평균 작업 시간 * 완료율)
      const productivity =
        avgDuration > 0
          ? (completedJobs.length / avgDuration) *
            (avgCompletionRate / 100) *
            100
          : 0;

      return {
        id: worker.id || '',
        email: worker.email,
        totalJobs: completedJobs.length,
        avgDuration,
        avgCompletionRate,
        avgRating,
        totalRatings: workerReviews.length,
        onTimeRate,
        productivity,
      };
    });

    setPerformanceMetrics(metrics);
    setLoading(false);
  };

  // 차트 데이터 준비
  const productivityChartData = {
    labels: performanceMetrics.map((metric) => metric.email.split('@')[0]),
    datasets: [
      {
        label: '생산성 지수',
        data: performanceMetrics.map((metric) =>
          metric.productivity.toFixed(1)
        ),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const ratingChartData = {
    labels: performanceMetrics.map((metric) => metric.email.split('@')[0]),
    datasets: [
      {
        label: '평균 평점',
        data: performanceMetrics.map((metric) => metric.avgRating.toFixed(1)),
        backgroundColor: 'rgba(255, 206, 86, 0.6)',
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Worker 성과 지표',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Worker 성과 분석</h1>
        <p>데이터를 로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Worker 성과 분석</h1>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  if (performanceMetrics.length === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Worker 성과 분석</h1>
        <p>등록된 Worker가 없거나 성과 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <BackToDashboard />
      <div style={{ padding: '20px' }}>
        <h1>Worker 성과 분석</h1>

        {/* 차트 섹션 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <h3>생산성 지수</h3>
            <Bar data={productivityChartData} options={chartOptions} />
          </div>
          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <h3>평균 평점</h3>
            <Bar
              data={ratingChartData}
              options={{
                ...chartOptions,
                scales: { y: { beginAtZero: true, max: 5 } },
              }}
            />
          </div>
        </div>

        {/* 상세 테이블 */}
        <div
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <h3>상세 성과 지표</h3>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '2px solid #ddd',
                    backgroundColor: '#f8f9fa',
                  }}
                >
                  <th style={{ padding: '12px', textAlign: 'left' }}>Worker</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>
                    완료 작업
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>
                    평균 소요시간
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>
                    평균 완료율
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>
                    평균 평점
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>
                    시간 준수율
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>
                    생산성 지수
                  </th>
                </tr>
              </thead>
              <tbody>
                {performanceMetrics
                  .sort((a, b) => b.productivity - a.productivity)
                  .map((metric, index) => (
                    <tr
                      key={metric.id}
                      style={{
                        borderBottom: '1px solid #eee',
                        backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <strong>{metric.email.split('@')[0]}</strong>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {metric.totalJobs}건
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {metric.avgDuration.toFixed(0)}분
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span
                          style={{
                            color:
                              metric.avgCompletionRate >= 90
                                ? 'green'
                                : metric.avgCompletionRate >= 80
                                  ? 'orange'
                                  : 'red',
                            fontWeight: 'bold',
                          }}
                        >
                          {metric.avgCompletionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span
                          style={{
                            color:
                              metric.avgRating >= 4.5
                                ? 'green'
                                : metric.avgRating >= 4.0
                                  ? 'orange'
                                  : 'red',
                            fontWeight: 'bold',
                          }}
                        >
                          {metric.avgRating.toFixed(1)}/5.0
                        </span>
                        <br />
                        <small style={{ color: '#666' }}>
                          ({metric.totalRatings}개 평가)
                        </small>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span
                          style={{
                            color:
                              metric.onTimeRate >= 90
                                ? 'green'
                                : metric.onTimeRate >= 80
                                  ? 'orange'
                                  : 'red',
                            fontWeight: 'bold',
                          }}
                        >
                          {metric.onTimeRate.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span
                          style={{
                            color:
                              metric.productivity >= 10
                                ? 'green'
                                : metric.productivity >= 5
                                  ? 'orange'
                                  : 'red',
                            fontWeight: 'bold',
                          }}
                        >
                          {metric.productivity.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 성과 요약 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginTop: '20px',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center',
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>
              총 Worker 수
            </h4>
            <p
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                margin: '0',
                color: '#2196F3',
              }}
            >
              {performanceMetrics.length}명
            </p>
          </div>
          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center',
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>
              총 완료 작업
            </h4>
            <p
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                margin: '0',
                color: '#4CAF50',
              }}
            >
              {performanceMetrics.reduce(
                (sum, metric) => sum + metric.totalJobs,
                0
              )}
              건
            </p>
          </div>
          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center',
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>평균 완료율</h4>
            <p
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                margin: '0',
                color: '#FF9800',
              }}
            >
              {performanceMetrics.length > 0
                ? (
                    performanceMetrics.reduce(
                      (sum, metric) => sum + metric.avgCompletionRate,
                      0
                    ) / performanceMetrics.length
                  ).toFixed(1)
                : 0}
              %
            </p>
          </div>
          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center',
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>평균 평점</h4>
            <p
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                margin: '0',
                color: '#9C27B0',
              }}
            >
              {performanceMetrics.length > 0
                ? (
                    performanceMetrics.reduce(
                      (sum, metric) => sum + metric.avgRating,
                      0
                    ) / performanceMetrics.length
                  ).toFixed(1)
                : 0}
              /5.0
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default WorkerPerformanceScreen;
