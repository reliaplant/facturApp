import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  where, 
  getCountFromServer,
  getDocs,
  orderBy,
  getFirestore
} from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsxpydUEz5m1p8HDJ63RoDjOG7fecXEcs",
  authDomain: "facturapp-7009f.firebaseapp.com",
  projectId: "facturapp-7009f",
  storageBucket: "facturapp-7009f.firebasestorage.app",
  messagingSenderId: "225098417266",
  appId: "1:225098417266:web:8dceebc1450e40575beeeb"
};

// Initialize Firebase (use existing app if already initialized)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export interface UserActivity {
  id?: string;
  userId: string;
  email: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string completo
}

const COLLECTION_NAME = 'user_activity';

export const userActivityService = {
  /**
   * Registra el acceso de un usuario (solo una vez por día)
   * El ID del documento es `${userId}_${date}` para evitar duplicados
   */
  async logAccess(userId: string, email: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const docId = `${userId}_${today}`;
    
    // Usamos setDoc con merge para que si ya existe no falle
    // y si no existe lo cree
    await setDoc(doc(db, COLLECTION_NAME, docId), {
      userId,
      email,
      date: today,
      timestamp: new Date().toISOString()
    }, { merge: true });
  },

  /**
   * Obtiene el conteo de días únicos que un usuario ha accedido
   * Usa getCountFromServer para eficiencia (1 sola lectura)
   */
  async getAccessCount(userId: string): Promise<number> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  },

  /**
   * Obtiene el historial de accesos de un usuario
   */
  async getAccessHistory(userId: string): Promise<UserActivity[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UserActivity));
    
    // Ordenar en el cliente (desc por fecha)
    return activities.sort((a, b) => b.date.localeCompare(a.date));
  }
};
