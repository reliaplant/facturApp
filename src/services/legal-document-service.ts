import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  LegalDocument, 
  LegalDocumentType, 
  CreateLegalDocumentData, 
  UpdateLegalDocumentData 
} from '@/models/LegalDocument';

const COLLECTION_NAME = 'legalDocuments';

class LegalDocumentService {
  private collectionRef = collection(db, COLLECTION_NAME);

  // Obtener el documento de un tipo (para páginas públicas)
  async getActiveDocument(type: LegalDocumentType): Promise<LegalDocument | null> {
    const q = query(
      this.collectionRef,
      where('type', '==', type)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const docs = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || d.data().createdAt,
      updatedAt: d.data().updatedAt?.toDate?.() || d.data().updatedAt
    })) as LegalDocument[];
    
    // Priorizar el que tiene isActive=true, sino el primero
    return docs.find(d => d.isActive) || docs[0];
  }

  // Obtener un documento por ID
  async getDocumentById(id: string): Promise<LegalDocument | null> {
    const docRef = doc(this.collectionRef, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate?.() || docSnap.data().createdAt,
      updatedAt: docSnap.data().updatedAt?.toDate?.() || docSnap.data().updatedAt
    } as LegalDocument;
  }

  // Crear nuevo documento
  async createDocument(data: CreateLegalDocumentData): Promise<LegalDocument> {
    const now = Timestamp.now();
    
    const docData = {
      ...data,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now
    };
    
    const docRef = await addDoc(this.collectionRef, docData);
    
    return {
      id: docRef.id,
      ...docData,
      createdAt: now.toDate(),
      updatedAt: now.toDate()
    } as LegalDocument;
  }

  // Actualizar documento
  async updateDocument(id: string, data: UpdateLegalDocumentData): Promise<void> {
    const docRef = doc(this.collectionRef, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  }

  // Eliminar documento
  async deleteDocument(id: string): Promise<void> {
    const docRef = doc(this.collectionRef, id);
    await deleteDoc(docRef);
  }

  // Obtener todos los documentos (para admin)
  async getAllDocuments(): Promise<LegalDocument[]> {
    const snapshot = await getDocs(this.collectionRef);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || d.data().createdAt,
      updatedAt: d.data().updatedAt?.toDate?.() || d.data().updatedAt
    })) as LegalDocument[];
  }
}

export const legalDocumentService = new LegalDocumentService();
