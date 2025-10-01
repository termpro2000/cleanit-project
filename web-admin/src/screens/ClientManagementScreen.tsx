import React, { useState, useEffect } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import app from '../firebase';
import { User } from '../types';
import ClientBuildingList from '../components/ClientBuildingList';
import BackToDashboard from '../components/BackToDashboard';

const db = getFirestore(app);

const ClientManagementScreen: React.FC = () => {
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'client'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedClients: User[] = [];
        querySnapshot.forEach((doc) => {
          fetchedClients.push({ id: doc.id, ...doc.data() } as User);
        });
        setClients(fetchedClients);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching clients:', err);
        setError('Client 목록을 불러오는데 실패했습니다.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div>
        <p>Client 목록 로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div>
        <p>등록된 Client가 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <BackToDashboard />
      <div>
        <h1>Client 관리</h1>
        {clients.map((client) => (
          <div
            key={client.id}
            style={{
              border: '1px solid #ccc',
              padding: '10px',
              marginBottom: '10px',
            }}
          >
            <h2>{client.email}</h2>
            <p>역할: {client.role}</p>
            {client.id && <ClientBuildingList clientId={client.id} />}
          </div>
        ))}
      </div>
    </>
  );
};

export default ClientManagementScreen;
