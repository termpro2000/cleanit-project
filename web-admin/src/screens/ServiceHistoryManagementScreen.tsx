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
import { Job, User, Building, JobStatus } from '../types';
import BackToDashboard from '../components/BackToDashboard';

const db = getFirestore(app);

const ServiceHistoryManagementScreen: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | 'all'>(
    'all'
  );
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        setError('Client 목록을 불러오는데 실패했습니다.');
      }
    );

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
      }
    );

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
      }
    );

    return () => {
      unsubscribeClients();
      unsubscribeWorkers();
      unsubscribeBuildings();
    };
  }, []);

  useEffect(() => {
    let q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));

    const unsubscribeJobs = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedJobs: Job[] = [];
        querySnapshot.forEach((doc) => {
          fetchedJobs.push({ id: doc.id, ...doc.data() } as Job);
        });
        setJobs(fetchedJobs);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching jobs:', err);
        setError('서비스 이력을 불러오는데 실패했습니다.');
        setLoading(false);
      }
    );

    return () => unsubscribeJobs();
  }, []);

  // Filter jobs based on selected criteria
  const filteredJobs = jobs.filter((job) => {
    // Client filter
    if (selectedClientId !== 'all') {
      const building = buildings.find((b) => b.id === job.buildingId);
      if (!building || building.ownerId !== selectedClientId) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all' && job.status !== statusFilter) {
      return false;
    }

    // Date range filter
    if (dateRange.start && job.createdAt) {
      const jobDate = job.createdAt.toDate();
      const startDate = new Date(dateRange.start);
      if (jobDate < startDate) return false;
    }
    if (dateRange.end && job.createdAt) {
      const jobDate = job.createdAt.toDate();
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      if (jobDate > endDate) return false;
    }

    // Search term filter
    if (searchTerm) {
      const building = buildings.find((b) => b.id === job.buildingId);
      const worker = workers.find((w) => w.id === job.workerId);
      const searchText = [
        building?.name || '',
        building?.address || '',
        worker?.email || '',
        job.id || '',
      ]
        .join(' ')
        .toLowerCase();

      if (!searchText.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedJob(null);
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'in_progress':
        return '#007bff';
      case 'scheduled':
        return '#ffc107';
      case 'cancelled':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getStatusText = (status: JobStatus) => {
    switch (status) {
      case 'completed':
        return '완료';
      case 'in_progress':
        return '진행중';
      case 'scheduled':
        return '예정';
      case 'cancelled':
        return '취소';
      default:
        return status;
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>{error}</div>;
  }

  return (
    <>
      <BackToDashboard />
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ color: '#333', marginBottom: '30px' }}>
          서비스 이력 관리
        </h1>

        {/* Filters */}
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
              Client 선택:
            </label>
            <select
              onChange={(e) => setSelectedClientId(e.target.value)}
              value={selectedClientId}
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
              상태 필터:
            </label>
            <select
              onChange={(e) =>
                setStatusFilter(e.target.value as JobStatus | 'all')
              }
              value={statusFilter}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <option value="all">모든 상태</option>
              <option value="scheduled">예정</option>
              <option value="in_progress">진행중</option>
              <option value="completed">완료</option>
              <option value="cancelled">취소</option>
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

          <div style={{ gridColumn: '1 / -1' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold',
              }}
            >
              검색:
            </label>
            <input
              type="text"
              placeholder="건물명, 주소, Worker 이메일, 작업 ID로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            />
          </div>
        </div>

        {/* Summary */}
        <div
          style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#e9ecef',
            borderRadius: '8px',
          }}
        >
          <h3 style={{ margin: '0 0 10px 0' }}>
            필터 결과: {filteredJobs.length}건
          </h3>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <span>
              완료:{' '}
              {filteredJobs.filter((j) => j.status === 'completed').length}건
            </span>
            <span>
              진행중:{' '}
              {filteredJobs.filter((j) => j.status === 'in_progress').length}건
            </span>
            <span>
              예정:{' '}
              {filteredJobs.filter((j) => j.status === 'scheduled').length}건
            </span>
            <span>
              취소:{' '}
              {filteredJobs.filter((j) => j.status === 'cancelled').length}건
            </span>
          </div>
        </div>

        {/* Service History List */}
        {filteredJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <h3>표시할 서비스 이력이 없습니다.</h3>
            <p>필터 조건을 변경해보세요.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {filteredJobs.map((job) => {
              const building = buildings.find((b) => b.id === job.buildingId);
              const worker = workers.find((w) => w.id === job.workerId);

              return (
                <div
                  key={job.id}
                  onClick={() => handleJobClick(job)}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '20px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      '0 4px 8px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '15px',
                    }}
                  >
                    <div>
                      <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>
                        {building?.name || '건물 정보 없음'}
                      </h3>
                      <p
                        style={{ margin: '0', color: '#666', fontSize: '14px' }}
                      >
                        {building?.address || '주소 정보 없음'}
                      </p>
                    </div>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: getStatusColor(job.status),
                      }}
                    >
                      {getStatusText(job.status)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '10px',
                      fontSize: '14px',
                    }}
                  >
                    <div>
                      <strong>Worker:</strong> {worker?.email || '정보 없음'}
                    </div>
                    <div>
                      <strong>작업 ID:</strong> {job.id?.slice(0, 8)}...
                    </div>
                    <div>
                      <strong>생성일:</strong>{' '}
                      {job.createdAt?.toDate().toLocaleDateString('ko-KR')}
                    </div>
                    {job.completedAt && (
                      <div>
                        <strong>완료일:</strong>{' '}
                        {job.completedAt.toDate().toLocaleDateString('ko-KR')}
                      </div>
                    )}
                    <div>
                      <strong>완료율:</strong> {job.completionRate || 0}%
                    </div>
                    {job.startedAt && job.completedAt && (
                      <div>
                        <strong>작업시간:</strong>{' '}
                        {Math.round(
                          (job.completedAt.toDate().getTime() -
                            job.startedAt.toDate().getTime()) /
                            (1000 * 60)
                        )}
                        분
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal for Job Details */}
        {showModal && selectedJob && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
            onClick={closeModal}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '30px',
                maxWidth: '800px',
                maxHeight: '90vh',
                overflow: 'auto',
                width: '90%',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <h2 style={{ margin: 0, color: '#333' }}>서비스 이력 상세</h2>
                <button
                  onClick={closeModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666',
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {/* Basic Info */}
                <div
                  style={{
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                  }}
                >
                  <h3 style={{ margin: '0 0 15px 0' }}>기본 정보</h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <strong>작업 ID:</strong> {selectedJob.id}
                    </div>
                    <div>
                      <strong>건물:</strong>{' '}
                      {buildings.find((b) => b.id === selectedJob.buildingId)
                        ?.name || '정보 없음'}
                    </div>
                    <div>
                      <strong>Worker:</strong>{' '}
                      {workers.find((w) => w.id === selectedJob.workerId)
                        ?.email || '정보 없음'}
                    </div>
                    <div>
                      <strong>상태:</strong>
                      <span
                        style={{
                          marginLeft: '8px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          color: 'white',
                          fontSize: '12px',
                          backgroundColor: getStatusColor(selectedJob.status),
                        }}
                      >
                        {getStatusText(selectedJob.status)}
                      </span>
                    </div>
                    <div>
                      <strong>완료율:</strong> {selectedJob.completionRate || 0}
                      %
                    </div>
                    <div>
                      <strong>생성일:</strong>{' '}
                      {selectedJob.createdAt?.toDate().toLocaleString('ko-KR')}
                    </div>
                    {selectedJob.startedAt && (
                      <div>
                        <strong>시작시간:</strong>{' '}
                        {selectedJob.startedAt.toDate().toLocaleString('ko-KR')}
                      </div>
                    )}
                    {selectedJob.completedAt && (
                      <div>
                        <strong>완료일:</strong>{' '}
                        {selectedJob.completedAt
                          .toDate()
                          .toLocaleString('ko-KR')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Areas */}
                {selectedJob.areas && selectedJob.areas.length > 0 && (
                  <div
                    style={{
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                    }}
                  >
                    <h3 style={{ margin: '0 0 15px 0' }}>청소 영역</h3>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {selectedJob.areas.map((area, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '10px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span>
                              <strong>{area}</strong>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photos */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                  }}
                >
                  {/* Before Photos */}
                  {selectedJob.beforePhotos &&
                    selectedJob.beforePhotos.length > 0 && (
                      <div
                        style={{
                          padding: '15px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '8px',
                        }}
                      >
                        <h3 style={{ margin: '0 0 15px 0' }}>청소 전 사진</h3>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              'repeat(auto-fit, minmax(100px, 1fr))',
                            gap: '10px',
                          }}
                        >
                          {selectedJob.beforePhotos.map((photo, index) => (
                            <img
                              key={index}
                              src={photo}
                              alt={`청소 전 ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '100px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                              onClick={() => window.open(photo, '_blank')}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  {/* After Photos */}
                  {selectedJob.afterPhotos &&
                    selectedJob.afterPhotos.length > 0 && (
                      <div
                        style={{
                          padding: '15px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '8px',
                        }}
                      >
                        <h3 style={{ margin: '0 0 15px 0' }}>청소 후 사진</h3>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              'repeat(auto-fit, minmax(100px, 1fr))',
                            gap: '10px',
                          }}
                        >
                          {selectedJob.afterPhotos.map((photo, index) => (
                            <img
                              key={index}
                              src={photo}
                              alt={`청소 후 ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '100px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                              onClick={() => window.open(photo, '_blank')}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                </div>

                {/* Worker Message */}
                {selectedJob.workerNotes && (
                  <div
                    style={{
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                    }}
                  >
                    <h3 style={{ margin: '0 0 15px 0' }}>Worker 메시지</h3>
                    <p
                      style={{
                        margin: 0,
                        padding: '10px',
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                      }}
                    >
                      {selectedJob.workerNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ServiceHistoryManagementScreen;
