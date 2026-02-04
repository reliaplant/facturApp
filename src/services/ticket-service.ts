import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from './firebase';
import app from './firebase';
import { Ticket } from '@/models/Ticket';

const COLLECTION_NAME = 'tickets';
const storage = getStorage(app);

export const ticketService = {
  // Obtener todos los tickets
  async getTickets(): Promise<Ticket[]> {
    try {
      const ticketsRef = collection(db, COLLECTION_NAME);
      const q = query(ticketsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw error;
    }
  },

  // Crear un nuevo ticket
  async createTicket(
    ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'estatus'>,
    imageFile?: File
  ): Promise<string> {
    try {
      let imagenUrl: string | null = null;

      // Subir imagen si existe
      if (imageFile) {
        try {
          const timestamp = Date.now();
          const path = `tickets/${timestamp}_${imageFile.name}`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, imageFile);
          imagenUrl = await getDownloadURL(storageRef);
        } catch (storageError) {
          console.error('Error uploading image, continuing without it:', storageError);
          // Continuar sin imagen si falla el upload
        }
      }

      const now = new Date().toISOString();
      const ticketData: Record<string, any> = {
        tipo: ticket.tipo,
        descripcion: ticket.descripcion,
        creadoPor: ticket.creadoPor,
        creadoPorNombre: ticket.creadoPorNombre,
        estatus: 'pendiente',
        createdAt: now,
        updatedAt: now,
      };

      // Solo agregar imagenUrl si existe
      if (imagenUrl) {
        ticketData.imagenUrl = imagenUrl;
      }

      const docRef = await addDoc(collection(db, COLLECTION_NAME), ticketData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  },

  // Actualizar estatus del ticket (solo super admin)
  async updateTicketStatus(
    ticketId: string, 
    estatus: Ticket['estatus'],
    notas?: string
  ): Promise<void> {
    try {
      const ticketRef = doc(db, COLLECTION_NAME, ticketId);
      const updateData: Partial<Ticket> = {
        estatus,
        updatedAt: new Date().toISOString(),
      };

      if (notas !== undefined) {
        updateData.notas = notas;
      }

      if (estatus === 'resuelto' || estatus === 'cerrado') {
        updateData.resolvedAt = new Date().toISOString();
      }

      await updateDoc(ticketRef, updateData);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  },

  // Eliminar ticket (solo super admin)
  async deleteTicket(ticketId: string): Promise<void> {
    try {
      const ticketRef = doc(db, COLLECTION_NAME, ticketId);
      await deleteDoc(ticketRef);
    } catch (error) {
      console.error('Error deleting ticket:', error);
      throw error;
    }
  },

  // Subir imagen desde clipboard/paste
  async uploadImageFromClipboard(blob: Blob): Promise<string> {
    try {
      const timestamp = Date.now();
      const path = `tickets/${timestamp}_clipboard.png`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error uploading clipboard image:', error);
      throw error;
    }
  }
};
