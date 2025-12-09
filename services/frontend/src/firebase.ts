/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if configuration is present
// Check if configuration is present and valid (not placeholders)
const isConfigured =
    !!import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_API_KEY !== 'PLACEHOLDER' &&
    import.meta.env.VITE_FIREBASE_API_KEY !== 'v0-firebase-api-key' &&
    !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FORCE_MOCK_MODE !== 'true';

import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';

// ... (config)

let app;
let auth: Auth | undefined;
let db: Firestore | undefined;
let googleProvider: GoogleAuthProvider | undefined;

if (isConfigured) {

    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        googleProvider = new GoogleAuthProvider();
        console.log("Firebase initialized successfully");
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        // Fallback to nulls if init fails despite keys
    }
} else {
    console.log("Firebase credentials not found. Using Mock Mode.");
}

export { auth, db, googleProvider, isConfigured };
