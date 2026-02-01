'use client';

import { useState } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { clientService } from '@/services/client-service';
import { Client } from '@/models/Client';
import { formatDate } from './infoClientePF';
import { FiUpload, FiTrash2, FiDownload, FiFileText, FiCheckCircle } from 'react-icons/fi';
import app from '@/services/firebase';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker locally
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Initialize Firebase storage directly here to avoid dependency issues
const storage = getStorage(app);

// Interface for extracted CSF data
interface CSFData {
  // CSF identification
  idCIF?: string;  // ID for validation (e.g., 19030152512)
  
  // Personal data
  rfc?: string;
  curp?: string;
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  
  // Fiscal status
  fechaInicioOperaciones?: string;
  estatusEnElPadron?: string;
  fechaUltimoCambioEstado?: string;
  
  // Address
  address?: {
    codigoPostal?: string;
    tipoVialidad?: string;
    nombreVialidad?: string;
    numeroExterior?: string;
    numeroInterior?: string;
    nombreColonia?: string;
    nombreLocalidad?: string;
    municipio?: string;
    nombreEntidadFederativa?: string;
    entreCalles?: string;
  };
  
  // Economic activities (Actividades Económicas)
  actividadesEconomicas?: Array<{
    orden: number;
    actividad: string;
    porcentaje: number;
    fechaInicio: string;
    fechaFin?: string;
  }>;
  
  // Fiscal Regimes (Regímenes)
  regimenesFiscales?: Array<{
    regimen: string;
    fechaInicio: string;
    fechaFin?: string;
  }>;
  
  // Obligations (Obligaciones)
  obligaciones?: Array<{
    descripcion: string;
    descripcionVencimiento: string;
    fechaInicio: string;
    fechaFin?: string;
  }>;
}

// Function to extract text from PDF
async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}

