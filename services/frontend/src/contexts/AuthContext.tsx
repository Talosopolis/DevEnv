import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../services/database';
import { User } from '../types';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    signIn: (email?: string) => Promise<void>;
    signUp: (name: string, role: 'student' | 'teacher') => Promise<void>;
    signOut: () => void;
    updateProfile: (data: Partial<User>) => Promise<void>;
    bypassAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = db.subscribeToAuth((authUser) => {
            setUser(authUser);
            setIsLoading(false);
            if (authUser) {
                localStorage.setItem('auth_user_cache', JSON.stringify(authUser));
            } else {
                localStorage.removeItem('auth_user_cache');
            }
        });
        return () => unsubscribe();
    }, []);

    const signIn = async (email?: string) => {
        console.log("DEBUG: AuthContext.signIn called. Mode:", email ? "Mock" : "Google");
        setIsLoading(true);
        try {
            // If email provided, it's a mock login request (from hidden developer inputs usually)
            // Otherwise, standard Google Sign In
            const authUser = email ? await db.mockLogin(email) : await db.signInWithGoogle();
            // State update handled by subscription usually, but for Mock/Manual logic we might need to be explicit if subscription doesn't fire (Mock implementation of subscribe was empty)
            // Wait, I implemented empty subscribe for mock. 
            // So for mock mode, I need to manually trigger update?
            // Actually, in my MockDatabaseService I trusted explicit calls.
            // Let's make sure we set state here too for safety or implement subscription in mock.
            // For now, setting state here is safe redundancy.
            setUser(authUser);
            localStorage.setItem('auth_user_cache', JSON.stringify(authUser));
        } catch (err) {
            console.error("Sign In Error:", err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const signUp = async (name: string, role: 'student' | 'teacher') => {
        setIsLoading(true);
        try {
            // For Firebase, this logic is a bit weird as discussed (User created on login).
            // But this method supports the manual/mock flow.
            const newUser = await db.createUser(name, role);
            setUser(newUser);
            localStorage.setItem('auth_user_cache', JSON.stringify(newUser));
        } catch (err) {
            console.error(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const bypassAuth = () => {
        console.log("Instant Bypass Triggered");
        const bypassUser: User = {
            id: 'bypass-' + Date.now(),
            name: 'Initiator',
            email: 'initiator@talos.com',
            avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=Initiator',
            role: 'student',
            createdAt: new Date().toISOString(),
            onboardingCompleted: true,
            bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
        };
        setUser(bypassUser);
        localStorage.setItem('auth_user_cache', JSON.stringify(bypassUser));
        setIsLoading(false);
    };

    const signOut = async () => {
        await db.signOut();
        setUser(null);
        localStorage.removeItem('auth_user_cache');
    };

    const updateProfile = async (data: Partial<User>) => {
        if (!user) return;
        try {
            const updated = await db.updateUserProfile(user.id, data);
            setUser(updated);
            localStorage.setItem('auth_user_cache', JSON.stringify(updated));
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, updateProfile, bypassAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
