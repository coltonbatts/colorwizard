import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isConfigValid = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'undefined';

// Getter functions to avoid initialization during build-time module evaluation
export function getFirebaseApp() {
    try {
        if (getApps().length > 0) return getApp();
        if (isConfigValid) return initializeApp(firebaseConfig);
        return null;
    } catch (error) {
        console.warn('Firebase app initialization failed:', error);
        return null;
    }
}

export function getFirestoreDb() {
    try {
        const app = getFirebaseApp();
        return app ? getFirestore(app) : null;
    } catch (error) {
        console.warn('Firestore initialization failed:', error);
        return null;
    }
}

export function getFirebaseAuth() {
    try {
        const app = getFirebaseApp();
        return app ? getAuth(app) : null;
    } catch (error) {
        console.warn('Firebase Auth initialization failed:', error);
        return null;
    }
}
