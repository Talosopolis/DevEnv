/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore, Firestore, collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { LessonPlan, Note, User, Conversation } from '../types';

import { isConfigured, firebaseConfig } from '../firebase';
// const firebaseConfig = { ... } // Removed duplicate definition
// const isConfigured = ... // Removed duplicate definition

export interface DatabaseInterface {
    // Auth
    signInWithGoogle(): Promise<User>;
    mockLogin(email: string): Promise<User>;
    signOut(): Promise<void>;
    subscribeToAuth(callback: (user: User | null) => void): () => void;

    // User
    createUser(name: string, role: 'student' | 'teacher'): Promise<User>;
    updateUserProfile(userId: string, updates: Partial<User>): Promise<User>;
    checkUsernameAvailability(username: string): Promise<boolean>;
    getUser(userId: string): Promise<User | null>;

    // Data
    getPublicPlans(): Promise<LessonPlan[]>;
    getUserPlans(userId: string): Promise<LessonPlan[]>;
    createPlan(plan: LessonPlan): Promise<void>;
    updatePlan(id: string, updates: Partial<LessonPlan>): Promise<void>;
    deletePlan(id: string): Promise<void>;

    getNotes(userId?: string): Promise<Note[]>;
    createNote(note: Note): Promise<void>;
    updateNote(id: string, updates: Partial<Note>): Promise<void>;
    deleteNote(id: string): Promise<void>;
}

/**
 * MOCK DATABASE IMPLEMENTATION
 */
class MockDatabaseService implements DatabaseInterface {
    private users: User[] = [];
    private lessonPlans: LessonPlan[] = [];
    private notes: Note[] = [];

    // Mock Data Seeds
    private SEED_USERS: User[] = [
        {
            id: 'u1', name: 'Demo Teacher', email: 'teacher@demo.com', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
            role: 'teacher', createdAt: '2023-01-01', onboardingCompleted: true, ageBracket: '18+', continent: 'North America', interests: ['Education', 'History'], bio: 'A passionate history teacher.', agreedToEULA: true, agreedToAIUPI: true
        },
        {
            id: 'u2', name: 'Demo Student', email: 'student@demo.com', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka', username: 'aneka_codes',
            role: 'student', createdAt: '2023-01-02', onboardingCompleted: true, ageBracket: '13-17', gradeLevel: '10th Grade', continent: 'Europe', interests: ['Gaming', 'Coding'], bio: 'Learning to code!', agreedToEULA: true, agreedToAIUPI: true
        }
    ];

    private SEED_PLANS: any[] = [
        {
            id: "1", title: "Introduction to Photosynthesis", subject: "Biology", grade: "8th Grade", description: "Learn how plants convert sunlight into energy through photosynthesis.",
            objectives: ["Understand the process of photosynthesis", "Identify the key components needed for photosynthesis"],
            materials: ["Plant samples", "Microscope"], activities: ["Video presentation", "Hands-on observation"], duration: "60 minutes", teacherName: "Ms. Johnson", createdAt: "2025-10-20", isPublic: true, ownerId: 'u1'
        },
        {
            id: "3", title: "Advanced Algebra Test Prep", subject: "Mathematics", grade: "11th Grade", description: "Private study group material.",
            objectives: ["Review Quadratic Formula"], materials: ["None"], activities: ["Mock Test"], duration: "90 minutes", teacherName: "Demo Teacher", createdAt: "2025-10-22", isPublic: false, ownerId: 'u1'
        }
    ];

    constructor() {
        this.load();
    }

    private load() {
        const storedUsers = localStorage.getItem('mock_users');
        this.users = storedUsers ? JSON.parse(storedUsers) : this.SEED_USERS;
        if (!storedUsers) this.saveUsers();

        const storedPlans = localStorage.getItem('mock_plans');
        this.lessonPlans = storedPlans ? JSON.parse(storedPlans) : this.SEED_PLANS;
        if (!storedPlans) this.savePlans();

        const storedNotes = localStorage.getItem('mock_notes');
        this.notes = storedNotes ? JSON.parse(storedNotes) : [];
    }

