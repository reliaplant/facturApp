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
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { Invoice } from '@/models/Invoice';
import app from '@/services/firebase';

// Simple supplier interface
interface Supplier {
  id?: string;
  rfc: string;
  name: string;
  isDeductible: boolean;
  lastUpdated: string;
  invoiceCount?: number;
}

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

  // Save client invoices to Firestore - MODIFIED to prevent any auto-evaluation
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
          
          // EXPLICITLY make sure deductibility fields are undefined by removing them before creating sanitized version
          // This prevents any default values from being set
          const {
            esDeducible, 
            mesDeduccion, 
            gravadoISR, 
            gravadoIVA, 
            anual, 
            ...cleanInvoice 
          } = invoice;

          // Create a sanitized version of the invoice for Firestore
          const firestoreInvoice = this._sanitizeForFirestore({
            ...cleanInvoice,
            uuid: cleanUuid,
            clientId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Explicitly set these to undefined to prevent auto-evaluation
            esDeducible: undefined,
            mesDeduccion: undefined,
            gravadoISR: undefined,
            gravadoIVA: undefined,
            anual: undefined
          });
          
          // Use try-catch for each individual setDoc operation
          try {
            // Use the clean UUID as document ID for easier retrieval
            const docRef = doc(invoicesRef, cleanUuid);
            await setDoc(docRef, firestoreInvoice);
            savedIds.push(cleanUuid);
            console.log(`Successfully saved invoice: ${cleanUuid} with NO deductibility values`);
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
  },

  /**
   * Get all suppliers for a client
   */
  async getSuppliers(clientId: string): Promise<Supplier[]> {
    try {
      const suppliersRef = collection(db, 'clients', clientId, 'suppliers');
      const q = query(suppliersRef, orderBy("name"));
      const querySnapshot = await getDocs(q);
      
      const suppliers: Supplier[] = [];
      querySnapshot.forEach((doc) => {
        suppliers.push({ id: doc.id, ...doc.data() } as Supplier);
      });
      
      return suppliers;
    } catch (error) {
      console.error("Error getting suppliers:", error);
      return [];
    }
  },

  /**
   * Get a supplier by RFC
   */
  async getSupplierByRfc(clientId: string, rfc: string): Promise<Supplier | null> {
    try {
      const supplierRef = doc(db, 'clients', clientId, 'suppliers', rfc);
      const supplierDoc = await getDoc(supplierRef);
      
      if (supplierDoc.exists()) {
        return { id: supplierDoc.id, ...supplierDoc.data() } as Supplier;
      }
      
      return null;
    } catch (error) {
      console.error("Error getting supplier by RFC:", error);
      return null;
    }
  },

  /**
   * Helper: Calculate gravado values based on invoice data
   */
  _calculateGravados(invoice: Invoice) {
    if (invoice.anual || invoice.usoCFDI?.startsWith('D')) {
      return { gravadoIVA: 0, gravadoISR: 0 };
    }
    
    const ivaValue = invoice.impuestoTrasladado || 0;
    const gravadoISR = ivaValue !== undefined ? Math.round(ivaValue / 0.16 * 100) / 100 : invoice.subTotal;
    const gravadoIVA = Math.round(gravadoISR * 0.16 * 100) / 100;
    
    return { gravadoIVA, gravadoISR };
  },
  
  /**
   * Helper: Build payment complement map for checking PPD invoices
   */
  async _buildPaymentComplementMap(clientId: string): Promise<Map<string, Date[]>> {
    const paymentMap = new Map<string, Date[]>();
    const paymentComplements = await this.getInvoices(clientId);
    
    paymentComplements
      .filter(inv => inv.tipoDeComprobante === 'P')
      .forEach(pc => {
        if (!pc.docsRelacionadoComplementoPago) return;
        
        pc.docsRelacionadoComplementoPago.forEach(uuid => {
          const key = uuid.toUpperCase();
          const paymentDate = new Date(pc.fecha);
          
          if (!paymentMap.has(key)) {
            paymentMap.set(key, [paymentDate]);
          } else {
            paymentMap.get(key)?.push(paymentDate);
          }
        });
      });
    
    return paymentMap;
  },
  
  /**
   * Helper: Check if invoice has payment complement
   */
  _hasPaymentComplement(invoice: Invoice, paymentMap: Map<string, Date[]>): boolean {
    return (!!invoice.pagadoConComplementos && invoice.pagadoConComplementos.length > 0) ||
      paymentMap.has(invoice.uuid.toUpperCase());
  },
  
  /**
   * Helper: Determine deductibility for a single invoice
   */
  _determineInvoiceDeductibility(
    invoice: Invoice, 
    supplierIsDeductible: boolean,
    paymentMap: Map<string, Date[]>
  ): {shouldBeDeductible: boolean, deductionMonth: number | undefined} {
    // Check if invoice has payment complement
    const hasPayment = this._hasPaymentComplement(invoice, paymentMap);
    
    // Donation invoices (D prefix)
    if (invoice.usoCFDI?.startsWith('D')) {
      if (invoice.metodoPago === 'PUE') {
        return {
          shouldBeDeductible: true, 
          deductionMonth: new Date(invoice.fecha).getMonth() + 1
        };
      } else if (invoice.metodoPago === 'PPD' && hasPayment) {
        const paymentDates = paymentMap.get(invoice.uuid.toUpperCase());
        const month = paymentDates && paymentDates.length > 0
          ? Math.min(...paymentDates.map(d => d.getMonth() + 1))
          : 13;
        return { shouldBeDeductible: true, deductionMonth: month };
      }
      return { shouldBeDeductible: false, deductionMonth: undefined };
    }
    
    // Regular invoices
    if (invoice.metodoPago === 'PUE') {
      return {
        shouldBeDeductible: supplierIsDeductible,
        deductionMonth: supplierIsDeductible ? new Date(invoice.fecha).getMonth() + 1 : undefined
      };
    } else if (invoice.metodoPago === 'PPD' && hasPayment) {
      const paymentDates = paymentMap.get(invoice.uuid.toUpperCase());
      const month = paymentDates && paymentDates.length > 0
        ? Math.min(...paymentDates.map(d => d.getMonth() + 1))
        : new Date(invoice.fecha).getMonth() + 1;
      return { 
        shouldBeDeductible: supplierIsDeductible, 
        deductionMonth: supplierIsDeductible ? month : undefined 
      };
    }
    
    // Default: Not deductible
    return { shouldBeDeductible: false, deductionMonth: undefined };
  },

  /**
   * Helper: Determine income recognition for a single invoice
   * For issued invoices (income), follows these rules:
   * - PUE: Recognized in the month of issue
   * - PPD: Recognized when payment complement exists
   */
  _determineInvoiceIncome(
    invoice: Invoice,
    paymentMap: Map<string, Date[]>
  ): {shouldBeRecognized: boolean, recognitionMonth: number | undefined} {
    // Check if invoice has payment complement
    const hasPayment = this._hasPaymentComplement(invoice, paymentMap);
    
    // PUE invoices are recognized immediately
    if (invoice.metodoPago === 'PUE') {
      const month = new Date(invoice.fecha).getMonth() + 1;
      return { shouldBeRecognized: true, recognitionMonth: month };
    } 
    // PPD invoices are recognized when payment is received
    else if (invoice.metodoPago === 'PPD' && hasPayment) {
      const paymentDates = paymentMap.get(invoice.uuid.toUpperCase());
      // Use the month of the earliest payment
      const month = paymentDates && paymentDates.length > 0
        ? Math.min(...paymentDates.map(d => d.getMonth() + 1))
        : new Date(invoice.fecha).getMonth() + 1;
      return { shouldBeRecognized: true, recognitionMonth: month };
    }
    
    // Default: Not recognized without payment complement
    return { shouldBeRecognized: false, recognitionMonth: undefined };
  },

  /**
   * Update supplier's deductible status
   */
  async updateSupplierDeductible(clientId: string, rfc: string, isDeductible: boolean): Promise<void> {
    try {
      // 1. Update supplier status
      const supplierRef = doc(db, 'clients', clientId, 'suppliers', rfc);
      await updateDoc(supplierRef, { 
        isDeductible,
        lastUpdated: new Date().toISOString()
      });
      
      // 2. Get eligible invoices
      const invoicesRef = collection(db, 'clients', clientId, 'cfdi');
      const q = query(
        invoicesRef, 
        where("rfcEmisor", "==", rfc),
        where("recibida", "==", true)
      );
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return;
      
      const eligibleInvoices: Invoice[] = [];
      querySnapshot.forEach(doc => {
        const invoice = doc.data() as Invoice;
        if (!invoice.locked && 
            invoice.tipoDeComprobante !== 'P' && 
            !invoice.usoCFDI?.startsWith('C') && 
            !invoice.usoCFDI?.startsWith('S')) {
          eligibleInvoices.push(invoice);
        }
      });
      
      if (eligibleInvoices.length === 0) return;
      
      // 3. Get payment complement data
      const paymentMap = await this._buildPaymentComplementMap(clientId);
      
      // 4. Prepare batch update
      const batch = writeBatch(db);
      
      // 5. Process each invoice and update batch
      for (const invoice of eligibleInvoices) {
        // Determine new deductibility status
        const { shouldBeDeductible, deductionMonth } = 
          this._determineInvoiceDeductibility(invoice, isDeductible, paymentMap);
        
        // Only update if status would change
        if (invoice.esDeducible !== shouldBeDeductible || invoice.mesDeduccion !== deductionMonth) {
          let updateData: Partial<Invoice> = {
            esDeducible: shouldBeDeductible,
            mesDeduccion: deductionMonth
          };
          
          // Handle gravado values, respecting manually modified ones
          if (shouldBeDeductible && invoice.gravadoModificado !== true) {
            const { gravadoISR, gravadoIVA } = this._calculateGravados({...invoice, ...updateData});
            updateData.gravadoISR = gravadoISR;
            updateData.gravadoIVA = gravadoIVA;
            updateData.gravadoModificado = false;
          } else if (!shouldBeDeductible && invoice.gravadoModificado !== true) {
            updateData.gravadoISR = 0;
            updateData.gravadoIVA = 0;
            updateData.gravadoModificado = false;
          }
          
          // Add to batch
          batch.update(
            doc(db, 'clients', clientId, 'cfdi', invoice.uuid), 
            this._sanitizeForFirestore({
              ...updateData,
              updatedAt: new Date().toISOString()
            })
          );
        }
      }
      
      // 6. Commit all changes
      await batch.commit();
      
    } catch (error) {
      console.error("Error updating supplier deductible status:", error);
      throw error;
    }
  },

  /**
   * Update supplier's deductible status WITHOUT evaluating invoices
   * This version ONLY updates the supplier data and doesn't touch any invoices
   */
  async updateSupplierDeductibleOnly(clientId: string, rfc: string, isDeductible: boolean): Promise<void> {
    try {
      // Update ONLY the supplier's deductibility status
      const supplierRef = doc(db, 'clients', clientId, 'suppliers', rfc);
      await updateDoc(supplierRef, { 
        isDeductible,
        lastUpdated: new Date().toISOString()
      });
      
      console.log(`Updated supplier ${rfc} deductible status to ${isDeductible}. NO invoice evaluation performed.`);
    } catch (error) {
      console.error("Error updating supplier deductible status:", error);
      throw error;
    }
  },

  /**
   * Extract suppliers from invoices and update the suppliers collection
   */
  async syncSuppliersFromInvoices(clientId: string): Promise<{
    added: number;
    updated: number;
    unchanged: number;
  }> {
    try {
      // Get all invoices for this client
      const invoices = await this.getInvoices(clientId);
      
      // Filter for received invoices only
      const receivedInvoices = invoices.filter(invoice => invoice.recibida);
      
      if (receivedInvoices.length === 0) {
        return { added: 0, updated: 0, unchanged: 0 };
      }
      
      // Extract unique suppliers from invoices
      const supplierMap = new Map<string, {name: string; count: number}>();
      
      receivedInvoices.forEach(invoice => {
        if (invoice.rfcEmisor && invoice.nombreEmisor) {
          const rfc = invoice.rfcEmisor;
          const name = invoice.nombreEmisor;
          const existing = supplierMap.get(rfc);
          if (existing) {
            supplierMap.set(rfc, {
              name: existing.name,
              count: existing.count + 1
            });
          } else {
            supplierMap.set(rfc, {
              name,
              count: 1
            });
          }
        }
      });
      
      if (supplierMap.size === 0) {
        return { added: 0, updated: 0, unchanged: 0 };
      }
      
      // Get existing suppliers
      const existingSuppliers = await this.getSuppliers(clientId);
      const existingRfcsMap = new Map(existingSuppliers.map(s => [s.rfc, s]));
      
      // Prepare batch write
      const batch = writeBatch(db);
      let added = 0;
      let updated = 0;
      let unchanged = 0;
      
      // Process each supplier
      for (const [rfc, { name, count }] of supplierMap.entries()) {
        const supplierRef = doc(db, 'clients', clientId, 'suppliers', rfc);
        
        if (existingRfcsMap.has(rfc)) {
          // Supplier exists, update only if name changed or count
          const existingSupplier = existingRfcsMap.get(rfc)!;
          
          if (existingSupplier.name !== name || (existingSupplier.invoiceCount || 0) !== count) {
            batch.update(supplierRef, { 
              name, 
              invoiceCount: count,
              lastUpdated: new Date().toISOString()
            });
            updated++;
          } else {
            unchanged++;
          }
        } else {
          // New supplier
          batch.set(supplierRef, {
            rfc,
            name,
            isDeductible: true, // Default to deductible
            invoiceCount: count,
            lastUpdated: new Date().toISOString()
          });
          added++;
        }
      }
      
      // Commit batch
      await batch.commit();
      
      return { added, updated, unchanged };
    } catch (error) {
      console.error("Error syncing suppliers from invoices:", error);
      return { added: 0, updated: 0, unchanged: 0 };
    }
  },

  /**
   * Evaluates deductibility of all unlocked received invoices for a client
   * Using a direct approach to always check supplier status correctly
   */
  async evaluateDeductibility(clientId: string): Promise<{
    processed: number;
    updated: number;
    unchanged: number;
    skipped: number;
  }> {
    try {
      // 1. STEP ONE: Get all invoices that need evaluation
      console.log("Step 1: Getting invoices to evaluate");
      const invoices = await this.getInvoices(clientId);
      const eligibleInvoices = invoices.filter(invoice => 
        invoice.recibida && 
        !invoice.locked && 
        invoice.tipoDeComprobante !== 'P' &&
        !invoice.usoCFDI?.startsWith('C') &&
        !invoice.usoCFDI?.startsWith('S')
      );
      
      const skippedCount = invoices.filter(inv => inv.recibida).length - eligibleInvoices.length;
      console.log(`Found ${eligibleInvoices.length} eligible invoices for evaluation`);
      
      if (eligibleInvoices.length === 0) {
        return { processed: 0, updated: 0, unchanged: 0, skipped: skippedCount };
      }
      
      // 2. STEP TWO: Get payment complement information
      console.log("Step 2: Mapping payment complements");
      const paymentMap = new Map<string, Date[]>();
      invoices
        .filter(inv => inv.tipoDeComprobante === 'P')
        .forEach(pc => {
          if (!pc.docsRelacionadoComplementoPago) return;
          
          pc.docsRelacionadoComplementoPago.forEach(uuid => {
            const key = uuid.toUpperCase();
            const paymentDate = new Date(pc.fecha);
            
            if (!paymentMap.has(key)) {
              paymentMap.set(key, [paymentDate]);
            } else {
              paymentMap.get(key)?.push(paymentDate);
            }
          });
        });
      
      // 3. STEP THREE: Get ALL suppliers in a direct API call
      console.log("Step 3: Getting ALL suppliers with fresh data");
      const suppliersRef = collection(db, 'clients', clientId, 'suppliers');
      const suppliersSnapshot = await getDocs(suppliersRef);
      const supplierStatusMap = new Map<string, boolean>();
      
      suppliersSnapshot.forEach(doc => {
        const supplier = doc.data() as Supplier;
        console.log(`Supplier ${supplier.rfc}: deductible=${supplier.isDeductible}`);
        // Store the deductibility status with RFC as key (case insensitive)
        supplierStatusMap.set(supplier.rfc.toUpperCase(), supplier.isDeductible);
      });
      
      console.log(`Loaded ${supplierStatusMap.size} suppliers directly from Firestore`);
      
      // Helper functions for consistent evaluation
      const hasPaymentComplement = (invoice: Invoice): boolean => {
        return paymentMap.has(invoice.uuid.toUpperCase()) ||
               !!(invoice.pagadoConComplementos && invoice.pagadoConComplementos.length > 0);
      };
      
      const calculateGravados = (invoice: Invoice) => {
        if (invoice.anual || invoice.usoCFDI?.startsWith('D')) {
          return { gravadoIVA: 0, gravadoISR: 0 };
        }
        
        const ivaValue = invoice.impuestoTrasladado || 0;
        const gravadoISR = ivaValue !== undefined ? Math.round(ivaValue / 0.16 * 100) / 100 : invoice.subTotal;
        const gravadoIVA = Math.round(gravadoISR * 0.16 * 100) / 100;
        
        return { gravadoIVA, gravadoISR };
      };
      
      // 4. STEP FOUR: Batch update preparation
      const batch = writeBatch(db);
      let processed = 0;
      let updated = 0;
      let unchanged = 0;
      
      // 5. STEP FIVE: Process each invoice individually
      for (const invoice of eligibleInvoices) {
        processed++;
        console.log(`\n------- Processing invoice ${invoice.uuid} -------`);
        console.log(`From: ${invoice.rfcEmisor}, Type: ${invoice.usoCFDI}, Method: ${invoice.metodoPago}`);
        
        // Check if this invoice has manually modified gravado values
        if (invoice.gravadoModificado === true) {
          console.log(`🖐️ Invoice has manually modified gravado values - preserving them`);
        }
        
        // Get current status
        const currentStatus = {
          isDeductible: invoice.esDeducible === true,
          month: invoice.mesDeduccion
        };
        console.log(`Current status: Deductible=${currentStatus.isDeductible}, Month=${currentStatus.month}`);
        
        // Supplier check - DIRECT LOOKUP with explicit console logging
        const supplierRfcKey = invoice.rfcEmisor.toUpperCase();
        const hasSupplierInfo = supplierStatusMap.has(supplierRfcKey);
        const supplierIsDeductible = hasSupplierInfo ? supplierStatusMap.get(supplierRfcKey) : true;
        
        console.log(`Supplier "${invoice.rfcEmisor}": ${hasSupplierInfo ? `Found, deductible=${supplierIsDeductible}` : "Not found (defaulting to deductible)"}`);
        
        // Initialize new status
        let newStatus = {
          isDeductible: false, 
          month: undefined as number | undefined
        };
        
        // Evaluate with explicit rule logic
        if (invoice.usoCFDI === 'S01') {
          // Rule: S01 invoices are NEVER deductible
          console.log("Rule: S01 invoice = NOT deductible");
          newStatus = { isDeductible: false, month: undefined };
        }
        else if (invoice.usoCFDI?.startsWith('D')) {
          // Rules for donations
          if (invoice.metodoPago === 'PUE') {
            // Rule: D + PUE = Always deductible (month of issue)
            const month = new Date(invoice.fecha).getMonth() + 1;
            console.log(`Rule: D + PUE = Deductible, month ${month}`);
            newStatus = { isDeductible: true, month };
          } 
          else if (invoice.metodoPago === 'PPD' && hasPaymentComplement(invoice)) {
            // Rule: D + PPD with payment = Deductible (month of payment)
            const paymentDates = paymentMap.get(invoice.uuid.toUpperCase());
            const month = paymentDates && paymentDates.length > 0
              ? Math.min(...paymentDates.map(d => d.getMonth() + 1))
              : 13;
            console.log(`Rule: D + PPD with payment = Deductible, month ${month}`);
            newStatus = { isDeductible: true, month };
          } 
          else {
            // Rule: D + PPD without payment = Not deductible yet
            console.log("Rule: D + PPD without payment = Not deductible");
            newStatus = { isDeductible: false, month: undefined };
          }
        } 
        else {
          // Regular invoices - follow supplier status
          if (invoice.metodoPago === 'PUE') {
            // PUE invoices use month of issue
            const month = new Date(invoice.fecha).getMonth() + 1;
            
            // CRITICAL: Use the supplier status for deductibility
            console.log(`Rule: PUE (G-type) = ${supplierIsDeductible ? "Deductible" : "NOT Deductible"} based on supplier status`);
            newStatus = { 
              isDeductible: supplierIsDeductible === true, 
              month: supplierIsDeductible === true ? month : undefined 
            };
          } 
          else if (invoice.metodoPago === 'PPD' && hasPaymentComplement(invoice)) {
            // PPD with payment - use month of payment
            const paymentDates = paymentMap.get(invoice.uuid.toUpperCase());
            const month = paymentDates && paymentDates.length > 0
              ? Math.min(...paymentDates.map(d => d.getMonth() + 1))
              : new Date(invoice.fecha).getMonth() + 1;
              
            // CRITICAL: Use the supplier status for deductibility
            console.log(`Rule: PPD with payment = ${supplierIsDeductible ? "Deductible" : "NOT Deductible"} based on supplier status`);
            newStatus = { 
              isDeductible: supplierIsDeductible === true, 
              month: supplierIsDeductible === true ? month : undefined
            };
          } 
          else {
            // PPD without payment = Not deductible yet
            console.log("Rule: PPD without payment = Not deductible");
            newStatus = { isDeductible: false, month: undefined };
          }
        }
        
        // Check if update is needed
        const needsUpdate = currentStatus.isDeductible !== newStatus.isDeductible || 
                           currentStatus.month !== newStatus.month;
        
        console.log(`Result: ${needsUpdate ? "NEEDS UPDATE" : "No change needed"}`);
        console.log(`- From: Deductible=${currentStatus.isDeductible}, Month=${currentStatus.month}`);
        console.log(`- To:   Deductible=${newStatus.isDeductible}, Month=${newStatus.month}`);
        
        if (needsUpdate) {
          const invoiceRef = doc(db, 'clients', clientId, 'cfdi', invoice.uuid);
          const updateData: Partial<Invoice> = {
            esDeducible: newStatus.isDeductible,
            mesDeduccion: newStatus.month
          };
          
          // Type D invoices should always have anual=true
          if (invoice.usoCFDI?.startsWith('D')) {
            updateData.anual = true;
          }
          
          // Set gravado values based on deductibility - BUT RESPECT MANUALLY MODIFIED VALUES
          if (newStatus.isDeductible) {
            // CRITICAL: Only update gravado values if NOT manually modified
            if (invoice.gravadoModificado !== true) {
              const baseInvoice = { ...invoice, ...updateData };
              const { gravadoISR, gravadoIVA } = calculateGravados(baseInvoice);
              updateData.gravadoISR = gravadoISR;
              updateData.gravadoIVA = gravadoIVA;
              updateData.gravadoModificado = false;
              console.log(`Updated gravados: ISR=${gravadoISR}, IVA=${gravadoIVA}`);
            } else {
              // Skip updating gravado values if manually modified
              console.log(`Preserving manually modified gravado values: ISR=${invoice.gravadoISR}, IVA=${invoice.gravadoIVA}`);
            }
          } else {
            // Only reset to zero if not manually modified
            if (invoice.gravadoModificado !== true) {
              updateData.gravadoISR = 0;
              updateData.gravadoIVA = 0;
              updateData.gravadoModificado = false;
              console.log(`Reset gravados to zero (not manually modified)`);
            } else {
              // Don't reset manually modified values even when turning off deductibility
              console.log(`Preserving manually modified gravado values despite turning off deductibility`);
            }
          }
          
          batch.update(invoiceRef, this._sanitizeForFirestore({
            ...updateData,
            updatedAt: new Date().toISOString()
          }));
          updated++;
        } else {
          unchanged++;
        }
      }
      
      // 6. STEP SIX: Commit all changes
      console.log(`\nCommitting changes: ${updated} updates, ${unchanged} unchanged`);
      if (updated > 0) {
        await batch.commit();
        console.log("Batch committed successfully");
      } else {
        console.log("No updates needed, skipping batch commit");
      }
      
      return { processed, updated, unchanged, skipped: skippedCount };
    } catch (error) {
      console.error("ERROR IN DEDUCTIBILITY EVALUATION:", error);
      throw error;
    }
  },

  /**
   * Evaluates income recognition for all unlocked issued invoices (income/revenue)
   */
  async evaluateIncome(clientId: string): Promise<{
    processed: number;
    updated: number;
    unchanged: number;
    skipped: number;
  }> {
    try {
      // 1. Get all invoices that need evaluation
      console.log("Step 1: Getting invoices to evaluate");
      const invoices = await this.getInvoices(clientId);
      
      // Log how many invoices are locked so we can verify the filter is working
      const lockedCount = invoices.filter(inv => !inv.recibida && inv.locked).length;
      console.log(`Found ${lockedCount} locked income invoices that will be skipped`);
      
      // Only evaluate issued (not received) invoices
      const eligibleInvoices = invoices.filter(invoice => 
        !invoice.recibida && // This is the key difference - we want issued invoices
        !invoice.locked && 
        invoice.tipoDeComprobante !== 'P' &&
        !invoice.usoCFDI?.startsWith('C')
      );
      
      const skippedCount = invoices.filter(inv => !inv.recibida).length - eligibleInvoices.length;
      console.log(`Found ${eligibleInvoices.length} eligible income invoices for evaluation`);
      
      if (eligibleInvoices.length === 0) {
        return { processed: 0, updated: 0, unchanged: 0, skipped: skippedCount };
      }
      
      // 2. Get payment complement information
      console.log("Step 2: Mapping payment complements");
      const paymentMap = await this._buildPaymentComplementMap(clientId);
      
      // 3. Batch update preparation
      const batch = writeBatch(db);
      let processed = 0;
      let updated = 0;
      let unchanged = 0;
      
      // 4. Process each invoice individually
      for (const invoice of eligibleInvoices) {
        processed++;
        console.log(`\n------- Processing invoice ${invoice.uuid} -------`);
        console.log(`To: ${invoice.rfcReceptor}, Method: ${invoice.metodoPago}`);
        
        // Skip manually modified invoices
        if (invoice.gravadoModificado === true) {
          console.log(`🖐️ Invoice has manually modified values - preserving them`);
          unchanged++;
          continue;
        }
        
        // Get current status - for income, esDeducible means recognized income
        const currentStatus = {
          isRecognized: invoice.esDeducible === true,
          month: invoice.mesDeduccion
        };
        console.log(`Current status: Recognized=${currentStatus.isRecognized}, Month=${currentStatus.month}`);
        
        // Determine if this invoice should be recognized as income
        const { shouldBeRecognized, recognitionMonth } = 
          this._determineInvoiceIncome(invoice, paymentMap);
        
        // Check if update is needed
        const needsUpdate = currentStatus.isRecognized !== shouldBeRecognized || 
                           currentStatus.month !== recognitionMonth;
        
        console.log(`Result: ${needsUpdate ? "NEEDS UPDATE" : "No change needed"}`);
        console.log(`- From: Recognized=${currentStatus.isRecognized}, Month=${currentStatus.month}`);
        console.log(`- To:   Recognized=${shouldBeRecognized}, Month=${recognitionMonth}`);
        
        if (needsUpdate) {
          const invoiceRef = doc(db, 'clients', clientId, 'cfdi', invoice.uuid);
          const updateData: Partial<Invoice> = {
            esDeducible: shouldBeRecognized,
            mesDeduccion: recognitionMonth
          };
          
          // Set gravado values based on recognition - for income, this represents taxable income
          if (shouldBeRecognized) {
            // For issued invoices, gravadoISR is the net income (subtract retentions)
            const baseAmount = invoice.subTotal || 0;
            const isrWithheld = invoice.isrRetenido || 0;
            const ivaWithheld = invoice.ivaRetenido || 0;
            
            // Calculate "gravado" values - these represent taxable amounts for income invoices
            updateData.gravadoISR = Math.round((baseAmount - isrWithheld) * 100) / 100;
            updateData.gravadoIVA = Math.round(baseAmount * 0.16 * 100) / 100; // Estimate IVA at 16%
            updateData.gravadoModificado = false;
          } else {
            updateData.gravadoISR = 0;
            updateData.gravadoIVA = 0;
            updateData.gravadoModificado = false;
          }
          
          batch.update(invoiceRef, this._sanitizeForFirestore({
            ...updateData,
            updatedAt: new Date().toISOString()
          }));
          updated++;
        } else {
          unchanged++;
        }
      }
      
      // 5. Commit all changes
      console.log(`\nCommitting changes: ${updated} updates, ${unchanged} unchanged`);
      if (updated > 0) {
        await batch.commit();
        console.log("Batch committed successfully");
      } else {
        console.log("No updates needed, skipping batch commit");
      }
      
      return { processed, updated, unchanged, skipped: skippedCount };
    } catch (error) {
      console.error("ERROR IN INCOME EVALUATION:", error);
      throw error;
    }
  }
};
