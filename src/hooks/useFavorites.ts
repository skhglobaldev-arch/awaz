import { useState, useEffect } from 'react';
import { FavoriteTemplate } from '../../types';
import { auth, db } from '../../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';

import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteTemplate[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'favorites'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setFavorites(snapshot.docs.map(doc => ({ 
          templateId: doc.data().templateId, 
          savedAt: doc.data().savedAt 
        })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'favorites');
      });
      return () => unsubscribe();
    } else {
      const stored = localStorage.getItem('awaz_favorites');
      if (stored) {
        try {
          setFavorites(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse favorites', e);
        }
      }
    }
  }, [user]);

  const toggleFavorite = async (templateId: string) => {
    if (user) {
      const q = query(collection(db, 'favorites'), 
        where('userId', '==', user.uid), 
        where('templateId', '==', templateId)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        snapshot.forEach(async (d) => {
          await deleteDoc(doc(db, 'favorites', d.id));
        });
      } else {
        await addDoc(collection(db, 'favorites'), {
          userId: user.uid,
          templateId,
          savedAt: Date.now()
        });
      }
    } else {
      setFavorites(prev => {
        const exists = prev.find(f => f.templateId === templateId);
        let next;
        if (exists) {
          next = prev.filter(f => f.templateId !== templateId);
        } else {
          next = [...prev, { templateId, savedAt: Date.now() }];
        }
        localStorage.setItem('awaz_favorites', JSON.stringify(next));
        return next;
      });
    }
  };

  const isFavorite = (templateId: string) => {
    return favorites.some(f => f.templateId === templateId);
  };

  return { favorites, toggleFavorite, isFavorite };
};
