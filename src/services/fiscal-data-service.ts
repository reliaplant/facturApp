import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import app from '@/services/firebase';
import { YearTaxData } from '@/models/fiscalData';

const db = getFirestore(app);

export const fiscalDataService = {
  // Save fiscal summary data to Firebase
  async saveFiscalSummary(clientId: string, data: YearTaxData): Promise<void> {
    try {
      const docRef = doc(db, 'clients', clientId, 'fiscalSummary', `year_${data.year}`);
      await setDoc(docRef, {
        ...data,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      throw error;
    }
  },

  // Get fiscal summary data from Firebase
  async getFiscalSummary(clientId: string, year: number): Promise<YearTaxData | null> {
    try {
      const docRef = doc(db, 'clients', clientId, 'fiscalSummary', `year_${year}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as YearTaxData;
      }
      
      return null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Updates only specific fields of fiscal summary data, preserving others
   */
  async updateFiscalSummaryFields(
    clientId: string, 
    year: number, 
    updateFunction: (existingData: YearTaxData | null) => YearTaxData
  ): Promise<void> {
    try {
      // First get existing data
      const existingData = await this.getFiscalSummary(clientId, year);
      
      // Apply the update function to get new data
      const updatedData = updateFunction(existingData);
      
      // Ensure the data structure matches our model
      if (!updatedData.months) {
        updatedData.months = {};
      }
      
      // Save back to Firebase
      const docRef = doc(db, 'clients', clientId, 'fiscalSummary', `year_${year}`);
      await setDoc(docRef, {
        ...updatedData,
        clientId, // Ensure clientId is set
        year,     // Ensure year is set
        lastUpdated: new Date().toISOString()
      });

      console.log(`Fiscal summary for client ${clientId}, year ${year} updated successfully`);
    } catch (error) {
      console.error(`Error updating fiscal summary for client ${clientId}, year ${year}:`, error);
      throw error;
    }
  },
  
  /**
   * Updates only the tax fields in the fiscal summary
   * This is a convenience method for updating just the tax-related fields
   */
  async updateTaxFields(
    clientId: string,
    year: number,
    monthlyTaxData: Record<string, {
      // Income tax fields
      isrGravado?: number;
      isrRetenido?: number;
      ivaTrasladado?: number;
      ivaRetenido?: number;
      // Expense tax fields
      isrDeducible?: number;
      ivaDeducible?: number;
    }>
  ): Promise<void> {
    // Validate that we only have months 1-12 (as strings)
    const validMonths = Object.keys(monthlyTaxData).every(month => {
      const monthNum = parseInt(month);
      return monthNum >= 1 && monthNum <= 12;
    });
    
    if (!validMonths) {
      console.error("Invalid month data detected! Only months 1-12 are allowed.");
      // Remove any invalid months
      const cleanedData: typeof monthlyTaxData = {};
      Object.entries(monthlyTaxData).forEach(([month, data]) => {
        const monthNum = parseInt(month);
        if (monthNum >= 1 && monthNum <= 12) {
          cleanedData[month] = data;
        } else {
          console.warn(`Removing invalid month: ${month}`);
        }
      });
      monthlyTaxData = cleanedData;
    }

    return this.updateFiscalSummaryFields(clientId, year, (existingData) => {
      // Start with existing data or create new object
      const baseData = existingData || {
        clientId,
        year,
        months: {}
      };
      
      // Ensure months object exists
      if (!baseData.months) baseData.months = {};
      
      // Update each month's tax data
      Object.entries(monthlyTaxData).forEach(([month, taxData]) => {
        // Create month object if it doesn't exist
        if (!baseData.months[month]) {
          baseData.months[month] = {};
        }
        
        // Update only the provided tax fields, preserving other data
        baseData.months[month] = {
          ...baseData.months[month],
          ...taxData
        };
      });
      
      return baseData;
    });
  }
};
