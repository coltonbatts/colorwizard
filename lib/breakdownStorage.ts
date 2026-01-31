import { getFirestoreDb } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';

export interface LayerState {
    step: string;
    data: string; // Base64 encoded or path (currently planning to store metadata/DNA)
    dna: any[];
}

export interface LayerBreakdownDoc {
    id?: string;
    imageName: string;
    createdAt: any;
    layers: LayerState[];
}

export async function saveLayerBreakdown(breakdown: Omit<LayerBreakdownDoc, 'createdAt'>) {
    const db = getFirestoreDb();
    if (!db) throw new Error('Database not initialized');
    try {
        const docRef = await addDoc(collection(db, 'layer_breakdowns'), {
            ...breakdown,
            createdAt: Timestamp.now(),
        });
        return docRef.id;
    } catch (e) {
        console.error('Error adding document: ', e);
        throw e;
    }
}

export async function getLayerBreakdowns() {
    const db = getFirestoreDb();
    if (!db) return [];
    const q = query(collection(db, 'layer_breakdowns'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as LayerBreakdownDoc[];
}
