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
import app from '@/services/firebase';
import { Client, CreateClientData, UpdateClientData } from '@/models/Client';

const db = getFirestore(app);

export const clientService = {
  // Create a new client
  async createClient(clientData: CreateClientData): Promise<Client> {
    try {
      const clientId = `client_${Date.now()}`;
      
      // Create a base client object with required fields
      const newClient: Client = {
        id: clientId,
        name: clientData.name,
        rfc: clientData.rfc,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Only add optional fields if they exist
      if (clientData.email) newClient.email = clientData.email;
      if (clientData.phone) newClient.phone = clientData.phone;
      if (clientData.curp) newClient.curp = clientData.curp;
      
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
      const clientDoc = await getDoc(doc(db, 'clients', clientId));
      
      if (clientDoc.exists()) {
        return clientDoc.data() as Client;
      }
      
      return null;
    } catch (error) {
      console.error("Error getting client:", error);
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
      const q = query(clientsRef, orderBy('name'));
      const querySnapshot = await getDocs(q);
      
      const clients: Client[] = [];
      querySnapshot.forEach((doc) => {
        clients.push(doc.data() as Client);
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
        // If reactivating, clear inactive data
        updateData.inactiveDate = null;
        updateData.inactiveReason = null;
      }
      
      await updateDoc(clientRef, updateData);
    } catch (error) {
      console.error("Error toggling client status:", error);
      throw error;
    }
  },
  
  // For development/demo purposes - get mock clients when Firestore is not available
  getMockClients(): Client[] {
    return [
      { 
        id: "1",
        name: "Andrés González",
        rfc: "GOGA9302255S8",
        curp: "GOLA820930MDFNRN09",
        email: "andres@ejemplo.com",
        phone: "55 1234 5678",
        lastAccess: "2023-12-01",
        isActive: true,
        address: {
          street: "Av. Insurgentes Sur",
          exteriorNumber: "1602",
          interiorNumber: "304",
          colony: "Crédito Constructor",
          city: "Ciudad de México",
          state: "CDMX",
          zipCode: "03940"
        },
        fiscalInfo: {
          regime: "Régimen de Personas Físicas con Actividades Empresariales y Profesionales",
          economicActivity: "Servicios legales",
          registrationDate: "2010-01-15",
          lastUpdateDate: "2023-03-22",
          status: "Activo",
          obligations: ["Declaración anual de ISR", "Declaraciones mensuales de IVA"]
        },
        serviceInfo: {
          clientSince: "2022-01-01",
          plan: "Premium Contable",
          planDescription: "Incluye: Contabilidad, Declaraciones, Asesoría fiscal",
          lastInvoice: "2025-03-01",
          nextRenewal: "2025-04-30"
        }
      },
      { 
        id: "2",
        name: "María Rodríguez López",
        rfc: "ROLM750630XYZ",
        lastAccess: "2023-11-28",
        isActive: true
      },
      {
        id: "3",
        name: "Empresa ABC, S.A. de C.V.",
        rfc: "EAB960909123",
        lastAccess: "2023-12-02",
        isActive: false,
        inactiveDate: "2023-11-01",
        inactiveReason: "Falta de pago"
      }
    ];
  }
};