// Function to parse CSF text and extract data
function parseCSFText(text: string): CSFData {
  const data: CSFData = {};
  
  // Clean and normalize text
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Extract idCIF - the validation ID (e.g., "idCIF: 19030152512")
  const idCIFMatch = cleanText.match(/idCIF:\s*(\d+)/i);
  if (idCIFMatch) data.idCIF = idCIFMatch[1];
  
  // Extract RFC
  const rfcMatch = cleanText.match(/RFC:\s*([A-Z]{3,4}\d{6}[A-Z0-9]{3})/i) ||
                   cleanText.match(/([A-Z]{4}\d{6}[A-Z0-9]{3})/);
  if (rfcMatch) data.rfc = rfcMatch[1].toUpperCase();
  
  // Extract CURP
  const curpMatch = cleanText.match(/CURP:\s*([A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d)/i) ||
                    cleanText.match(/([A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d)/);
  if (curpMatch) data.curp = curpMatch[1].toUpperCase();
  
  // Extract name components - look for patterns common in CSF
  const nombreMatch = cleanText.match(/Nombre\s*\(s\):\s*([A-ZÁÉÍÓÚÑ\s]+?)(?=Primer|Apellido|$)/i) ||
                      cleanText.match(/Nombre:\s*([A-ZÁÉÍÓÚÑ\s]+?)(?=Primer|Apellido|RFC|$)/i);
  if (nombreMatch) data.nombre = nombreMatch[1].trim();
  
  const primerApellidoMatch = cleanText.match(/Primer\s*Apellido:\s*([A-ZÁÉÍÓÚÑ\s]+?)(?=Segundo|Nombre|$)/i);
  if (primerApellidoMatch) data.primerApellido = primerApellidoMatch[1].trim();
  
  const segundoApellidoMatch = cleanText.match(/Segundo\s*Apellido:\s*([A-ZÁÉÍÓÚÑ\s]+?)(?=Nombre|CURP|$)/i);
  if (segundoApellidoMatch) data.segundoApellido = segundoApellidoMatch[1].trim();
  
  // Extract status
  const estatusMatch = cleanText.match(/Estatus\s*en\s*el\s*padr[oó]n:\s*([A-ZÁÉÍÓÚÑ\s]+?)(?=Fecha|$)/i) ||
                       cleanText.match(/Estado\s*del\s*contribuyente:\s*([A-ZÁÉÍÓÚÑ\s]+?)(?=Fecha|$)/i);
  if (estatusMatch) data.estatusEnElPadron = estatusMatch[1].trim();
  
  // Extract dates
  const fechaInicioMatch = cleanText.match(/Fecha\s*de\s*inicio\s*de\s*operaciones:\s*(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4}|\d{4}[\-\/]\d{2}[\-\/]\d{2})/i) ||
                           cleanText.match(/Inicio\s*de\s*operaciones:\s*(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4}|\d{4}[\-\/]\d{2}[\-\/]\d{2})/i);
  if (fechaInicioMatch) data.fechaInicioOperaciones = fechaInicioMatch[1].trim();
  
  const fechaCambioMatch = cleanText.match(/Fecha\s*del?\s*[uú]ltimo\s*cambio\s*de\s*estado:\s*(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4}|\d{4}[\-\/]\d{2}[\-\/]\d{2})/i);
  if (fechaCambioMatch) data.fechaUltimoCambioEstado = fechaCambioMatch[1].trim();
  
  // Extract address components
  data.address = {};
  
  const cpMatch = cleanText.match(/C[oó]digo\s*Postal:\s*(\d{5})/i) ||
                  cleanText.match(/CP:\s*(\d{5})/i);
  if (cpMatch) data.address.codigoPostal = cpMatch[1];
  
  const tipoVialidadMatch = cleanText.match(/Tipo\s*de\s*Vialidad:\s*([A-ZÁÉÍÓÚÑ\s]+?)(?=Nombre|$)/i);
  if (tipoVialidadMatch) data.address.tipoVialidad = tipoVialidadMatch[1].trim();
  
  const nombreVialidadMatch = cleanText.match(/Nombre\s*de\s*(?:la\s*)?Vialidad:\s*([A-ZÁÉÍÓÚÑ0-9\s\.]+?)(?=N[uú]mero|Exterior|$)/i) ||
                               cleanText.match(/Calle:\s*([A-ZÁÉÍÓÚÑ0-9\s\.]+?)(?=N[uú]mero|No\.|$)/i);
  if (nombreVialidadMatch) data.address.nombreVialidad = nombreVialidadMatch[1].trim();
  
  const numExtMatch = cleanText.match(/N[uú]mero\s*Exterior:\s*([A-Z0-9\s\-]+?)(?=N[uú]mero|Interior|$)/i) ||
                      cleanText.match(/No\.\s*Ext\.?:\s*([A-Z0-9\s\-]+?)(?=No\.|Int|$)/i);
  if (numExtMatch) data.address.numeroExterior = numExtMatch[1].trim();
  
  const numIntMatch = cleanText.match(/N[uú]mero\s*Interior:\s*([A-Z0-9\s\-]+?)(?=Nombre|Colonia|$)/i) ||
                      cleanText.match(/No\.\s*Int\.?:\s*([A-Z0-9\s\-]+?)(?=Colonia|$)/i);
  if (numIntMatch) data.address.numeroInterior = numIntMatch[1].trim();
  
  const coloniaMatch = cleanText.match(/(?:Nombre\s*de\s*(?:la\s*)?)?Colonia:\s*([A-ZÁÉÍÓÚÑ0-9\s\.]+?)(?=Nombre|Localidad|Municipio|$)/i);
  if (coloniaMatch) data.address.nombreColonia = coloniaMatch[1].trim();
  
  const localidadMatch = cleanText.match(/(?:Nombre\s*de\s*(?:la\s*)?)?Localidad:\s*([A-ZÁÉÍÓÚÑ0-9\s\.]+?)(?=Municipio|Entidad|$)/i);
  if (localidadMatch) data.address.nombreLocalidad = localidadMatch[1].trim();
  
  const municipioMatch = cleanText.match(/Municipio\s*o\s*Demarcaci[oó]n:\s*([A-ZÁÉÍÓÚÑ0-9\s\.]+?)(?=Entidad|Nombre|$)/i) ||
                         cleanText.match(/Municipio:\s*([A-ZÁÉÍÓÚÑ0-9\s\.]+?)(?=Entidad|Estado|$)/i);
  if (municipioMatch) data.address.municipio = municipioMatch[1].trim();
  
  const entidadMatch = cleanText.match(/(?:Nombre\s*de\s*(?:la\s*)?)?Entidad\s*Federativa:\s*([A-ZÁÉÍÓÚÑ0-9\s\.]+?)(?=Entre|C[oó]digo|$)/i) ||
                       cleanText.match(/Estado:\s*([A-ZÁÉÍÓÚÑ0-9\s\.]+?)(?=CP|C[oó]digo|$)/i);
  if (entidadMatch) data.address.nombreEntidadFederativa = entidadMatch[1].trim();
  
  const entreCallesMatch = cleanText.match(/Entre\s*Calle[s]?:\s*([A-ZÁÉÍÓÚÑ0-9\s\.,]+?)(?=y|$)/i);
  if (entreCallesMatch) data.address.entreCalles = entreCallesMatch[1].trim();
  
  // ============================================
  // SECTION 1: Extract Actividades Económicas
  // ============================================
  // PDF Format: Orden | Actividad Económica | Porcentaje | Fecha Inicio | Fecha Fin
  // Example: "2 Otros servicios profesionales, científicos y técnicos 70 16/06/2021"
  const actividadesSection = cleanText.match(/Actividades\s*Econ[oó]micas[\s:]+([\s\S]+?)(?=Reg[ií]menes[\s:]+|$)/i);
  if (actividadesSection) {
    const actividadesText = actividadesSection[1];
    const actividades: Array<{ orden: number; actividad: string; porcentaje: number; fechaInicio: string; fechaFin?: string }> = [];
    
    // Remove header row text
    const cleanedText = actividadesText
      .replace(/Orden\s+Actividad\s*Econ[oó]mica\s+Porcentaje\s+Fecha\s*Inicio\s+Fecha\s*Fin/gi, '')
      .trim();
    
    // Pattern: number(orden) + text(actividad) + number(porcentaje) + date + optional date
    // The orden can be 1, 2, etc. Porcentaje is typically 10-100
    const actividadPattern = /(\d)\s+([A-Za-záéíóúñÁÉÍÓÚÑ\s,\.\(\)]+?)\s+(\d{1,3})\s+(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}\/\d{2}\/\d{4}))?/gi;
    
    let match;
    while ((match = actividadPattern.exec(cleanedText)) !== null) {
      const actividad = match[2].trim()
        .replace(/\s+/g, ' ')
        .replace(/^\d+\s*/, ''); // Remove leading numbers if any
      
      if (actividad.length > 3) { // Avoid capturing noise
        actividades.push({
          orden: parseInt(match[1]),
          actividad: actividad,
          porcentaje: parseInt(match[3]),
          fechaInicio: match[4],
          fechaFin: match[5] || undefined
        });
      }
    }
    
    if (actividades.length > 0) {
      data.actividadesEconomicas = actividades;
    }
  }
  
  // ============================================
  // SECTION 2: Extract Regímenes Fiscales
  // ============================================
  // PDF Format: Régimen | Fecha Inicio | Fecha Fin
  // Example: "Régimen de Sueldos y Salarios e Ingresos Asimilados a Salarios 11/03/2019"
  const regimenesSection = cleanText.match(/Reg[ií]menes[\s:]+([\s\S]+?)(?=Obligaciones[\s:]+|$)/i);
  if (regimenesSection) {
    const regimenesText = regimenesSection[1];
    const regimenes: Array<{ regimen: string; fechaInicio: string; fechaFin?: string }> = [];
    
    // Remove header row
    const cleanedText = regimenesText
      .replace(/R[eé]gimen\s+Fecha\s*Inicio\s+Fecha\s*Fin/gi, '')
      .trim();
    
    // Strategy: Find all dates, then extract the text between them as regime names
    // Each regime entry is: RegimeName + Date (+ optional EndDate)
    const datePattern = /\d{2}\/\d{2}\/\d{4}/g;
    const dates: { date: string; index: number }[] = [];
    let dateMatch;
    while ((dateMatch = datePattern.exec(cleanedText)) !== null) {
      dates.push({ date: dateMatch[0], index: dateMatch.index });
    }
    
    // Process each date - the text before it (up to the previous date or start) is the regime name
    for (let i = 0; i < dates.length; i++) {
      const currentDate = dates[i];
      
      // Check if next item is also a date (would be fechaFin)
      let fechaFin: string | undefined;
      let nextTextStart = currentDate.index + currentDate.date.length;
      
      if (i + 1 < dates.length) {
        // Check if the next date is very close (within ~15 chars) - likely a fechaFin
        const gap = dates[i + 1].index - nextTextStart;
        if (gap < 15 && gap >= 0) {
          fechaFin = dates[i + 1].date;
          nextTextStart = dates[i + 1].index + dates[i + 1].date.length;
          i++; // Skip the fechaFin in next iteration
        }
      }
      
      // Find where this regime name starts
      let textStart = 0;
      for (let j = i - 1; j >= 0; j--) {
        if (dates[j]) {
          textStart = dates[j].index + dates[j].date.length;
          break;
        }
      }
      
      // Extract regime name
      let regimenName = cleanedText.substring(textStart, currentDate.index).trim();
      
      // Clean up and normalize
      regimenName = regimenName
        .replace(/\s+/g, ' ')
        .replace(/^[\s,]+/, '')
        .replace(/[\s,]+$/, '')
        .trim();
      
      // Ensure it starts with "Régimen de"
      if (regimenName.length > 5) {
        if (!regimenName.toLowerCase().startsWith('régimen')) {
          regimenName = 'Régimen de ' + regimenName;
        }
        
        regimenes.push({
          regimen: regimenName,
          fechaInicio: currentDate.date,
          fechaFin: fechaFin
        });
      }
    }
    
    if (regimenes.length > 0) {
      data.regimenesFiscales = regimenes;
    }
  }
  
  // ============================================
  // SECTION 3: Extract Obligaciones
  // ============================================
  // PDF Format: Descripción de la Obligación | Descripción Vencimiento | Fecha Inicio | Fecha Fin
  // Note: Text can have line breaks, vencimiento starts with "A más tardar..."
  const obligacionesSection = cleanText.match(/Obligaciones[\s:]+([\s\S]+?)(?=Sus\s+datos\s+personales|Cadena\s+Original|$)/i);
  if (obligacionesSection) {
    const obligacionesText = obligacionesSection[1];
    const obligaciones: Array<{ descripcion: string; descripcionVencimiento: string; fechaInicio: string; fechaFin?: string }> = [];
    
    // Remove header row
    const cleanedText = obligacionesText
      .replace(/Descripci[oó]n\s+de\s+la\s+Obligaci[oó]n\s+Descripci[oó]n\s+Vencimiento\s+Fecha\s*Inicio\s+Fecha\s*Fin/gi, '')
      .trim();
    
    // Strategy: Find all "A más tardar" occurrences - they mark the start of vencimiento
    // Then find the date after each one, and extract description from before "A más tardar"
    const vencimientoPattern = /A\s+m[aá]s\s+tardar[^0-9]+?(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}\/\d{2}\/\d{4}))?/gi;
    
    const vencimientos: { fullMatch: string; text: string; fechaInicio: string; fechaFin?: string; startIndex: number; endIndex: number }[] = [];
    let vMatch;
    while ((vMatch = vencimientoPattern.exec(cleanedText)) !== null) {
      vencimientos.push({
        fullMatch: vMatch[0],
        text: vMatch[0].replace(/\d{2}\/\d{2}\/\d{4}/g, '').trim(),
        fechaInicio: vMatch[1],
        fechaFin: vMatch[2],
        startIndex: vMatch.index,
        endIndex: vMatch.index + vMatch[0].length
      });
    }
    
    // For each vencimiento, extract the description from before it
    for (let i = 0; i < vencimientos.length; i++) {
      const v = vencimientos[i];
      
      // Description starts after the previous entry ends (or at the beginning)
      const descStart = i === 0 ? 0 : vencimientos[i - 1].endIndex;
      let descripcion = cleanedText.substring(descStart, v.startIndex).trim();
      
      // Clean description
      descripcion = descripcion
        .replace(/^\d{2}\/\d{2}\/\d{4}\s*/, '') // Remove leading date from previous
        .replace(/\s+/g, ' ')
        .trim();
      
      if (descripcion.length > 5) {
        obligaciones.push({
          descripcion: descripcion,
          descripcionVencimiento: v.text,
          fechaInicio: v.fechaInicio,
          fechaFin: v.fechaFin
        });
      }
    }
    
    if (obligaciones.length > 0) {
      data.obligaciones = obligaciones;
    }
  }
  
  return data;
}

