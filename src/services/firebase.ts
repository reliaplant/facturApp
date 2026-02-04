import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  signOut,
  deleteUser,
  UserCredential,
  updateEmail,
  updatePassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  deleteDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { initializeApp } from "firebase/app";
import { User, CreateUserData, UpdateUserData } from '@/models/User';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsxpydUEz5m1p8HDJ63RoDjOG7fecXEcs",
  authDomain: "facturapp-7009f.firebaseapp.com",
  projectId: "facturapp-7009f",
  storageBucket: "facturapp-7009f.firebasestorage.app",
  messagingSenderId: "225098417266",
  appId: "1:225098417266:web:8dceebc1450e40575beeeb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);

// User CRUD operations
export const userService = {
  // Create a new user
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      
      const { user } = userCredential;
      
      // Add display name if provided
      if (userData.displayName) {
        await updateProfile(user, { displayName: userData.displayName });
      }
      
      // Create user document in Firestore
      const newUser: User = {
        uid: user.uid,
        email: userData.email,
        displayName: userData.displayName || undefined,
        photoURL: user.photoURL || undefined,
        createdAt: new Date().toISOString(),
        role: userData.role || 'cliente',
        isActive: true,
        assignedClients: userData.assignedClients || [],
        clientId: userData.clientId
      };
      
      await setDoc(doc(db, 'users', user.uid), newUser);
      
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },
  
  // Login user
  async loginUser(email: string, password: string): Promise<UserCredential> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Update last login timestamp
      const userRef = doc(db, 'users', userCredential.user.uid);
      await updateDoc(userRef, {
        lastLogin: new Date().toISOString()
      });
      
      return userCredential;
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  },
  
  // Login with Google
  async loginWithGoogle(): Promise<UserCredential> {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      const { user } = userCredential;
      
      // Check if user already exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create new user document for first-time Google sign in
        const newUser: User = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || undefined,
          photoURL: user.photoURL || undefined,
          createdAt: new Date().toISOString(),
          role: 'cliente', // Default role for new Google users
          isActive: true
        };
        
        await setDoc(doc(db, 'users', user.uid), newUser);
      } else {
        // Update last login timestamp
        await updateDoc(doc(db, 'users', user.uid), {
          lastLogin: new Date().toISOString()
        });
      }
      
      return userCredential;
    } catch (error) {
      console.error("Error logging in with Google:", error);
      throw error;
    }
  },
  
  // Logout user
  async logoutUser(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  },
  
  // Get current user
  getCurrentUser(): Promise<User | null> {
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        unsubscribe();
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            resolve(userDoc.data() as User);
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });
  },
  
  // Update user
  async updateUser(uid: string, userData: UpdateUserData): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      
      // Preparar datos para Firestore - convertir undefined a null
      const firestoreData: Record<string, any> = {};
      for (const [key, value] of Object.entries(userData)) {
        // Si el valor es undefined o cadena vacía para clientId, usar null
        if (key === 'clientId' && (value === undefined || value === '')) {
          firestoreData[key] = null;
        } else if (value !== undefined) {
          firestoreData[key] = value;
        }
      }
      
      // Update in Firestore
      await updateDoc(userRef, firestoreData);
      
      // Update display name in Auth if provided
      if (userData.displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: userData.displayName });
      }
      
      // Update photo URL in Auth if provided
      if (userData.photoURL && auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: userData.photoURL });
      }
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },
  
  // Delete user
  async deleteUser(uid: string): Promise<void> {
    try {
      // Delete from Firestore first
      await deleteDoc(doc(db, 'users', uid));
      
      // Delete from Authentication
      if (auth.currentUser && auth.currentUser.uid === uid) {
        await deleteUser(auth.currentUser);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  },
  
  // Get all users (admin only)
  async getAllUsers(): Promise<User[]> {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        users.push(doc.data() as User);
      });
      
      return users;
    } catch (error) {
      console.error("Error getting users:", error);
      throw error;
    }
  },
  
  // Get user by ID
  async getUserById(uid: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        return userDoc.data() as User;
      }
      
      return null;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  },
  
  // Find users by email
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as User;
      }
      
      return null;
    } catch (error) {
      console.error("Error finding user:", error);
      throw error;
    }
  },
  
  // Send password reset email
  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error sending password reset:", error);
      throw error;
    }
  },
  
  // Update user email (requires recent login)
  async updateEmail(newEmail: string): Promise<void> {
    try {
      if (auth.currentUser) {
        await updateEmail(auth.currentUser, newEmail);
        
        // Update email in Firestore as well
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { email: newEmail });
      }
    } catch (error) {
      console.error("Error updating email:", error);
      throw error;
    }
  },
  
  // Update user password (requires recent login)
  async updatePassword(newPassword: string): Promise<void> {
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
      }
    } catch (error) {
      console.error("Error updating password:", error);
      throw error;
    }
  }
};

export default app;