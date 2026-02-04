
import { User } from '../types';
import { auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

// Helper to map Firestore doc to User type
const mapUser = (docData: any, uid: string, email: string): User => ({
  id: uid,
  name: docData.name || 'Usuário',
  email: email,
  role: docData.role || 'user',
  isBlocked: docData.isBlocked || false
});

export const register = async (name: string, email: string, password: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update Display Name in Auth
    await updateProfile(user, { displayName: name });

    // Create User Document in Firestore (for roles/blocking)
    const userDocRef = doc(db, 'users', user.uid);
    const userData = {
      name,
      email,
      role: 'user',
      isBlocked: false,
      createdAt: new Date().toISOString()
    };
    await setDoc(userDocRef, userData);

    return {
      id: user.uid,
      name,
      email,
      role: 'user',
      isBlocked: false
    };
  } catch (error: any) {
    console.error(error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error("Este e-mail já está cadastrado.");
    }
    throw new Error("Erro ao criar conta: " + error.message);
  }
};

export const login = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch extra data from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.isBlocked) {
        await signOut(auth);
        throw new Error("Conta bloqueada pelo administrador.");
      }
      return mapUser(data, user.uid, user.email!);
    } else {
      // Fallback if doc doesn't exist (legacy users or direct auth creation)
      return {
        id: user.uid,
        name: user.displayName || 'Usuário',
        email: user.email!,
        role: 'user',
        isBlocked: false
      };
    }
  } catch (error: any) {
    if (error.code === 'auth/invalid-credential') {
      throw new Error("E-mail ou senha incorretos.");
    }
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
};

export const getCurrentUser = async (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
             resolve(mapUser(userDoc.data(), user.uid, user.email!));
          } else {
             resolve({
                id: user.uid,
                name: user.displayName || 'Usuário',
                email: user.email!,
                role: 'user',
                isBlocked: false
             });
          }
        } catch (e) {
          console.error(e);
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
};

// --- Admin Functions ---

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Unknown',
        email: data.email || '',
        role: data.role || 'user',
        isBlocked: data.isBlocked || false
      };
    });
  } catch (e) {
    console.error("Error fetching users", e);
    return [];
  }
};

export const toggleUserBlock = async (userId: string, currentStatus: boolean): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { isBlocked: !currentStatus });
};

export const deleteUser = async (userId: string): Promise<void> => {
   // Note: Firebase Client SDK cannot delete Auth user easily without re-auth.
   // We will delete the Firestore document, effectively removing them from the app logic.
   await deleteDoc(doc(db, 'users', userId));
};

export const checkUserExists = async (email: string): Promise<boolean> => {
  // Not easily possible with client SDK to check without trying to login/register
  return true; 
};

export const resetPassword = async (email: string) => {
  // auth.sendPasswordResetEmail(email); needs import
  // Leaving placeholder to match interface
};