interface CSFUploaderProps {
  clientId: string;
  onClientUpdate: (client: Client) => void;
  client?: Client | null;
}

export default function CSFUploader({ clientId, onClientUpdate, client }: CSFUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<CSFData | null>(null);
  const [showExtracted, setShowExtracted] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      setExtractedData(null);
      setShowExtracted(false);

      // First, extract text from PDF and parse it
      console.log('Extracting text from PDF...');
      const pdfText = await extractTextFromPDF(file);
      console.log('PDF text extracted:', pdfText.substring(0, 500));
      const parsedData = parseCSFText(pdfText);
      console.log('Parsed CSF data:', parsedData);
      
      // VALIDATION: Check if RFC matches the client's RFC
      if (parsedData.rfc && client?.rfc) {
        const extractedRfc = parsedData.rfc.toUpperCase().trim();
        const clientRfc = client.rfc.toUpperCase().trim();
        
        if (extractedRfc !== clientRfc) {
          setError(`El RFC de la CSF (${extractedRfc}) no coincide con el RFC del cliente (${clientRfc}). Por favor, sube la CSF correcta.`);
          setUploading(false);
          // Reset file input
          event.target.value = '';
          return;
        }
      }
      
      setExtractedData(parsedData);

      // Create a simpler, more explicit storage path
      const filePath = `clients/${clientId}/csf/${Date.now()}`;
      const csfRef = ref(storage, filePath);
      
      // Upload file and get URL
      await uploadBytes(csfRef, file);
      const downloadURL = await getDownloadURL(csfRef);
      
      // Prepare update data with extracted information
      const updateData: Partial<Client> = {
        lastCSFUrl: downloadURL,
        lastCSFDate: new Date().toISOString()
      };
      
      // Add idCIF for validation
      if (parsedData.idCIF) updateData.idCIF = parsedData.idCIF;
      
      // Add extracted personal data if available
      // NOTE: RFC is NOT updated - it's the client's identifier and shouldn't change
      if (parsedData.curp) updateData.curp = parsedData.curp;
      if (parsedData.nombre) updateData.nombres = parsedData.nombre;
      if (parsedData.primerApellido) updateData.primerApellido = parsedData.primerApellido;
      if (parsedData.segundoApellido) updateData.segundoApellido = parsedData.segundoApellido;
      
      // Add fiscal status data
      if (parsedData.estatusEnElPadron) updateData.estatusEnElPadron = parsedData.estatusEnElPadron;
      if (parsedData.fechaInicioOperaciones) updateData.fechaInicioOperaciones = parsedData.fechaInicioOperaciones;
      if (parsedData.fechaUltimoCambioEstado) updateData.fechaUltimoCambioEstado = parsedData.fechaUltimoCambioEstado;
      
      // Add address data if any was extracted
      if (parsedData.address && Object.keys(parsedData.address).some(k => parsedData.address?.[k as keyof typeof parsedData.address])) {
        // Clean address data - remove undefined values
        const cleanAddress: Record<string, string> = {};
        Object.entries(parsedData.address).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            cleanAddress[key] = value;
          }
        });
        updateData.address = {
          ...client?.address, // Keep existing data
          ...cleanAddress // Override with new data
        } as Client['address'];
      }
      
      // Helper function to remove undefined values from objects in arrays
      const cleanArrayData = <T extends Record<string, any>>(arr: T[]): T[] => {
        return arr.map(item => {
          const cleaned: Record<string, any> = {};
          Object.entries(item).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              cleaned[key] = value;
            }
          });
          return cleaned as T;
        });
      };
      
      // Add actividades económicas if extracted (replace existing)
      if (parsedData.actividadesEconomicas && parsedData.actividadesEconomicas.length > 0) {
        updateData.actividadesEconomicas = cleanArrayData(parsedData.actividadesEconomicas);
      }
      
      // Add regímenes fiscales if extracted (replace existing)
      if (parsedData.regimenesFiscales && parsedData.regimenesFiscales.length > 0) {
        // Mark first regime as default if none is set
        const regimenesWithDefault = parsedData.regimenesFiscales.map((reg, idx) => ({
          ...reg,
          esPredeterminado: idx === 0 // First one is default
        }));
        updateData.regimenesFiscales = cleanArrayData(regimenesWithDefault);
      }
      
      // Add obligaciones if extracted (replace existing)
      if (parsedData.obligaciones && parsedData.obligaciones.length > 0) {
        updateData.obligaciones = cleanArrayData(parsedData.obligaciones);
      }
      
      // Update client data in database
      await clientService.updateClient(clientId, updateData);

      // Refresh client data
      const updatedClient = await clientService.getClientById(clientId);
      if (updatedClient) {
        onClientUpdate(updatedClient);
        setShowExtracted(true);
      }
    } catch (err) {
      console.error('Error uploading CSF:', err);
      setError(`Error al subir el archivo: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!client?.lastCSFUrl) return;

    try {
      // First try to delete from storage
      try {
        const fileRef = ref(storage, client.lastCSFUrl);
        await deleteObject(fileRef);
      } catch (storageErr) {
        console.error("Storage deletion error:", storageErr);
        // Continue even if storage deletion fails
      }

      // Create an update object that removes the fields
      const updateData: Record<string, any> = {};
      
      // Use deleteField() from Firestore to properly remove fields
      // or use empty string if you want to keep the field but clear its value
      updateData.lastCSFUrl = "";  // empty string instead of null/undefined
      updateData.lastCSFDate = ""; // empty string instead of null/undefined

      // Update client record
      await clientService.updateClient(clientId, updateData);

      // Refresh client data
      const updatedClient = await clientService.getClientById(clientId);
      if (updatedClient) {
        onClientUpdate(updatedClient);
      }
    } catch (err) {
      console.error('Error deleting CSF:', err);
      setError('Error al eliminar el archivo');
    }
  };

  const handleDownload = (url: string) => {
    // Open in a new tab to avoid replacing the current page
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Constancia de Situación Fiscal</h3>
        
        {/* Always show upload button in header */}
        <div className="flex items-center space-x-2">
          <input
            type="file"
            id="csf-upload"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label
            htmlFor="csf-upload"
            className="px-2.5 py-1 bg-black text-white text-xs rounded hover:bg-gray-800 cursor-pointer transition-colors"
          >
            {uploading ? 'Procesando...' : client?.lastCSFUrl ? 'Reemplazar' : 'Subir CSF'}
          </label>
        </div>
      </div>
      
      {error && (
        <div className="text-red-600 text-xs px-4 pt-2">{error}</div>
      )}
      
      {/* Show success message when data was extracted */}
      {showExtracted && extractedData && (
        <div className="mx-4 mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2 text-green-700 text-xs font-medium mb-1">
            <FiCheckCircle className="h-3.5 w-3.5" />
            Datos extraídos automáticamente:
          </div>
          <div className="text-[10px] text-green-600 space-y-0.5">
            {extractedData.rfc && <div>• RFC: {extractedData.rfc}</div>}
            {extractedData.curp && <div>• CURP: {extractedData.curp}</div>}
            {extractedData.nombre && <div>• Nombre: {extractedData.nombre} {extractedData.primerApellido} {extractedData.segundoApellido}</div>}
            {extractedData.address?.codigoPostal && <div>• CP: {extractedData.address.codigoPostal}</div>}
            {extractedData.address?.nombreVialidad && <div>• Calle: {extractedData.address.nombreVialidad} {extractedData.address.numeroExterior}</div>}
            {extractedData.address?.nombreColonia && <div>• Colonia: {extractedData.address.nombreColonia}</div>}
            {extractedData.address?.municipio && <div>• Municipio: {extractedData.address.municipio}</div>}
            {extractedData.address?.nombreEntidadFederativa && <div>• Estado: {extractedData.address.nombreEntidadFederativa}</div>}
            {extractedData.actividadesEconomicas && extractedData.actividadesEconomicas.length > 0 && (
              <div>• Actividades: {extractedData.actividadesEconomicas.map(a => a.actividad).join(', ')}</div>
            )}
            {extractedData.regimenesFiscales && extractedData.regimenesFiscales.length > 0 && (
              <div>• Regímenes: {extractedData.regimenesFiscales.map(r => r.regimen).join(', ')}</div>
            )}
            {extractedData.obligaciones && extractedData.obligaciones.length > 0 && (
              <div>• Obligaciones: {extractedData.obligaciones.length} registradas</div>
            )}
          </div>
          <button 
            onClick={() => setShowExtracted(false)}
            className="mt-1.5 text-[10px] text-green-600 hover:text-green-800 underline"
          >
            Cerrar
          </button>
        </div>
      )}

      <div className="text-xs p-4">
        {client?.lastCSFUrl ? (
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => handleDownload(client.lastCSFUrl as string)}
              className="inline-flex items-center gap-1.5 text-purple-600 hover:text-purple-800 font-medium"
            >
              <FiDownload className="h-3.5 w-3.5" />
              Descargar
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1 text-red-500 hover:text-red-700"
            >
              <FiTrash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
            {client.lastCSFDate && (
              <span className="text-gray-400 ml-auto">
                Actualizado: {formatDate(client.lastCSFDate)} 
                {Math.floor((Date.now() - new Date(client.lastCSFDate).getTime()) / (1000 * 60 * 60 * 24)) === 0 
                ? ' (hoy)'
                : ` (${Math.floor((Date.now() - new Date(client.lastCSFDate).getTime()) / (1000 * 60 * 60 * 24))} días)`}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center">
            <FiFileText className="h-4 w-4 text-gray-400 mr-2" />
            <p className="text-gray-500">No hay constancia de situación fiscal cargada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