    private saveUsers() { localStorage.setItem('mock_users', JSON.stringify(this.users)); }
    private savePlans() { localStorage.setItem('mock_plans', JSON.stringify(this.lessonPlans)); }
    private saveNotes() { localStorage.setItem('mock_notes', JSON.stringify(this.notes)); }

    async signInWithGoogle(): Promise<User> {
        await new Promise(resolve => setTimeout(resolve, 800));
        return this.users[0];
    }

    async mockLogin(email: string): Promise<User> {
        await new Promise(resolve => setTimeout(resolve, 500));
        const user = this.users.find(u => u.email === email);
        if (!user) throw new Error("User not found");
        return user;
    }

    async signOut(): Promise<void> {
        this.users = this.SEED_USERS; // Reset or logic? keeping simple.
        return Promise.resolve();
    }

    subscribeToAuth(callback: (user: User | null) => void): () => void {
        // Mock doesn't really have "background" auth changes usually, but we could simulate check.
        // For now, we trust explicit signIn calls update state in consumer, 
        // OR we should manage state here.
        // AuthContext mainly manages state.
        return () => { };
    }

    async createUser(name: string, role: 'student' | 'teacher'): Promise<User> {
        await new Promise(resolve => setTimeout(resolve, 800));
        const newUser: User = {
            id: 'u' + Date.now(), name, email: `${name.toLowerCase().replace(' ', '.')}@demo.com`,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`, role, createdAt: new Date().toISOString(), onboardingCompleted: false
        };
        this.users.push(newUser);
        this.saveUsers();
        return newUser;
    }

    async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
        await new Promise(resolve => setTimeout(resolve, 500));
        let userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) throw new Error("User not found");

        if (updates.username) {
            const isTaken = this.users.some(u => u.username === updates.username && u.id !== userId);
            if (isTaken) throw new Error("Username already taken");
        }

        const updatedUser = { ...this.users[userIndex], ...updates };
        this.users[userIndex] = updatedUser;
        this.saveUsers();
        return updatedUser;
    }

    async checkUsernameAvailability(username: string): Promise<boolean> {
        await new Promise(resolve => setTimeout(resolve, 300));
        if (!username || username.length < 3) return false;
        const normalized = username.toLowerCase();
        return !this.users.some(u => u.username?.toLowerCase() === normalized);
    }

    async getUser(userId: string): Promise<User | null> {
        return this.users.find(u => u.id === userId) || null;
    }

    async getPublicPlans(): Promise<LessonPlan[]> { return this.lessonPlans.filter(p => p.isPublic); }
    async getUserPlans(userId: string): Promise<LessonPlan[]> { return this.lessonPlans.filter(p => p.ownerId === userId); }
    async createPlan(plan: LessonPlan): Promise<void> { this.lessonPlans.unshift(plan); this.savePlans(); }
    async updatePlan(id: string, updates: Partial<LessonPlan>): Promise<void> {
        this.lessonPlans = this.lessonPlans.map(p => p.id === id ? { ...p, ...updates } : p);
        this.savePlans();
    }
    async deletePlan(id: string): Promise<void> {
        this.lessonPlans = this.lessonPlans.filter(p => p.id !== id);
        this.savePlans();
    }

    async getNotes(userId?: string): Promise<Note[]> {
        if (!userId) return this.notes.filter(n => n.isPublic);
        return this.notes.filter(n => n.ownerId === userId || n.isPublic);
    }
    async createNote(note: Note): Promise<void> { this.notes.push(note); this.saveNotes(); }
    async updateNote(id: string, updates: Partial<Note>): Promise<void> {
        this.notes = this.notes.map(n => n.id === id ? { ...n, ...updates } : n);
        this.saveNotes();
    }
    async deleteNote(id: string): Promise<void> {
        this.notes = this.notes.filter(n => n.id !== id);
        this.saveNotes();
    }
}

/**
 * FIREBASE DATABASE IMPLEMENTATION
 */
class FirebaseDatabaseService implements DatabaseInterface {
    private auth: Auth;
    private db: Firestore;
    private googleProvider: GoogleAuthProvider;

    constructor() {
        const app = initializeApp(firebaseConfig);
        this.auth = getAuth(app);
        this.db = getFirestore(app);
        this.googleProvider = new GoogleAuthProvider();
    }

    async signInWithGoogle(): Promise<User> {
        console.log("STEP 1: Starting Google Sign In Popup...");
        try {
            const result = await signInWithPopup(this.auth, this.googleProvider);
            console.log("STEP 2: Popup Complete. User:", result.user.email);
            const firebaseUser = result.user;

            // Timeout helper
            const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
                return new Promise((resolve, reject) => {
                    const timer = setTimeout(() => {
                        console.warn(`Timeout waiting for ${label}`);
                        reject(new Error(`Timeout: ${label}`));
                    }, ms);

                    promise
                        .then(value => {
                            clearTimeout(timer);
                            resolve(value);
                        })
                        .catch(err => {
                            clearTimeout(timer);
                            reject(err);
                        });
                });
            };

            // Check if user exists in DB, if not create basic record
            console.log("STEP 3: Checking Firestore Profile...");
            let userDoc;
            try {
                // Wait max 4 seconds for Firestore. If it hangs (e.g. not enabled, rules block), fail fast.
                userDoc = await withTimeout(
                    getDoc(doc(this.db, "users", firebaseUser.uid)),
                    4000,
                    "Firestore Profile Check"
                );

                console.log("STEP 4: Firestore Check Complete. Exists:", userDoc.exists());

                if (userDoc.exists()) {
                    console.log("STEP 5: Returning existing user.");
                    return userDoc.data() as User;
                }
            } catch (fsError) {
                console.warn("Firestore offline/failed/timed-out during sign-in:", fsError);
                console.log("STEP 4 (Fallback): Continuing without Firestore profile...");
            }

            console.log("STEP 5: Creating/Returning new user stub...");
            // New User or Fallback - return minimal user object
            const newUser: User = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'User',
                email: firebaseUser.email || '',
                avatarUrl: firebaseUser.photoURL || '',
                role: 'undecided', // Triggers onboarding
                createdAt: new Date().toISOString(),
                onboardingCompleted: false
            };

            // Try to save to DB, but ignore if it fails
            try {
                // Also timeout the save
                await withTimeout(
                    setDoc(doc(this.db, "users", firebaseUser.uid), newUser),
                    3000,
                    "Firestore Profile Create"
                );
                console.log("STEP 6: User Stub Saved to DB");
            } catch (dbSaveError) {
                console.warn("Could not save user to DB (Offline/Timeout):", dbSaveError);
            }

            return newUser;

        } catch (error) {
            console.error("Critical Error in signInWithGoogle:", error);
            throw error;
        }
    }

    async mockLogin(email: string): Promise<User> {
        console.warn("Using Mock Login Bypass in Live Mode");
        // Create a stub user for bypass
        return {
            id: 'bypass-' + Date.now(),
            name: 'Initiator',
            email: email,
            avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=Initiator',
            role: 'student',
            createdAt: new Date().toISOString(),
            onboardingCompleted: true,
            bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
        };
    }

    async signOut(): Promise<void> {
        await firebaseSignOut(this.auth);
    }

    subscribeToAuth(callback: (user: User | null) => void): () => void {
        return this.auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Fetch full profile
                    const userDoc = await getDoc(doc(this.db, "users", firebaseUser.uid));
                    if (userDoc.exists()) {
                        callback(userDoc.data() as User);
                    } else {
                        // Fallback if doc missing
                        throw new Error("Doc missing");
                    }
                } catch (e) {
                    console.warn("Firestore unavailable or blocking:", e);
                    // Fallback to basic auth info so user can at least see UI
                    callback({
                        id: firebaseUser.uid,
                        name: firebaseUser.displayName || "User",
                        email: firebaseUser.email || "",
                        avatarUrl: firebaseUser.photoURL || "",
                        role: 'undecided',
                        createdAt: new Date().toISOString(),
                        onboardingCompleted: false
                    });
                }
            } else {
                callback(null);
            }
        });
    }

    async createUser(name: string, role: 'student' | 'teacher'): Promise<User> {
        // This is primarily for the manual/mock flow. In Firebase, users are created via Auth Providers.
        // If we supported email/password sign up, we'd do it here.
        // For now, we'll assume this is only called if manually creating a mock user in a mixed env, or throw.
        throw new Error("Manual user creation not implemented for Firebase (Use Google Sign In)");
    }

    async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
        // Check username uniqueness if changing
        if (updates.username) {
            const isTaken = await this.checkUsernameAvailability(updates.username);
            // We need to double check if the taken username belongs to THIS user (if we didn't filter in query)
            // But checkUsernameAvailability checks ALL documents.
            // Optimized query:
            const q = query(collection(this.db, "users"), where("username", "==", updates.username));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const existing = snapshot.docs[0];
                if (existing.id !== userId) throw new Error("Username already taken");
            }
        }

        const userRef = doc(this.db, "users", userId);
        await updateDoc(userRef, updates);

        const updatedSnap = await getDoc(userRef);
        return updatedSnap.data() as User;
    }

    async checkUsernameAvailability(username: string): Promise<boolean> {
        if (!username || username.length < 3) return false;
        const q = query(collection(this.db, "users"), where("username", "==", username));
        const snapshot = await getDocs(q);
        return snapshot.empty;
    }

    async getUser(userId: string): Promise<User | null> {
        const d = await getDoc(doc(this.db, "users", userId));
        return d.exists() ? d.data() as User : null;
    }

    // Plans
    async getPublicPlans(): Promise<LessonPlan[]> {
        const q = query(collection(this.db, "plans"), where("isPublic", "==", true));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as LessonPlan);
    }

    async getUserPlans(userId: string): Promise<LessonPlan[]> {
        const q = query(collection(this.db, "plans"), where("ownerId", "==", userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as LessonPlan);
    }

    async createPlan(plan: LessonPlan): Promise<void> {
        await setDoc(doc(this.db, "plans", plan.id), plan);
    }

    async updatePlan(id: string, updates: Partial<LessonPlan>): Promise<void> {
        await updateDoc(doc(this.db, "plans", id), updates);
    }

    async deletePlan(id: string): Promise<void> {
        await deleteDoc(doc(this.db, "plans", id));
    }

    // Notes
    async getNotes(userId?: string): Promise<Note[]> {
        // Complex OR query 'ownerId == userId OR isPublic == true' isn't direct in basic firestore
        // We'll fetch user's notes and public notes separately and merge, or just simple logic for now.
        // Let's just fetch public notes if no userId, or all relevant if userId.

        let notes: Note[] = [];

        // Public
        const qPublic = query(collection(this.db, "notes"), where("isPublic", "==", true));
        const snapPublic = await getDocs(qPublic);
        notes = [...notes, ...snapPublic.docs.map(d => d.data() as Note)];

        if (userId) {
            const qUser = query(collection(this.db, "notes"), where("ownerId", "==", userId));
            const snapUser = await getDocs(qUser);
            const userNotes = snapUser.docs.map(d => d.data() as Note);
            // Merge and Dedupe
            const map = new Map();
            notes.forEach(n => map.set(n.id, n));
            userNotes.forEach(n => map.set(n.id, n));
            return Array.from(map.values());
        }

        return notes;
    }

    async createNote(note: Note): Promise<void> {
        await setDoc(doc(this.db, "notes", note.id), note);
    }

    async updateNote(id: string, updates: Partial<Note>): Promise<void> {
        await updateDoc(doc(this.db, "notes", id), updates);
    }

    async deleteNote(id: string): Promise<void> {
        await deleteDoc(doc(this.db, "notes", id));
    }
}

// Export Singleton
export const db = isConfigured ? new FirebaseDatabaseService() : new MockDatabaseService();
console.log(`Database Service Initialized: ${isConfigured ? 'FIREBASE LIVE' : 'MOCK LOCAL'}`);
