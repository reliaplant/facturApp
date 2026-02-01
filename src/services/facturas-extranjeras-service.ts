import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection,
  query,
  where,
  getDocs,
  orderBy,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { FacturaExtranjera } from '@/models/facturaManual';
import app from '@/services/firebase';
import { v4 as uuidv4 } from 'uuid';

const db = getFirestore(app);

export const facturasExtranjerasService = {
  // Create a new foreign invoice
  async createFacturaExtranjera(clientId: string, factura: Omit<FacturaExtranjera, 'id'>): Promise<string> {
    try {
      const id = uuidv4();
      const facturaRef = doc(db, 'clients', clientId, 'facturasManuales', id);
      
      const facturaCompleta = {
        ...factura,
        id,
        locked: false
      };
      
      await setDoc(facturaRef, facturaCompleta);
      console.log('Factura extranjera created successfully with ID:', id);
      return id;
    } catch (error) {
      console.error('Error creating foreign invoice:', error);
      throw error;
    }
  },

  // Get all foreign invoices for a client in a specific year
  async getFacturasExtranjeras(clientId: string, year: number): Promise<FacturaExtranjera[]> {
    try {
      // Simplify the query to avoid needing a composite index
      const facturasRef = collection(db, 'clients', clientId, 'facturasManuales');
      
      // Just get all the manual invoices for this client without filtering by year
      const querySnapshot = await getDocs(facturasRef);
      
      const facturas: FacturaExtranjera[] = [];
      querySnapshot.forEach((doc) => {
        const factura = doc.data() as FacturaExtranjera;
        // Filter by year in JavaScript rather than in the query
        if (factura.ejercicioFiscal === year) {
          facturas.push(factura);
        }
      });
      
      // Sort the invoices by date in descending order
      facturas.sort((a, b) => {
        const dateA = new Date(a.fecha);
        const dateB = new Date(b.fecha);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log(`Retrieved ${facturas.length} foreign invoices for year ${year}`);
      return facturas;
    } catch (error) {
      console.error('Error getting foreign invoices:', error);
      throw error;
    }
  },

  // Get a single foreign invoice by ID
  async getFacturaExtranjera(clientId: string, id: string): Promise<FacturaExtranjera | null> {
    try {
      const facturaRef = doc(db, 'clients', clientId, 'facturasManuales', id);
      const facturaDoc = await getDoc(facturaRef);
      
      if (facturaDoc.exists()) {
        return facturaDoc.data() as FacturaExtranjera;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting foreign invoice:', error);
      throw error;
    }
  },

  // Update an existing foreign invoice
  async updateFacturaExtranjera(clientId: string, id: string, factura: Partial<FacturaExtranjera>): Promise<void> {
    try {
      const facturaRef = doc(db, 'clients', clientId, 'facturasManuales', id);
      
      // If date is updated, update fiscal year as well
      if (factura.fecha) {
        factura.ejercicioFiscal = new Date(factura.fecha).getFullYear();
      }
      
      await updateDoc(facturaRef, factura);
      console.log('Factura extranjera updated successfully with ID:', id);
    } catch (error) {
      console.error('Error updating foreign invoice:', error);
      throw error;
    }
  },

  // Delete a foreign invoice
  async deleteFacturaExtranjera(clientId: string, id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'clients', clientId, 'facturasManuales', id));
      console.log('Factura extranjera deleted successfully with ID:', id);
    } catch (error) {
      console.error('Error deleting foreign invoice:', error);
      throw error;
    }
  },

  // Toggle the locked status of a foreign invoice
  async toggleLockFacturaExtranjera(clientId: string, id: string, locked: boolean): Promise<void> {
    try {
      const facturaRef = doc(db, 'clients', clientId, 'facturasManuales', id);
      await updateDoc(facturaRef, { locked });
      console.log(`Factura extranjera ${locked ? 'locked' : 'unlocked'} successfully with ID:`, id);
    } catch (error) {
      console.error('Error toggling lock status:', error);
      throw error;
    }
  },
  
  // Toggle the deductible status of a foreign invoice
  async toggleDeducibleFacturaExtranjera(clientId: string, id: string, esDeducible: boolean): Promise<void> {
    try {
      const facturaRef = doc(db, 'clients', clientId, 'facturasManuales', id);
      await updateDoc(facturaRef, { esDeducible });
      console.log(`Factura extranjera deducible set to ${esDeducible} for ID:`, id);
    } catch (error) {
      console.error('Error toggling deductible status:', error);
      throw error;
    }
  },
  
  // Calculate total amount for all foreign invoices in a year
  calculateTotal(facturas: FacturaExtranjera[]): number {
    return facturas.reduce((sum, factura) => sum + factura.totalMXN, 0);
  }
};
