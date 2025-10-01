import * as admin from 'firebase-admin';
import { User, Company, Building } from '../shared/types'; // Assuming types are in shared folder

// Initialize Firebase Admin SDK
// GOOGLE_APPLICATION_CREDENTIALS environment variable should be set to the path of your serviceAccountKey.json
admin.initializeApp();

const db = admin.firestore();

async function seedDatabase() {
  try {
    console.log('Starting to seed database...');

    // Create a Company
    const companyRef = await db.collection('companies').add({
      name: 'CleanIT Corp',
      managerId: '', // Will be updated after manager is created
      address: '123 Clean St, Suite 100, San Francisco, CA 94105',
      phone: '415-555-1234',
      workerCount: 0,
      buildingCount: 0,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as Omit<Company, 'monthlyRevenue'>);
    console.log('Created company with ID:', companyRef.id);

    // Create a Manager User
    const managerUser: Omit<User, 'clientInfo' | 'workerInfo'> = {
      role: 'manager',
      email: 'manager@cleanit.com',
      phone: '415-555-0001',
      isActive: true,
      isVerified: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      managerInfo: {
        name: 'Alice Manager',
        companyId: companyRef.id,
        companyAddress: '123 Clean St, Suite 100, San Francisco, CA 94105',
      },
    };
    const managerRef = await db.collection('users').add(managerUser);
    console.log('Created manager with ID:', managerRef.id);

    // Update company with managerId
    await companyRef.update({ managerId: managerRef.id });

    // Create a Worker User
    const workerUser: Omit<User, 'clientInfo' | 'managerInfo'> = {
      role: 'worker',
      email: 'worker@cleanit.com',
      phone: '415-555-0002',
      isActive: true,
      isVerified: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      workerInfo: {
        bankName: 'Bank of America',
        accountNumber: '123456789', // Encrypted in a real app
        companyId: companyRef.id,
      },
    };
    const workerRef = await db.collection('users').add(workerUser);
    console.log('Created worker with ID:', workerRef.id);

    // Create a Client User
    const clientUser: Omit<User, 'workerInfo' | 'managerInfo'> = {
      role: 'client',
      email: 'client@example.com',
      phone: '415-555-0003',
      isActive: true,
      isVerified: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      clientInfo: {
        address: '555 Client Ave, San Francisco, CA 94102',
      },
    };
    const clientRef = await db.collection('users').add(clientUser);
    console.log('Created client with ID:', clientRef.id);

    // Create a Building
    const building: Omit<Building, 'companyId'> = {
      name: 'The Grand Office Building',
      address: '101 Market Street, San Francisco, CA 94103',
      contact: {
        name: 'Building Front Desk',
        phone: '415-555- edificio',
        address: '101 Market Street, San Francisco, CA 94103',
      },
      floors: {
        basement: 1,
        ground: 10,
        total: 11,
        hasElevator: true,
      },
      parking: {
        available: true,
        spaces: 50,
      },
      ownerId: clientRef.id,
      cleaningAreas: ['Lobby', 'Floors 1-5', 'Restrooms', 'Elevators'],
      specialNotes: 'Please use eco-friendly cleaning products.',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const buildingRef = await db.collection('buildings').add(building);
    console.log('Created building with ID:', buildingRef.id);

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDatabase();
