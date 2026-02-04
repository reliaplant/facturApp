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
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, getBytes } from 'firebase/storage';
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
      
      // Sanitizar datos: remover undefined y convertir a null si es necesario
      const sanitizedData = this._sanitizeForFirestore(clientData);
      
      await updateDoc(clientRef, { 
        ...sanitizedData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating client:", error);
      throw error;
    }
  },
  
  // Delete client (solo el documento principal)
  async deleteClient(clientId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'clients', clientId));
    } catch (error) {
      console.error("Error deleting client:", error);
      throw error;
    }
  },

  /**
   * Elimina un cliente y TODOS sus datos relacionados (solo super admin)
   * Incluye: CFDIs, declaraciones, activos fijos, facturas extranjeras, 
   * proveedores, resúmenes fiscales, solicitudes SAT y archivos en Storage
   */
  async deleteClientAndAllData(clientId: string, clientRfc: string): Promise<{
    success: boolean;
    deletedCounts: {
      cfdi: number;
      declaraciones: number;
      fixedAssets: number;
      facturasManuales: number;
      suppliers: number;
      fiscalSummary: number;
      satRequests: number;
      storageFiles: number;
    };
    errors: string[];
  }> {
    const deletedCounts = {
      cfdi: 0,
      declaraciones: 0,
      fixedAssets: 0,
      facturasManuales: 0,
      suppliers: 0,
      fiscalSummary: 0,
      satRequests: 0,
      storageFiles: 0
    };
    const errors: string[] = [];

    try {
      console.log(`🗑️ Iniciando eliminación completa del cliente: ${clientId} (RFC: ${clientRfc})`);

      // 1. Eliminar subcolección: cfdi
      try {
        const cfdiRef = collection(db, 'clients', clientId, 'cfdi');
        const cfdiDocs = await getDocs(cfdiRef);
        for (const docSnap of cfdiDocs.docs) {
          await deleteDoc(docSnap.ref);
          deletedCounts.cfdi++;
        }
        console.log(`✅ Eliminados ${deletedCounts.cfdi} CFDIs`);
      } catch (error) {
        console.error('Error eliminando CFDIs:', error);
        errors.push(`Error eliminando CFDIs: ${error}`);
      }

      // 2. Eliminar subcolección: declaraciones
      try {
        const declaracionesRef = collection(db, 'clients', clientId, 'declaraciones');
        const declaracionesDocs = await getDocs(declaracionesRef);
        for (const docSnap of declaracionesDocs.docs) {
          await deleteDoc(docSnap.ref);
          deletedCounts.declaraciones++;
        }
        console.log(`✅ Eliminadas ${deletedCounts.declaraciones} declaraciones`);
      } catch (error) {
        console.error('Error eliminando declaraciones:', error);
        errors.push(`Error eliminando declaraciones: ${error}`);
      }

      // 3. Eliminar subcolección: fixedAssets (con sus subcolecciones de depreciaciones)
      try {
        const fixedAssetsRef = collection(db, 'clients', clientId, 'fixedAssets');
        const fixedAssetsDocs = await getDocs(fixedAssetsRef);
        for (const docSnap of fixedAssetsDocs.docs) {
          // Primero eliminar subcolección de depreciaciones del activo
          const depreciationsRef = collection(db, 'clients', clientId, 'fixedAssets', docSnap.id, 'depreciations');
          const depreciationsDocs = await getDocs(depreciationsRef);
          for (const depDoc of depreciationsDocs.docs) {
            await deleteDoc(depDoc.ref);
          }
          // Luego eliminar el activo
          await deleteDoc(docSnap.ref);
          deletedCounts.fixedAssets++;
        }
        console.log(`✅ Eliminados ${deletedCounts.fixedAssets} activos fijos`);
      } catch (error) {
        console.error('Error eliminando activos fijos:', error);
        errors.push(`Error eliminando activos fijos: ${error}`);
      }

      // 4. Eliminar subcolección: facturasManuales (facturas extranjeras)
      try {
        const facturasRef = collection(db, 'clients', clientId, 'facturasManuales');
        const facturasDocs = await getDocs(facturasRef);
        for (const docSnap of facturasDocs.docs) {
          await deleteDoc(docSnap.ref);
          deletedCounts.facturasManuales++;
        }
        console.log(`✅ Eliminadas ${deletedCounts.facturasManuales} facturas manuales/extranjeras`);
      } catch (error) {
        console.error('Error eliminando facturas manuales:', error);
        errors.push(`Error eliminando facturas manuales: ${error}`);
      }

      // 5. Eliminar subcolección: suppliers
      try {
        const suppliersRef = collection(db, 'clients', clientId, 'suppliers');
        const suppliersDocs = await getDocs(suppliersRef);
        for (const docSnap of suppliersDocs.docs) {
          await deleteDoc(docSnap.ref);
          deletedCounts.suppliers++;
        }
        console.log(`✅ Eliminados ${deletedCounts.suppliers} proveedores`);
      } catch (error) {
        console.error('Error eliminando proveedores:', error);
        errors.push(`Error eliminando proveedores: ${error}`);
      }

      // 6. Eliminar subcolección: fiscalSummary
      try {
        const fiscalRef = collection(db, 'clients', clientId, 'fiscalSummary');
        const fiscalDocs = await getDocs(fiscalRef);
        for (const docSnap of fiscalDocs.docs) {
          await deleteDoc(docSnap.ref);
          deletedCounts.fiscalSummary++;
        }
        console.log(`✅ Eliminados ${deletedCounts.fiscalSummary} resúmenes fiscales`);
      } catch (error) {
        console.error('Error eliminando resúmenes fiscales:', error);
        errors.push(`Error eliminando resúmenes fiscales: ${error}`);
      }

      // 7. Eliminar solicitudes SAT (colección satRequests filtrada por RFC)
      try {
        const satRequestsRef = collection(db, 'satRequests');
        const q = query(satRequestsRef, where('rfc', '==', clientRfc));
        const satRequestsDocs = await getDocs(q);
        for (const docSnap of satRequestsDocs.docs) {
          await deleteDoc(docSnap.ref);
          deletedCounts.satRequests++;
        }
        console.log(`✅ Eliminadas ${deletedCounts.satRequests} solicitudes SAT`);
      } catch (error) {
        console.error('Error eliminando solicitudes SAT:', error);
        errors.push(`Error eliminando solicitudes SAT: ${error}`);
      }

      // 8. Eliminar archivos en Storage
      try {
        // Intentar eliminar carpetas conocidas del cliente en Storage
        const storagePaths = [
          `clients/${clientId}/fiel`,
          `clients/${clientId}/csf`,
          `clients/${clientId}/opf`,
          `clients/${clientId}/declaraciones`,
          `clients/${clientId}/documentos`
        ];
        
        for (const path of storagePaths) {
          try {
            // Nota: Firebase Storage no permite listar archivos directamente sin Admin SDK
            // Intentamos eliminar archivos conocidos
            const knownFiles = ['certificado.cer', 'llave.key', 'clave.txt'];
            for (const file of knownFiles) {
              try {
                const fileRef = ref(storage, `${path}/${file}`);
                await deleteObject(fileRef);
                deletedCounts.storageFiles++;
              } catch {
                // Archivo no existe, continuar
              }
            }
          } catch {
            // Carpeta no existe, continuar
          }
        }
        console.log(`✅ Eliminados ${deletedCounts.storageFiles} archivos de Storage`);
      } catch (error) {
        console.error('Error eliminando archivos de Storage:', error);
        errors.push(`Error eliminando archivos de Storage: ${error}`);
      }

      // 9. Desasociar el usuario que tenía este cliente asignado
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('clientId', '==', clientId));
        const usersDocs = await getDocs(q);
        for (const docSnap of usersDocs.docs) {
          await updateDoc(docSnap.ref, { clientId: null });
          console.log(`✅ Usuario ${docSnap.id} desasociado del cliente`);
        }
      } catch (error) {
        console.error('Error desasociando usuario:', error);
        errors.push(`Error desasociando usuario: ${error}`);
      }

      // 10. Finalmente, eliminar el documento principal del cliente
      try {
        await deleteDoc(doc(db, 'clients', clientId));
        console.log(`✅ Cliente ${clientId} eliminado correctamente`);
      } catch (error) {
        console.error('Error eliminando documento principal del cliente:', error);
        errors.push(`Error eliminando documento principal: ${error}`);
        throw error; // Este error es crítico
      }

      return {
        success: errors.length === 0,
        deletedCounts,
        errors
      };

    } catch (error) {
      console.error("Error en eliminación completa del cliente:", error);
      errors.push(`Error general: ${error}`);
      return {
        success: false,
        deletedCounts,
        errors
      };
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
    documentType: 'cer' | 'acuseCer' | 'keyCer' | 'renCer' | 'claveFiel' | 'cartaManifiesto' | 'contrato'
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
        case 'contrato':
          fileName = 'contrato.pdf';
          break;
        case 'cartaManifiesto':
          fileName = 'carta_manifiesto.pdf';
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
        case 'contrato':
          updateData.contratoUrl = downloadUrl;
          updateData.contratoDate = currentDate;
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

  /**
   * Guarda la contraseña de la FIEL directamente como texto
   * Se guarda como archivo clave.txt en Storage para mantener compatibilidad con Cloud Functions
   * También se guarda en Firestore para lectura rápida sin CORS
   */
  async saveFielPassword(clientId: string, password: string): Promise<{url: string, date: string}> {
    try {
      const path = `clients/${clientId}/fiel/clave.txt`;
      const storageRef = ref(storage, path);
      
      // Crear un blob con la contraseña
      const blob = new Blob([password], { type: 'text/plain' });
      
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      const currentDate = new Date().toISOString();
      
      // Actualizar el documento del cliente (incluye contraseña para lectura sin CORS)
      const clientRef = doc(db, 'clients', clientId);
      await updateDoc(clientRef, {
        claveFielUrl: downloadUrl,
        claveFielDate: currentDate,
        fielPassword: password // Guardar también en Firestore para lectura rápida
      });
      
      return {
        url: downloadUrl,
        date: currentDate
      };
    } catch (error) {
      console.error("Error saving FIEL password:", error);
      throw error;
    }
  },

  /**
   * Obtiene la contraseña de la FIEL desde Firestore
   */
  async getFielPassword(clientId: string): Promise<string | null> {
    try {
      const clientRef = doc(db, 'clients', clientId);
      const clientSnap = await getDoc(clientRef);
      
      if (clientSnap.exists()) {
        const data = clientSnap.data();
        return data.fielPassword || null;
      }
      return null;
    } catch (error) {
      console.error("Error getting FIEL password:", error);
      return null;
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
