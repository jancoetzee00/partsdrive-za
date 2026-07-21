import { collection, getDocs, doc, setDoc, query, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { INITIAL_MOCK_PARTS } from '../data/mockParts';

export async function seedDatabaseIfNeeded(): Promise<void> {
  let querySnapshot;
  try {
    const partsCollection = collection(db, 'parts');
    // Query with a limit of 1 to see if we have any data
    const q = query(partsCollection, limit(1));
    querySnapshot = await getDocs(q);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'parts');
  }

  if (querySnapshot.empty) {
    console.log('Firestore is empty. Seeding initial parts marketplace data...');
    
    // Seed parts
    for (const part of INITIAL_MOCK_PARTS) {
      try {
        await setDoc(doc(db, 'parts', part.id), {
          ...part,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `parts/${part.id}`);
      }
    }
    
    console.log('Marketplace data seeded successfully!');
  } else {
    console.log('Firestore already contains data. Skipping seeding.');
  }
}

