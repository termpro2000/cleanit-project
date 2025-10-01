import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import app from '../firebase';
import { User } from '../../shared/types';

const db = getFirestore(app);
const auth = getAuth(app);

export const updateUserProfile = async (updatedData: Partial<User>): Promise<void> => {
  const firebaseUser = auth.currentUser;

  if (!firebaseUser) {
    throw new Error('No user logged in.');
  }

  try {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    await updateDoc(userDocRef, updatedData);
    console.log('User profile updated successfully!');
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};