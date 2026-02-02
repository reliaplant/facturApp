"use client";

import { useState, useEffect } from "react";
import { legalDocumentService } from "@/services/legal-document-service";
import { LegalDocument } from "@/models/LegalDocument";
import Link from "next/link";
import Image from "next/image";

export default function CookiesPage() {
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDocument() {
      try {
        const doc = await legalDocumentService.getActiveDocument("cookies");
        setDocument(doc);
      } catch (error) {
        console.error("Error loading document:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadDocument();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Image src="/assets/logoKontia.png" alt="Kontia" width={120} height={40} className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Logo */}
        <Link href="/">
          <Image src="/assets/logoKontia.png" alt="Kontia" width={100} height={35} className="mb-12" />
        </Link>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Política de Cookies</h1>
        {document && (
          <p className="text-xs text-gray-400 mb-8">Última actualización: {new Date(document.updatedAt).toLocaleDateString("es-MX")}</p>
        )}
        
        {/* Content */}
        {document ? (
          <div 
            className="prose prose-gray prose-sm max-w-none text-gray-600"
            dangerouslySetInnerHTML={{ __html: document.content }}
          />
        ) : (
          <p className="text-gray-500">Documento no disponible.</p>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t text-xs text-gray-400 text-center">
          <p>© 2026 Kontia. Todos los derechos reservados.</p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="/terminos" className="hover:text-gray-600">Términos</Link>
            <Link href="/privacidad" className="hover:text-gray-600">Privacidad</Link>
            <Link href="/cookies" className="hover:text-gray-600">Cookies</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
