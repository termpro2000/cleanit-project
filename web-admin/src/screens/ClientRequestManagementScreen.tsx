import React, { useState, useEffect } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import app from '../firebase';
import { Request, User } from '../types';
import BackToDashboard from '../components/BackToDashboard';

const db = getFirestore(app);

const ClientRequestManagementScreen: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [managerNotes, setManagerNotes] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    // Fetch Requests
    const requestsQuery = query(collection(db, 'requests'));
    const unsubscribeRequests = onSnapshot(
      requestsQuery,
      (querySnapshot) => {
        const fetchedRequests: Request[] = [];
        querySnapshot.forEach((doc) => {
          fetchedRequests.push({ id: doc.id, ...doc.data() } as Request);
        });
        setRequests(fetchedRequests);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching requests:', err);
        setError('요청 목록을 불러오는데 실패했습니다.');
        setLoading(false);
      }
    );

    // Fetch Workers for assignment
    const workersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'worker')
    );
    const unsubscribeWorkers = onSnapshot(
      workersQuery,
      (querySnapshot) => {
        const fetchedWorkers: User[] = [];
        querySnapshot.forEach((doc) => {
          fetchedWorkers.push({ id: doc.id, ...doc.data() } as User);
        });
        setWorkers(fetchedWorkers);
      },
      (err) => {
        console.error('Error fetching workers:', err);
      }
    );

    return () => {
      unsubscribeRequests();
      unsubscribeWorkers();
    };
  }, []);

  // Filter and sort requests
  useEffect(() => {
    let filtered = [...requests];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((req) => req.priority === priorityFilter);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (req) =>
          req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 3, high: 2, normal: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'status':
          return a.status.localeCompare(b.status);
        case 'createdAt':
        default:
          return b.createdAt.toMillis() - a.createdAt.toMillis();
      }
    });

    setFilteredRequests(filtered);
  }, [requests, statusFilter, priorityFilter, searchTerm, sortBy]);

  useEffect(() => {
    if (selectedRequestId) {
      const req = requests.find((r) => r.id === selectedRequestId);
      setSelectedRequest(req || null);
      setNewStatus(req?.status || '');
      setManagerNotes(req?.response?.notes || '');
    } else {
      setSelectedRequest(null);
      setNewStatus('');
      setManagerNotes('');
    }
  }, [selectedRequestId, requests]);

  const handleUpdateRequest = async () => {
    if (!selectedRequest || !selectedRequestId) return;

    try {
      const requestDocRef = doc(db, 'requests', selectedRequestId);
      const updateData: any = {
        status: newStatus,
        response: {
          status: newStatus,
          notes: managerNotes,
          completedAt: Timestamp.now(),
        },
      };

      // Add worker assignment if selected
      if (selectedWorkerId) {
        updateData.assignedTo = {
          ...selectedRequest.assignedTo,
          workerId: selectedWorkerId,
        };
      }

      await updateDoc(requestDocRef, updateData);
      alert('요청 상태가 업데이트되었습니다.');
      setSelectedRequestId(null); // Close details view
      setSelectedWorkerId(''); // Reset worker selection
    } catch (err: any) {
      console.error('Error updating request:', err);
      alert('요청 업데이트 실패: ' + err.message);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#ff4444';
      case 'high':
        return '#ff8800';
      case 'normal':
        return '#4CAF50';
      default:
        return '#666';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#ffa500';
      case 'assigned':
        return '#2196f3';
      case 'in_progress':
        return '#ff9800';
      case 'completed':
        return '#4caf50';
      case 'cancelled':
        return '#f44336';
      default:
        return '#666';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Client 요청사항 관리</h1>
        <p>데이터를 로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Client 요청사항 관리</h1>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <>
      <BackToDashboard />
      <div style={{ padding: '20px' }}>
        <h1>Client 요청사항 관리</h1>

        {/* Filters and Search */}
        <div
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px',
          }}
        >
          <h3>필터 및 검색</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
            }}
          >
            <div>
              <label>검색:</label>
              <input
                type="text"
                placeholder="제목 또는 내용 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              />
            </div>
            <div>
              <label>상태 필터:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              >
                <option value="all">모든 상태</option>
                <option value="pending">대기중</option>
                <option value="assigned">배정됨</option>
                <option value="in_progress">진행중</option>
                <option value="completed">완료됨</option>
                <option value="cancelled">취소됨</option>
              </select>
            </div>
            <div>
              <label>우선순위 필터:</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              >
                <option value="all">모든 우선순위</option>
                <option value="urgent">긴급</option>
                <option value="high">높음</option>
                <option value="normal">보통</option>
              </select>
            </div>
            <div>
              <label>정렬:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              >
                <option value="createdAt">생성일시</option>
                <option value="priority">우선순위</option>
                <option value="status">상태</option>
              </select>
            </div>
          </div>
        </div>

        {/* Request Summary */}
        <div
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px',
          }}
        >
          <h3>요청 현황</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px',
            }}
          >
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#2196F3',
                }}
              >
                {filteredRequests.length}
              </div>
              <div style={{ color: '#666' }}>총 요청</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#ff4444',
                }}
              >
                {filteredRequests.filter((r) => r.priority === 'urgent').length}
              </div>
              <div style={{ color: '#666' }}>긴급</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#ffa500',
                }}
              >
                {filteredRequests.filter((r) => r.status === 'pending').length}
              </div>
              <div style={{ color: '#666' }}>대기중</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#4caf50',
                }}
              >
                {
                  filteredRequests.filter((r) => r.status === 'completed')
                    .length
                }
              </div>
              <div style={{ color: '#666' }}>완료됨</div>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px',
          }}
        >
          <h3>요청 목록</h3>
          {filteredRequests.length === 0 ? (
            <p>표시할 요청이 없습니다.</p>
          ) : (
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
                    <th style={{ padding: '12px', textAlign: 'left' }}>제목</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>
                      우선순위
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>
                      상태
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>
                      생성일
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>
                      배정된 Worker
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request, index) => (
                    <tr
                      key={request.id}
                      style={{
                        borderBottom: '1px solid #eee',
                        backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <strong>{request.title}</strong>
                        <br />
                        <small style={{ color: '#666' }}>
                          {request.content.substring(0, 50)}...
                        </small>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span
                          style={{
                            color: getPriorityColor(request.priority),
                            fontWeight: 'bold',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: `${getPriorityColor(request.priority)}20`,
                          }}
                        >
                          {request.priority}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span
                          style={{
                            color: getStatusColor(request.status),
                            fontWeight: 'bold',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: `${getStatusColor(request.status)}20`,
                          }}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {request.createdAt.toDate().toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {request.assignedTo?.workerId
                          ? workers
                              .find(
                                (w) => w.id === request.assignedTo?.workerId
                              )
                              ?.email?.split('@')[0] || '알 수 없음'
                          : '미배정'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedRequestId(request.id || '')}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          관리
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Request Detail Modal */}
        {selectedRequest && (
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
          >
            <div
              style={{
                background: 'white',
                padding: '30px',
                borderRadius: '8px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
            >
              <h2>{selectedRequest.title}</h2>

              <div style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    marginBottom: '15px',
                  }}
                >
                  <div>
                    <strong>우선순위:</strong>
                    <span
                      style={{
                        color: getPriorityColor(selectedRequest.priority),
                        fontWeight: 'bold',
                        marginLeft: '10px',
                      }}
                    >
                      {selectedRequest.priority}
                    </span>
                  </div>
                  <div>
                    <strong>현재 상태:</strong>
                    <span
                      style={{
                        color: getStatusColor(selectedRequest.status),
                        fontWeight: 'bold',
                        marginLeft: '10px',
                      }}
                    >
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <strong>내용:</strong>
                  <p
                    style={{
                      marginTop: '5px',
                      padding: '10px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                    }}
                  >
                    {selectedRequest.content}
                  </p>
                </div>

                {selectedRequest.location && (
                  <div style={{ marginBottom: '15px' }}>
                    <strong>위치:</strong> {selectedRequest.location}
                  </div>
                )}

                <div style={{ marginBottom: '15px' }}>
                  <strong>생성일:</strong>{' '}
                  {selectedRequest.createdAt.toDate().toLocaleString()}
                </div>

                {selectedRequest.photos &&
                  selectedRequest.photos.length > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                      <strong>첨부 사진:</strong>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fill, minmax(100px, 1fr))',
                          gap: '10px',
                          marginTop: '10px',
                        }}
                      >
                        {selectedRequest.photos.map((photoUrl, index) => (
                          <img
                            key={index}
                            src={photoUrl}
                            alt={`첨부 사진 ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '100px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                            onClick={() => window.open(photoUrl, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <h3>요청 관리</h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '15px',
                    marginBottom: '15px',
                  }}
                >
                  <div>
                    <label>상태 변경:</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                      }}
                    >
                      <option value="">상태 선택</option>
                      <option value="pending">대기중</option>
                      <option value="assigned">배정됨</option>
                      <option value="in_progress">진행중</option>
                      <option value="completed">완료됨</option>
                      <option value="cancelled">취소됨</option>
                    </select>
                  </div>

                  <div>
                    <label>Worker 배정:</label>
                    <select
                      value={selectedWorkerId}
                      onChange={(e) => setSelectedWorkerId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                      }}
                    >
                      <option value="">Worker 선택</option>
                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.email.split('@')[0]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label>관리자 메모:</label>
                  <textarea
                    placeholder="처리 내용이나 특이사항을 입력하세요..."
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'flex-end',
                  }}
                >
                  <button
                    onClick={() => setSelectedRequestId(null)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#666',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleUpdateRequest}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    업데이트
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ClientRequestManagementScreen;
