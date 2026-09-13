'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, db, testFirestoreConnection } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isOnline: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isOnline: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Test initial connection
    testFirestoreConnection().then((ok) => setIsOnline(ok));

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if admin email or in admins collection
        const isMaster = currentUser.email === 'ishvarkalwa001@gmail.com';
        if (isMaster) {
          setIsAdmin(true);
        } else {
          try {
            const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
            setIsAdmin(adminDoc.exists());
          } catch {
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isOnline,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  return useContext(FirebaseContext);
}
