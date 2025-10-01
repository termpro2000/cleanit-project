import React, { useState, useEffect } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import app from '../firebase';
import { Building } from '../types';

const db = getFirestore(app);

interface ClientBuildingListProps {
  clientId: string;
}

const ClientBuildingList: React.FC<ClientBuildingListProps> = ({
  clientId,
}) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setError('Client ID가 제공되지 않았습니다.');
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'buildings'),
      where('ownerId', '==', clientId)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const fetchedBuildings: Building[] = [];
        querySnapshot.forEach((doc) => {
          fetchedBuildings.push({ id: doc.id, ...doc.data() } as Building);
        });
        setBuildings(fetchedBuildings);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching buildings:', err);
        setError('건물 목록을 불러오는데 실패했습니다.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId]);

  if (loading) {
    return (
      <div>
        <p>건물 목록 로딩 중...</p>
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

  if (buildings.length === 0) {
    return (
      <div>
        <p>등록된 건물이 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <h3>Client ({clientId}) 건물 목록</h3>
      <ul>
        {buildings.map((building) => (
          <li key={building.id}>
            {building.name} - {building.address}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ClientBuildingList;
