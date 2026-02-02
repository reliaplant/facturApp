// Tipos de documentos legales
export type LegalDocumentType = 'terminos' | 'privacidad' | 'cookies';

export const LEGAL_DOCUMENT_TYPES: Record<LegalDocumentType, string> = {
  'terminos': 'Términos y Condiciones',
  'privacidad': 'Aviso de Privacidad',
  'cookies': 'Política de Cookies'
};

export interface LegalDocument {
  id?: string;
  type: LegalDocumentType;
  title: string;
  content: string; // HTML content from TipTap
  version: string; // e.g., "1.0", "1.1", "2.0"
  isActive: boolean; // Si es la versión vigente
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string; // userId del creador
  updatedBy?: string; // userId del último editor
}

export interface CreateLegalDocumentData {
  type: LegalDocumentType;
  title: string;
  content: string;
  version: string;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateLegalDocumentData {
  title?: string;
  content?: string;
  version?: string;
  isActive?: boolean;
  updatedBy?: string;
}
