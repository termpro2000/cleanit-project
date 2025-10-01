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
  RadialLinearScale,
} from 'chart.js';
import { Bar, Line, Doughnut, Radar, PolarArea } from 'react-chartjs-2';
import app from '../firebase';
import { User, Job, Building, Review } from '../types';
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
  ArcElement,
  RadialLinearScale
);

const db = getFirestore(app);

interface SatisfactionMetrics {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
  categoryAverages: {
    cleanliness: number;
    punctuality: number;
    communication: number;
    overall: number;
  };
  satisfactionLevel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  monthlyTrend: { month: string; rating: number; reviews: number }[];
  topComplaints: { complaint: string; count: number }[];
  improvementAreas: string[];
  workerSatisfaction: {
    workerId: string;
    workerEmail: string;
    avgRating: number;
    reviewCount: number;
  }[];
  clientSatisfaction: {
    clientId: string;
    clientEmail: string;
    avgRating: number;
    reviewCount: number;
  }[];
}

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  keywords: {
    word: string;
    frequency: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  }[];
}

const CustomerSatisfactionAnalysisScreen: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<SatisfactionMetrics>({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: {},
    categoryAverages: {
      cleanliness: 0,
      punctuality: 0,
      communication: 0,
      overall: 0,
    },
    satisfactionLevel: 'Fair',
    monthlyTrend: [],
    topComplaints: [],
    improvementAreas: [],
    workerSatisfaction: [],
    clientSatisfaction: [],
  });
  const [sentimentData, setSentimentData] = useState<SentimentData>({
    positive: 0,
    neutral: 0,
    negative: 0,
    keywords: [],
  });

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [selectedWorker, setSelectedWorker] = useState<string | 'all'>('all');
  const [selectedClient, setSelectedClient] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<
    'overview' | 'trends' | 'workers' | 'clients' | 'sentiment'
  >('overview');
  const [chartType, setChartType] = useState<
    'bar' | 'line' | 'radar' | 'doughnut' | 'polar'
  >('bar');
  const [minRating, setMinRating] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch Reviews
    const unsubscribeReviews = onSnapshot(
      query(collection(db, 'reviews'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const fetchedReviews: Review[] = [];
        snapshot.forEach((doc) => {
          fetchedReviews.push({ id: doc.id, ...doc.data() } as Review);
        });
        setReviews(fetchedReviews);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching reviews:', err);
        setError('리뷰 데이터를 불러오는데 실패했습니다.');
        setLoading(false);
      }
    );

    // Fetch Jobs
    const unsubscribeJobs = onSnapshot(
      collection(db, 'jobs'),
      (snapshot) => {
        const fetchedJobs: Job[] = [];
        snapshot.forEach((doc) => {
          fetchedJobs.push({ id: doc.id, ...doc.data() } as Job);
        });
        setJobs(fetchedJobs);
      },
      (err) => {
        console.error('Error fetching jobs:', err);
      }
    );

    // Fetch Buildings
    const unsubscribeBuildings = onSnapshot(
      collection(db, 'buildings'),
      (snapshot) => {
        const fetchedBuildings: Building[] = [];
        snapshot.forEach((doc) => {
          fetchedBuildings.push({ id: doc.id, ...doc.data() } as Building);
        });
        setBuildings(fetchedBuildings);
      },
      (err) => {
        console.error('Error fetching buildings:', err);
      }
    );

    // Fetch Clients
    const unsubscribeClients = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'client')),
      (snapshot) => {
        const fetchedClients: User[] = [];
        snapshot.forEach((doc) => {
          fetchedClients.push({ id: doc.id, ...doc.data() } as User);
        });
        setClients(fetchedClients);
      },
      (err) => {
        console.error('Error fetching clients:', err);
      }
    );

    // Fetch Workers
    const unsubscribeWorkers = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'worker')),
      (snapshot) => {
        const fetchedWorkers: User[] = [];
        snapshot.forEach((doc) => {
          fetchedWorkers.push({ id: doc.id, ...doc.data() } as User);
        });
        setWorkers(fetchedWorkers);
      },
      (err) => {
        console.error('Error fetching workers:', err);
      }
    );

    return () => {
      unsubscribeReviews();
      unsubscribeJobs();
      unsubscribeBuildings();
      unsubscribeClients();
      unsubscribeWorkers();
    };
  }, []);

  // Calculate metrics when data changes
  useEffect(() => {
    if (reviews.length > 0) {
      calculateSatisfactionMetrics();
      analyzeSentiment();
    }
  }, [
    reviews,
    jobs,
    buildings,
    clients,
    workers,
    dateRange,
    selectedWorker,
    selectedClient,
    minRating,
  ]);

  const calculateSatisfactionMetrics = () => {
    let filteredReviews = reviews.filter((review) => review.isVisible);

    // Apply filters
    if (dateRange.start || dateRange.end) {
      filteredReviews = filteredReviews.filter((review) => {
        if (!review.createdAt) return false;
        const reviewDate = review.createdAt.toDate();

        if (dateRange.start) {
          const startDate = new Date(dateRange.start);
          if (reviewDate < startDate) return false;
        }

        if (dateRange.end) {
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          if (reviewDate > endDate) return false;
        }

        return true;
      });
    }

    if (selectedWorker !== 'all') {
      filteredReviews = filteredReviews.filter(
        (review) => review.workerId === selectedWorker
      );
    }

    if (selectedClient !== 'all') {
      filteredReviews = filteredReviews.filter((review) => {
        const building = buildings.find((b) => b.id === review.buildingId);
        return building?.ownerId === selectedClient;
      });
    }

    if (minRating > 1) {
      filteredReviews = filteredReviews.filter(
        (review) => review.rating >= minRating
      );
    }

    // Calculate basic metrics
    const totalReviews = filteredReviews.length;
    const averageRating =
      totalReviews > 0
        ? filteredReviews.reduce((sum, review) => sum + review.rating, 0) /
          totalReviews
        : 0;

    // Rating distribution
    const ratingDistribution: { [key: number]: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    filteredReviews.forEach((review) => {
      ratingDistribution[review.rating] =
        (ratingDistribution[review.rating] || 0) + 1;
    });

    // Category averages
    const categoryAverages = {
      cleanliness: 0,
      punctuality: 0,
      communication: 0,
      overall: 0,
    };

    if (totalReviews > 0) {
      const categoryTotals = filteredReviews.reduce(
        (totals, review) => ({
          cleanliness:
            totals.cleanliness + (review.categories?.cleanliness || 0),
          punctuality:
            totals.punctuality + (review.categories?.punctuality || 0),
          communication:
            totals.communication + (review.categories?.communication || 0),
          overall: totals.overall + (review.categories?.overall || 0),
        }),
        { cleanliness: 0, punctuality: 0, communication: 0, overall: 0 }
      );

      categoryAverages.cleanliness = categoryTotals.cleanliness / totalReviews;
      categoryAverages.punctuality = categoryTotals.punctuality / totalReviews;
      categoryAverages.communication =
        categoryTotals.communication / totalReviews;
      categoryAverages.overall = categoryTotals.overall / totalReviews;
    }

    // Satisfaction level
    let satisfactionLevel: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Poor';
    if (averageRating >= 4.5) satisfactionLevel = 'Excellent';
    else if (averageRating >= 3.5) satisfactionLevel = 'Good';
    else if (averageRating >= 2.5) satisfactionLevel = 'Fair';

    // Monthly trend (last 12 months)
    const monthlyTrend = calculateMonthlyTrend(filteredReviews);

    // Top complaints from improvement areas
    const topComplaints = calculateTopComplaints(filteredReviews);

    // Improvement areas
    const improvementAreas = calculateImprovementAreas(categoryAverages);

    // Worker satisfaction
    const workerSatisfaction = calculateWorkerSatisfaction(filteredReviews);

    // Client satisfaction
    const clientSatisfaction = calculateClientSatisfaction(filteredReviews);

    setMetrics({
      totalReviews,
      averageRating,
      ratingDistribution,
      categoryAverages,
      satisfactionLevel,
      monthlyTrend,
      topComplaints,
      improvementAreas,
      workerSatisfaction,
      clientSatisfaction,
    });
  };

  const calculateMonthlyTrend = (filteredReviews: Review[]) => {
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

    return last12Months.map(({ month, monthStart, monthEnd }) => {
      const monthReviews = filteredReviews.filter((review) => {
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
        rating: avgRating,
        reviews: monthReviews.length,
      };
    });
  };

  const calculateTopComplaints = (filteredReviews: Review[]) => {
    const complaints: { [key: string]: number } = {};

    filteredReviews.forEach((review) => {
      if (review.improvements) {
        review.improvements.forEach((improvement) => {
          complaints[improvement] = (complaints[improvement] || 0) + 1;
        });
      }
    });

    return Object.entries(complaints)
      .map(([complaint, count]) => ({ complaint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const calculateImprovementAreas = (categoryAverages: any) => {
    const categories = [
      {
        name: '청결도',
        value: categoryAverages.cleanliness,
        key: 'cleanliness',
      },
      {
        name: '시간 준수',
        value: categoryAverages.punctuality,
        key: 'punctuality',
      },
      {
        name: '의사소통',
        value: categoryAverages.communication,
        key: 'communication',
      },
      {
        name: '전반적 만족도',
        value: categoryAverages.overall,
        key: 'overall',
      },
    ];

    return categories
      .filter((cat) => cat.value < 3.5) // Below average
      .sort((a, b) => a.value - b.value)
      .map((cat) => cat.name)
      .slice(0, 3);
  };

  const calculateWorkerSatisfaction = (filteredReviews: Review[]) => {
    const workerRatings: { [key: string]: number[] } = {};

    filteredReviews.forEach((review) => {
      if (!workerRatings[review.workerId]) {
        workerRatings[review.workerId] = [];
      }
      workerRatings[review.workerId].push(review.rating);
    });

    return Object.entries(workerRatings)
      .map(([workerId, ratings]) => {
        const worker = workers.find((w) => w.id === workerId);
        const avgRating =
          ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

        return {
          workerId,
          workerEmail: worker?.email || 'Unknown',
          avgRating,
          reviewCount: ratings.length,
        };
      })
      .sort((a, b) => b.avgRating - a.avgRating);
  };

  const calculateClientSatisfaction = (filteredReviews: Review[]) => {
    const clientRatings: { [key: string]: number[] } = {};

    filteredReviews.forEach((review) => {
      const building = buildings.find((b) => b.id === review.buildingId);
      if (building?.ownerId) {
        if (!clientRatings[building.ownerId]) {
          clientRatings[building.ownerId] = [];
        }
        clientRatings[building.ownerId].push(review.rating);
      }
    });

    return Object.entries(clientRatings)
      .map(([clientId, ratings]) => {
        const client = clients.find((c) => c.id === clientId);
        const avgRating =
          ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

        return {
          clientId,
          clientEmail: client?.email || 'Unknown',
          avgRating,
          reviewCount: ratings.length,
        };
      })
      .sort((a, b) => b.avgRating - a.avgRating);
  };

  const analyzeSentiment = () => {
    const sentimentKeywords = {
      positive: [
        '좋',
        '만족',
        '깨끗',
        '친절',
        '훌륭',
        '완벽',
        '추천',
        '감사',
        '최고',
        '놀라운',
      ],
      negative: [
        '나쁜',
        '불만',
        '더러운',
        '늦은',
        '실망',
        '최악',
        '불친절',
        '부족',
        '문제',
        '개선',
      ],
    };

    let positive = 0;
    let negative = 0;
    let neutral = 0;
    const keywords: {
      [key: string]: {
        count: number;
        sentiment: 'positive' | 'negative' | 'neutral';
      };
    } = {};

    reviews.forEach((review) => {
      if (review.comment) {
        const comment = review.comment.toLowerCase();
        let hasPositive = false;
        let hasNegative = false;

        // Check for positive keywords
        sentimentKeywords.positive.forEach((keyword) => {
          if (comment.includes(keyword)) {
            hasPositive = true;
            keywords[keyword] = keywords[keyword] || {
              count: 0,
              sentiment: 'positive',
            };
            keywords[keyword].count++;
          }
        });

        // Check for negative keywords
        sentimentKeywords.negative.forEach((keyword) => {
          if (comment.includes(keyword)) {
            hasNegative = true;
            keywords[keyword] = keywords[keyword] || {
              count: 0,
              sentiment: 'negative',
            };
            keywords[keyword].count++;
          }
        });

        // Classify sentiment
        if (hasPositive && !hasNegative) {
          positive++;
        } else if (hasNegative && !hasPositive) {
          negative++;
        } else {
          neutral++;
        }
      }
    });

    const keywordArray = Object.entries(keywords)
      .map(([word, data]) => ({
        word,
        frequency: data.count,
        sentiment: data.sentiment,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    setSentimentData({
      positive,
      negative,
      neutral,
      keywords: keywordArray,
    });
  };

  // Export data as CSV
  const exportToCSV = () => {
    let csvContent = '';

    if (viewMode === 'workers') {
      csvContent = 'Worker,Average Rating,Review Count,Satisfaction Level\n';
      metrics.workerSatisfaction.forEach((data) => {
        const level =
          data.avgRating >= 4 ? 'High' : data.avgRating >= 3 ? 'Medium' : 'Low';
        csvContent += `"${data.workerEmail}",${data.avgRating.toFixed(2)},${data.reviewCount},"${level}"\n`;
      });
    } else if (viewMode === 'clients') {
      csvContent = 'Client,Average Rating,Review Count,Satisfaction Level\n';
      metrics.clientSatisfaction.forEach((data) => {
        const level =
          data.avgRating >= 4 ? 'High' : data.avgRating >= 3 ? 'Medium' : 'Low';
        csvContent += `"${data.clientEmail}",${data.avgRating.toFixed(2)},${data.reviewCount},"${level}"\n`;
      });
    } else if (viewMode === 'trends') {
      csvContent = 'Month,Average Rating,Review Count\n';
      metrics.monthlyTrend.forEach((data) => {
        csvContent += `"${data.month}",${data.rating.toFixed(2)},${data.reviews}\n`;
      });
    } else {
      csvContent = 'Metric,Value\n';
      csvContent += `"Total Reviews",${metrics.totalReviews}\n`;
      csvContent += `"Average Rating",${metrics.averageRating.toFixed(2)}\n`;
      csvContent += `"Satisfaction Level","${metrics.satisfactionLevel}"\n`;
      csvContent += `"Cleanliness Average",${metrics.categoryAverages.cleanliness.toFixed(2)}\n`;
      csvContent += `"Punctuality Average",${metrics.categoryAverages.punctuality.toFixed(2)}\n`;
      csvContent += `"Communication Average",${metrics.categoryAverages.communication.toFixed(2)}\n`;
      csvContent += `"Overall Average",${metrics.categoryAverages.overall.toFixed(2)}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `customer_satisfaction_${viewMode}_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart data preparation
  const getChartData = () => {
    if (viewMode === 'trends') {
      if (chartType === 'doughnut') {
        // Show rating distribution
        return {
          labels: [
            '⭐ 1점',
            '⭐⭐ 2점',
            '⭐⭐⭐ 3점',
            '⭐⭐⭐⭐ 4점',
            '⭐⭐⭐⭐⭐ 5점',
          ],
          datasets: [
            {
              data: [
                metrics.ratingDistribution[1] || 0,
                metrics.ratingDistribution[2] || 0,
                metrics.ratingDistribution[3] || 0,
                metrics.ratingDistribution[4] || 0,
                metrics.ratingDistribution[5] || 0,
              ],
              backgroundColor: [
                '#FF6384',
                '#FF9F40',
                '#FFCE56',
                '#4BC0C0',
                '#36A2EB',
              ],
            },
          ],
        };
      }

      return {
        labels: metrics.monthlyTrend.map((t) => t.month),
        datasets: [
          {
            label: '평균 평점',
            data: metrics.monthlyTrend.map((t) => t.rating),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            tension: chartType === 'line' ? 0.4 : undefined,
            yAxisID: 'y',
          },
          {
            label: '리뷰 수',
            data: metrics.monthlyTrend.map((t) => t.reviews),
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2,
            tension: chartType === 'line' ? 0.4 : undefined,
            yAxisID: 'y1',
          },
        ],
      };
    } else if (viewMode === 'workers') {
      const topWorkers = metrics.workerSatisfaction.slice(0, 10);

      if (chartType === 'radar') {
        // Show category comparison for top worker
        const topWorker = topWorkers[0];
        if (topWorker) {
          return {
            labels: ['청결도', '시간준수', '의사소통', '전반적 만족도'],
            datasets: [
              {
                label: topWorker.workerEmail,
                data: [
                  metrics.categoryAverages.cleanliness,
                  metrics.categoryAverages.punctuality,
                  metrics.categoryAverages.communication,
                  metrics.categoryAverages.overall,
                ],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                pointBackgroundColor: 'rgba(54, 162, 235, 1)',
              },
            ],
          };
        }
      }

      return {
        labels: topWorkers.map((w) => w.workerEmail),
        datasets: [
          {
            label: 'Worker 평점',
            data: topWorkers.map((w) => w.avgRating),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
        ],
      };
    } else if (viewMode === 'clients') {
      const topClients = metrics.clientSatisfaction.slice(0, 10);

      return {
        labels: topClients.map((c) => c.clientEmail),
        datasets: [
          {
            label: '고객 만족도',
            data: topClients.map((c) => c.avgRating),
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
          },
        ],
      };
    } else if (viewMode === 'sentiment') {
      if (chartType === 'doughnut') {
        return {
          labels: ['긍정적', '중립적', '부정적'],
          datasets: [
            {
              data: [
                sentimentData.positive,
                sentimentData.neutral,
                sentimentData.negative,
              ],
              backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
            },
          ],
        };
      }

      return {
        labels: sentimentData.keywords.slice(0, 10).map((k) => k.word),
        datasets: [
          {
            label: '키워드 빈도',
            data: sentimentData.keywords.slice(0, 10).map((k) => k.frequency),
            backgroundColor: sentimentData.keywords
              .slice(0, 10)
              .map((k) =>
                k.sentiment === 'positive'
                  ? 'rgba(54, 162, 235, 0.6)'
                  : k.sentiment === 'negative'
                    ? 'rgba(255, 99, 132, 0.6)'
                    : 'rgba(255, 206, 86, 0.6)'
              ),
            borderColor: sentimentData.keywords
              .slice(0, 10)
              .map((k) =>
                k.sentiment === 'positive'
                  ? 'rgba(54, 162, 235, 1)'
                  : k.sentiment === 'negative'
                    ? 'rgba(255, 99, 132, 1)'
                    : 'rgba(255, 206, 86, 1)'
              ),
            borderWidth: 1,
          },
        ],
      };
    }

    // Overview - Category averages
    if (chartType === 'radar') {
      return {
        labels: ['청결도', '시간준수', '의사소통', '전반적 만족도'],
        datasets: [
          {
            label: '평균 점수',
            data: [
              metrics.categoryAverages.cleanliness,
              metrics.categoryAverages.punctuality,
              metrics.categoryAverages.communication,
              metrics.categoryAverages.overall,
            ],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
          },
        ],
      };
    }

    return {
      labels: ['청결도', '시간준수', '의사소통', '전반적 만족도'],
      datasets: [
        {
          label: '카테고리별 평점',
          data: [
            metrics.categoryAverages.cleanliness,
            metrics.categoryAverages.punctuality,
            metrics.categoryAverages.communication,
            metrics.categoryAverages.overall,
          ],
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
          borderColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
          borderWidth: 1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `${
          viewMode === 'trends'
            ? '만족도 트렌드'
            : viewMode === 'workers'
              ? 'Worker별 만족도'
              : viewMode === 'clients'
                ? '고객별 만족도'
                : viewMode === 'sentiment'
                  ? '감정 분석'
                  : '카테고리별 평점'
        } 분석`,
      },
      legend: {
        display: chartType !== 'radar',
      },
    },
    scales:
      chartType === 'radar' || chartType === 'doughnut' || chartType === 'polar'
        ? undefined
        : {
            y: {
              beginAtZero: true,
              max: viewMode === 'trends' ? undefined : 5,
              title: {
                display: true,
                text: viewMode === 'sentiment' ? '빈도' : '평점',
              },
            },
            y1:
              viewMode === 'trends'
                ? {
                    type: 'linear' as const,
                    display: true,
                    position: 'right' as const,
                    title: {
                      display: true,
                      text: '리뷰 수',
                    },
                    grid: {
                      drawOnChartArea: false,
                    },
                  }
                : undefined,
          },
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
          고객 만족도 분석
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
              분석 뷰:
            </label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <option value="overview">전체 개요</option>
              <option value="trends">트렌드 분석</option>
              <option value="workers">Worker별 분석</option>
              <option value="clients">고객별 분석</option>
              <option value="sentiment">감정 분석</option>
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
              onChange={(e) => setChartType(e.target.value as any)}
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
              <option value="doughnut">원형 차트</option>
              <option value="polar">극좌표 차트</option>
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
              Worker 필터:
            </label>
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <option value="all">모든 Worker</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.email}
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
              최소 평점:
            </label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <option value={1}>1점 이상</option>
              <option value={2}>2점 이상</option>
              <option value={3}>3점 이상</option>
              <option value={4}>4점 이상</option>
              <option value={5}>5점만</option>
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
              😊 CSV 내보내기
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
            <h3 style={{ margin: '0 0 10px 0', color: '#388e3c' }}>
              전체 만족도
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#1b5e20',
              }}
            >
              ⭐ {metrics.averageRating.toFixed(1)}
            </p>
            <p
              style={{
                margin: '5px 0 0 0',
                fontSize: '14px',
                color: '#388e3c',
              }}
            >
              {metrics.satisfactionLevel}
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
              총 리뷰 수
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#0d47a1',
              }}
            >
              {metrics.totalReviews.toLocaleString()}개
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
              최고 카테고리
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#4a148c',
              }}
            >
              {Object.entries(metrics.categoryAverages).sort(
                ([, a], [, b]) => b - a
              )[0]?.[0] === 'cleanliness'
                ? '청결도'
                : Object.entries(metrics.categoryAverages).sort(
                      ([, a], [, b]) => b - a
                    )[0]?.[0] === 'punctuality'
                  ? '시간준수'
                  : Object.entries(metrics.categoryAverages).sort(
                        ([, a], [, b]) => b - a
                      )[0]?.[0] === 'communication'
                    ? '의사소통'
                    : '전반적 만족도'}
            </p>
            <p
              style={{
                margin: '5px 0 0 0',
                fontSize: '14px',
                color: '#7b1fa2',
              }}
            >
              {Math.max(...Object.values(metrics.categoryAverages)).toFixed(1)}
              점
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
            <h3 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>5점 비율</h3>
            <p
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#e65100',
              }}
            >
              {metrics.totalReviews > 0
                ? (
                    ((metrics.ratingDistribution[5] || 0) /
                      metrics.totalReviews) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </p>
          </div>

          {viewMode === 'sentiment' && (
            <>
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
                  긍정적 리뷰
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1b5e20',
                  }}
                >
                  {sentimentData.positive}개
                </p>
              </div>

              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#ffebee',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid #ffcdd2',
                }}
              >
                <h3 style={{ margin: '0 0 10px 0', color: '#d32f2f' }}>
                  부정적 리뷰
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#b71c1c',
                  }}
                >
                  {sentimentData.negative}개
                </p>
              </div>
            </>
          )}
        </div>

        {/* Chart */}
        {metrics.totalReviews > 0 && (
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              height:
                chartType === 'radar' ||
                chartType === 'doughnut' ||
                chartType === 'polar'
                  ? '500px'
                  : '400px',
              marginBottom: '30px',
            }}
          >
            {chartType === 'radar' ? (
              <Radar
                data={getChartData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    r: {
                      beginAtZero: true,
                      max: 5,
                    },
                  },
                }}
              />
            ) : chartType === 'doughnut' ? (
              <Doughnut
                data={getChartData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: chartOptions.plugins,
                }}
              />
            ) : chartType === 'polar' ? (
              <PolarArea
                data={getChartData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: chartOptions.plugins,
                }}
              />
            ) : chartType === 'line' ? (
              <Line data={getChartData()} options={chartOptions} />
            ) : (
              <Bar data={getChartData()} options={chartOptions} />
            )}
          </div>
        )}

        {/* Improvement Areas */}
        {metrics.improvementAreas.length > 0 && (
          <div
            style={{
              backgroundColor: '#fff3e0',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #ffcc02',
              marginBottom: '30px',
            }}
          >
            <h3 style={{ margin: '0 0 15px 0', color: '#f57c00' }}>
              🚀 개선이 필요한 영역
            </h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {metrics.improvementAreas.map((area, index) => (
                <span
                  key={index}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    borderRadius: '16px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top Complaints */}
        {metrics.topComplaints.length > 0 && (
          <div
            style={{
              backgroundColor: '#ffebee',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #ffcdd2',
              marginBottom: '30px',
            }}
          >
            <h3 style={{ margin: '0 0 15px 0', color: '#d32f2f' }}>
              📝 주요 개선 요청사항
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px',
              }}
            >
              {metrics.topComplaints.slice(0, 6).map((complaint, index) => (
                <div
                  key={index}
                  style={{
                    padding: '10px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid #ffcdd2',
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#d32f2f' }}>
                    {complaint.complaint}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {complaint.count}건 요청
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Tables */}
        {viewMode === 'workers' && metrics.workerSatisfaction.length > 0 && (
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
              Worker별 상세 만족도
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
                      평균 평점
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      리뷰 수
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      만족도 수준
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.workerSatisfaction.map((data, index) => {
                    const level =
                      data.avgRating >= 4.5
                        ? 'Excellent'
                        : data.avgRating >= 3.5
                          ? 'Good'
                          : data.avgRating >= 2.5
                            ? 'Fair'
                            : 'Poor';
                    const levelColor =
                      data.avgRating >= 4.5
                        ? '#2e7d32'
                        : data.avgRating >= 3.5
                          ? '#1976d2'
                          : data.avgRating >= 2.5
                            ? '#f57c00'
                            : '#d32f2f';

                    return (
                      <tr
                        key={data.workerId}
                        style={{ borderBottom: '1px solid #eee' }}
                      >
                        <td style={{ padding: '12px' }}>
                          <div>
                            {data.workerEmail}
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
                            textAlign: 'center',
                            fontWeight: 'bold',
                          }}
                        >
                          ⭐ {data.avgRating.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {data.reviewCount}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: levelColor,
                          }}
                        >
                          {level}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'clients' && metrics.clientSatisfaction.length > 0 && (
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
              고객별 상세 만족도
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
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      평균 평점
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      리뷰 수
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #ddd',
                      }}
                    >
                      만족도 수준
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.clientSatisfaction.map((data, index) => {
                    const level =
                      data.avgRating >= 4.5
                        ? 'Excellent'
                        : data.avgRating >= 3.5
                          ? 'Good'
                          : data.avgRating >= 2.5
                            ? 'Fair'
                            : 'Poor';
                    const levelColor =
                      data.avgRating >= 4.5
                        ? '#2e7d32'
                        : data.avgRating >= 3.5
                          ? '#1976d2'
                          : data.avgRating >= 2.5
                            ? '#f57c00'
                            : '#d32f2f';

                    return (
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
                            textAlign: 'center',
                            fontWeight: 'bold',
                          }}
                        >
                          ⭐ {data.avgRating.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {data.reviewCount}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: levelColor,
                          }}
                        >
                          {level}
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

export default CustomerSatisfactionAnalysisScreen;
