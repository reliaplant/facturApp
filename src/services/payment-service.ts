import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import app from '@/services/firebase';
import { Payment } from '@/models/Payment';

const db = getFirestore(app);
const COLLECTION_NAME = 'payments';

export const paymentService = {
  /**
   * Crear un nuevo pago
   */
  async createPayment(payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
    try {
      const paymentsRef = collection(db, COLLECTION_NAME);
      const newPaymentRef = doc(paymentsRef);
      
      const paymentData = {
        ...payment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(newPaymentRef, paymentData);
      
      return {
        id: newPaymentRef.id,
        ...paymentData
      };
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  },

  /**
   * Obtener todos los pagos
   */
  async getAllPayments(): Promise<Payment[]> {
    try {
      const paymentsRef = collection(db, COLLECTION_NAME);
      const q = query(paymentsRef, orderBy('fechaPago', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Payment));
    } catch (error) {
      console.error('Error getting payments:', error);
      throw error;
    }
  },

  /**
   * Obtener pagos por usuario
   */
  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    try {
      const paymentsRef = collection(db, COLLECTION_NAME);
      const q = query(
        paymentsRef, 
        where('userId', '==', userId),
        orderBy('fechaPago', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Payment));
    } catch (error) {
      console.error('Error getting payments by user:', error);
      throw error;
    }
  },

  /**
   * Obtener pagos por mes/año
   */
  async getPaymentsByMonth(mes: number, año: number): Promise<Payment[]> {
    try {
      const paymentsRef = collection(db, COLLECTION_NAME);
      const q = query(
        paymentsRef, 
        where('mes', '==', mes),
        where('año', '==', año),
        orderBy('fechaPago', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Payment));
    } catch (error) {
      console.error('Error getting payments by month:', error);
      throw error;
    }
  },

  /**
   * Actualizar un pago
   */
  async updatePayment(paymentId: string, updates: Partial<Payment>): Promise<void> {
    try {
      const paymentRef = doc(db, COLLECTION_NAME, paymentId);
      await setDoc(paymentRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  },

  /**
   * Eliminar un pago
   */
  async deletePayment(paymentId: string): Promise<void> {
    try {
      const paymentRef = doc(db, COLLECTION_NAME, paymentId);
      await deleteDoc(paymentRef);
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  },

  /**
   * Obtener resumen de pagos por usuario
   */
  async getPaymentsSummary(): Promise<{ userId: string; userName: string; total: number; count: number }[]> {
    try {
      const payments = await this.getAllPayments();
      
      const summaryMap = new Map<string, { userName: string; total: number; count: number }>();
      
      for (const payment of payments) {
        const existing = summaryMap.get(payment.userId);
        if (existing) {
          existing.total += payment.total;
          existing.count += 1;
        } else {
          summaryMap.set(payment.userId, {
            userName: payment.userName || payment.userEmail || 'Sin nombre',
            total: payment.total,
            count: 1
          });
        }
      }
      
      return Array.from(summaryMap.entries()).map(([userId, data]) => ({
        userId,
        ...data
      }));
    } catch (error) {
      console.error('Error getting payments summary:', error);
      throw error;
    }
  }
};
