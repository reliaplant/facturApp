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
import { Invoice } from '@/models/Invoice';
import app from '@/services/firebase';

const db = getFirestore(app);

export const invoiceService = {
  // Helper function to sanitize objects for Firestore (replace undefined with null)
  _sanitizeForFirestore(obj: any): any {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (typeof obj !== 'object') return obj;
    
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this._sanitizeForFirestore(item));
    }
    
    // Handle objects
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip undefined values entirely or convert to null
      if (value !== undefined) {
        sanitized[key] = this._sanitizeForFirestore(value);
      } else {
        sanitized[key] = null; // Convert undefined to null for Firestore
      }
    }
    
    return sanitized;
  },

  // Save client invoices to Firestore
  async saveInvoices(clientId: string, invoices: Invoice[]): Promise<any> {
    try {
      const savedIds: string[] = [];
      const errors: string[] = [];
      const existingIds: string[] = [];
      
      console.log(`Attempting to save ${invoices.length} invoices for client ${clientId}`);
      
      for (const invoice of invoices) {
        try {
          // Ensure invoice has a UUID and sanitize it
          if (!invoice.uuid) {
            console.error("Invoice missing UUID, generating a new one");
            invoice.uuid = `generated-${new Date().getTime()}-${Math.random().toString(36).substring(2, 9)}`;
          }
          
          // Clean UUID of any problematic characters
          const cleanUuid = invoice.uuid.trim().replace(/\s+/g, '-');
          
          console.log(`Processing invoice with UUID: ${cleanUuid}`);
          
          // Check if this invoice already exists to avoid duplicates
          const invoicesRef = collection(db, 'clients', clientId, 'cfdi');
          
          // First try to directly get the doc with this UUID
          const directDocRef = doc(invoicesRef, cleanUuid);
          const directDoc = await getDoc(directDocRef);
          
          if (directDoc.exists()) {
            console.log(`Invoice already exists with direct ID check: ${cleanUuid}`);
            existingIds.push(cleanUuid);
            continue;
          }
          
          // Additional check with query (in case UUID is stored as a field but not as the doc id)
          const q = query(invoicesRef, where("uuid", "==", cleanUuid));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            console.log(`Invoice already exists with query check: ${cleanUuid}`);
            existingIds.push(cleanUuid);
            continue;
          }
          
          // If it doesn't exist, save it
          console.log(`Saving new invoice with UUID: ${cleanUuid}`);
          
          // Create a sanitized version of the invoice for Firestore
          const firestoreInvoice = this._sanitizeForFirestore({
            ...invoice,
            uuid: cleanUuid,
            clientId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          
          // Use try-catch for each individual setDoc operation
          try {
            // Use the clean UUID as document ID for easier retrieval
            const docRef = doc(invoicesRef, cleanUuid);
            await setDoc(docRef, firestoreInvoice);
            savedIds.push(cleanUuid);
            console.log(`Successfully saved invoice: ${cleanUuid}`);
          } catch (docError) {
            console.error(`Failed to save invoice ${cleanUuid}:`, docError);
            errors.push(`Failed to save: ${cleanUuid}`);
          }
        } catch (invoiceError) {
          console.error("Error processing individual invoice:", invoiceError);
          errors.push("Error processing individual invoice");
        }
      }
      
      if (errors.length > 0) {
        console.warn(`Completed with ${errors.length} errors:`, errors);
      }
      
      if (existingIds.length > 0) {
        console.log(`Found ${existingIds.length} existing invoices:`, existingIds);
      }
      
      console.log(`Successfully saved ${savedIds.length} invoices`);
      return {
        savedIds,
        existingIds,
        errors: errors.length
      };
    } catch (error) {
      console.error("Error saving invoices:", error);
      throw error;
    }
  },

  // Get invoices for a client from Firestore
  async getInvoices(clientId: string, year?: number): Promise<Invoice[]> {
    try {
      const invoicesRef = collection(db, 'clients', clientId, 'cfdi');
      
      let q;
      if (year) {
        const startDate = new Date(year, 0, 1).toISOString();
        const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();
        q = query(
          invoicesRef, 
          where("fecha", ">=", startDate),
          where("fecha", "<=", endDate),
          orderBy("fecha", "desc")
        );
      } else {
        q = query(invoicesRef, orderBy("fecha", "desc"));
      }
      
      const querySnapshot = await getDocs(q);
      
      const invoices: Invoice[] = [];
      querySnapshot.forEach((doc) => {
        invoices.push(doc.data() as Invoice);
      });
      
      return invoices;
    } catch (error) {
      console.error("Error getting invoices:", error);
      throw error;
    }
  },

  // Get invoice by ID
  async getInvoiceById(clientId: string, invoiceId: string): Promise<Invoice | null> {
    try {
      const invoiceRef = doc(db, 'clients', clientId, 'cfdi', invoiceId);
      const invoiceDoc = await getDoc(invoiceRef);
      
      if (invoiceDoc.exists()) {
        return invoiceDoc.data() as Invoice;
      }
      
      return null;
    } catch (error) {
      console.error("Error getting invoice by ID:", error);
      throw error;
    }
  },

  // Delete an invoice
  async deleteInvoice(clientId: string, invoiceId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'clients', clientId, 'cfdi', invoiceId));
    } catch (error) {
      console.error("Error deleting invoice:", error);
      throw error;
    }
  },

  // Replace the separate update methods with a single, flexible updateInvoice method
  async updateInvoice(clientId: string, invoiceId: string, updateData: Partial<Invoice>): Promise<void> {
    try {
      const invoiceRef = doc(db, 'clients', clientId, 'cfdi', invoiceId);
      
      // Add updatedAt timestamp to all updates
      const dataWithTimestamp = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      // Sanitize the data for Firestore (remove undefined values)
      const sanitizedData = this._sanitizeForFirestore(dataWithTimestamp);
      
      await updateDoc(invoiceRef, sanitizedData);
      console.log(`Updated invoice ${invoiceId} with fields:`, Object.keys(updateData).join(', '));
    } catch (error) {
      console.error(`Error updating invoice ${invoiceId}:`, error);
      throw error;
    }
  }
};
