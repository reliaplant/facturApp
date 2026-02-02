'use client';

import { useState, useEffect } from 'react';
import { legalDocumentService } from '@/services/legal-document-service';
import { 
  LegalDocument, 
  LegalDocumentType, 
  LEGAL_DOCUMENT_TYPES 
} from '@/models/LegalDocument';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const TipTapEditor = dynamic(() => import('@/components/TipTapEditor'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />
});

export default function LegalDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Record<LegalDocumentType, LegalDocument | null>>({
    'terminos': null,
    'privacidad': null,
    'cookies': null
  });
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<LegalDocumentType>('terminos');
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [saving, setSaving] = useState(false);

  const hasChanges = content !== originalContent;

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await legalDocumentService.getAllDocuments();
      const docsMap: Record<LegalDocumentType, LegalDocument | null> = {
        'terminos': null,
        'privacidad': null,
        'cookies': null
      };
      
      docs.forEach(doc => {
        if (!docsMap[doc.type] || doc.isActive) {
          docsMap[doc.type] = doc;
        }
      });
      
      setDocuments(docsMap);
      
      const currentDoc = docsMap[selectedType];
      setContent(currentDoc?.content || '');
      setOriginalContent(currentDoc?.content || '');
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeType = (newType: LegalDocumentType) => {
    if (newType === selectedType) return;
    if (hasChanges && !confirm('Tienes cambios sin guardar. ¿Continuar?')) return;
    
    setSelectedType(newType);
    const doc = documents[newType];
    setContent(doc?.content || '');
    setOriginalContent(doc?.content || '');
  };

  const handleSave = async () => {
    if (!content.trim()) {
      alert('El contenido no puede estar vacío');
      return;
    }

    setSaving(true);
    try {
      const existingDoc = documents[selectedType];
      
      if (existingDoc) {
        await legalDocumentService.updateDocument(existingDoc.id!, {
          content,
          updatedBy: user?.uid
        });
      } else {
        await legalDocumentService.createDocument({
          type: selectedType,
          title: LEGAL_DOCUMENT_TYPES[selectedType],
          content,
          version: '1.0',
          isActive: true,
          createdBy: user?.uid
        });
      }
      
      setOriginalContent(content);
      await loadDocuments();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col p-4">
        <Skeleton className="h-10 w-96 mb-4" />
        <Skeleton className="flex-1" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b bg-gray-50 flex items-center justify-between">
        <Tabs value={selectedType} onValueChange={(v) => handleChangeType(v as LegalDocumentType)}>
          <TabsList>
            <TabsTrigger value="terminos">Términos y Condiciones</TabsTrigger>
            <TabsTrigger value="privacidad">Aviso de Privacidad</TabsTrigger>
            <TabsTrigger value="cookies">Política de Cookies</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {hasChanges && (
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Guardar
          </Button>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 overflow-auto">
        <TipTapEditor 
          key={selectedType} 
          content={content} 
          onChange={setContent} 
        />
      </div>
    </div>
  );
}
