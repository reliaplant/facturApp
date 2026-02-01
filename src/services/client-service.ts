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
  getDocs,
  orderBy
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import app from '@/services/firebase';
import { Client } from '@/models/Client';

const db = getFirestore(app);
const storage = getStorage(app);

// Define types that match the Client model
export interface CreateClientData {
  rfc: string;
  curp?: string;
  name: string;  // Simplified to just 'name'
  email?: string;
  telefono?: string;
}

export interface UpdateClientData extends Partial<Client> {}

export const clientService = {
  // Create a new client
  async createClient(clientData: CreateClientData): Promise<Client> {
    try {
      const clientId = clientData.rfc;
      
      // Create a client object with both name fields for compatibility
      const newClient: Client = {
        id: clientId,
        rfc: clientData.rfc,
        curp: clientData.curp || '',
        // Set both the new name field and the required name fields
        name: clientData.name,
        nombres: clientData.name.split(' ')[0] || clientData.name, // First part as nombres
        primerApellido: clientData.name.split(' ').slice(1).join(' ') || 'N/A', // Rest as primerApellido or default
        fechaInicioOperaciones: new Date().toISOString(),
        estatusEnElPadron: 'ACTIVO',
        fechaUltimoCambioEstado: new Date().toISOString(),
        ultimaActualizacionDatos: new Date().toISOString(),
        address: {
          nombreColonia: '',
          nombreLocalidad: '',
          municipio: '',
          nombreEntidadFederativa: ''
        },
        actividadesEconomicas: [],
        regimenesFiscales: [],
        obligaciones: [],
        estatusPago: 'PENDIENTE',
        estatusCliente: 'ACTIVO',
        estatusDeclaracion: 'PENDIENTE',
        estatusDeclaracionPagoCliente: 'PENDIENTE',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add optional fields
      if (clientData.email) newClient.email = clientData.email;
      if (clientData.telefono) newClient.telefono = clientData.telefono;
      
      await setDoc(doc(db, 'clients', clientId), newClient);
      
      return newClient;
    } catch (error) {
      console.error("Error creating client:", error);
      throw error;
    }
  },
  
  // Get client by ID
  async getClientById(clientId: string): Promise<Client | null> {
    try {
      if (!clientId) {
        console.error("getClientById: Client ID is null or undefined");
        return null;
      }
      
      const clientRef = doc(db, 'clients', clientId);
      const clientDoc = await getDoc(clientRef);
      
      if (clientDoc.exists()) {
        const data = clientDoc.data() as Client;
        
        // Ensure the name field exists for backward compatibility
        const clientData = {
          ...data,
          id: clientId,
          // Add name field if it doesn't exist
          name: data.name || `${data.nombres || ''} ${data.primerApellido || ''}`.trim(),
          actividadesEconomicas: data.actividadesEconomicas || [],
          obligaciones: data.obligaciones || [],
          listaPendientes: data.listaPendientes || []
        };
        
        return clientData;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting client with ID ${clientId}:`, error);
      throw error;
    }
  },
  
  // Update client
  async updateClient(clientId: string, clientData: UpdateClientData): Promise<void> {
    try {
      const clientRef = doc(db, 'clients', clientId);
      
      await updateDoc(clientRef, { 
        ...clientData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating client:", error);
      throw error;
    }
  },
  
  // Delete client
  async deleteClient(clientId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'clients', clientId));
    } catch (error) {
      console.error("Error deleting client:", error);
      throw error;
    }
  },
  
  // Get all clients
  async getAllClients(): Promise<Client[]> {
    try {
      const clientsRef = collection(db, 'clients');
      // Use rfc for ordering in case name isn't available on all documents
      const q = query(clientsRef, orderBy('rfc'));
      const querySnapshot = await getDocs(q);
      
      const clients: Client[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Client;
        // Ensure each client has a name field
        clients.push({
          ...data,
          id: doc.id,
          name: data.name || `${data.nombres || ''} ${data.primerApellido || ''}`.trim()
        });
      });
      
      return clients;
    } catch (error) {
      console.error("Error getting clients:", error);
      throw error;
    }
  },
  
  // Find client by RFC
  async findClientByRfc(rfc: string): Promise<Client | null> {
    try {
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, where("rfc", "==", rfc));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as Client;
      }
      
      return null;
    } catch (error) {
      console.error("Error finding client:", error);
      throw error;
    }
  },
  
  // Activate/deactivate client
  async toggleClientStatus(clientId: string, isActive: boolean, reason?: string): Promise<void> {
    try {
      const clientRef = doc(db, 'clients', clientId);
      
      const updateData: any = {
        isActive,
        updatedAt: new Date().toISOString()
      };
      
      if (!isActive) {
        updateData.inactiveDate = new Date().toISOString();
        updateData.inactiveReason = reason || 'No reason provided';
      } else {
        updateData.inactiveDate = null;
        updateData.inactiveReason = null;
      }
      
      await updateDoc(clientRef, updateData);
    } catch (error) {
      console.error("Error toggling client status:", error);
      throw error;
    }
  },
  
  // Upload FIEL document
  async uploadFielDocument(
    clientId: string, 
    file: File, 
    documentType: 'cer' | 'acuseCer' | 'keyCer' | 'renCer' | 'claveFiel' | 'cartaManifiesto'
  ): Promise<{url: string, date: string}> {
    try {
      const timestamp = new Date().getTime();
      
      // Determine the filename based on document type
      let fileName: string;
      switch (documentType) {
        case 'cer':
          fileName = 'certificado.cer';
          break;
        case 'keyCer':
          fileName = 'llave.key';
          break;
        case 'claveFiel':
          fileName = 'clave.txt';
          break;
        default:
          // For other document types, keep the timestamp to avoid overwriting
          fileName = `${documentType}_${timestamp}`;
      }
      
      const path = `clients/${clientId}/fiel/${fileName}`;
      const storageRef = ref(storage, path);
      
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      const currentDate = new Date().toISOString();
      
      // Update client document with the new URL and date
      const clientRef = doc(db, 'clients', clientId);
      const updateData: Record<string, string> = {};
      
      switch (documentType) {
        case 'cer':
          updateData.cerUrl = downloadUrl;
          updateData.cerDate = currentDate;
          break;
        case 'acuseCer':
          updateData.acuseCerUrl = downloadUrl;
          updateData.acuseCerDate = currentDate;
          break;
        case 'keyCer':
          updateData.keyCerUrl = downloadUrl;
          updateData.keyCerDate = currentDate;
          break;
        case 'renCer':
          updateData.renCerUrl = downloadUrl;
          updateData.renCerDate = currentDate;
          break;
        case 'claveFiel':
          updateData.claveFielUrl = downloadUrl;
          updateData.claveFielDate = currentDate;
          break;
        case 'cartaManifiesto':
          updateData.cartaManifiestoUrl = downloadUrl;
          updateData.cartaManifiestoDate = currentDate;
          break;
      }
      
      await updateDoc(clientRef, updateData);
      
      return {
        url: downloadUrl,
        date: currentDate
      };
    } catch (error) {
      console.error(`Error uploading ${documentType} document:`, error);
      throw error;
    }
  },

  // Delete file from storage
  async deleteFileFromStorage(filePath: string): Promise<void> {
    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      console.log(`File deleted successfully from path: ${filePath}`);
    } catch (error) {
      console.error(`Error deleting file from path ${filePath}:`, error);
      throw error;
    }
  },

  // Helper function to sanitize objects for Firestore
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
      // Skip undefined values entirely
      if (value !== undefined) {
        sanitized[key] = this._sanitizeForFirestore(value);
      }
    }
    
    return sanitized;
  }
};
