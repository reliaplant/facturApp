'use client';

import { useState } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { clientService } from '@/services/client-service';
import { Client } from '@/models/Client';
import { FiUpload, FiTrash2, FiDownload, FiFileText, FiCheckCircle, FiChevronDown, FiChevronRight, FiEdit2, FiX, FiSave } from 'react-icons/fi';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import app from '@/services/firebase';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker locally
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
const storage = getStorage(app);

// Helper para formatear fechas para mostrar
const formatDisplayDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  
  // If in DD/MM/YYYY format, return as is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }
  
  // If in YYYY-MM-DD format, convert to DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }
  
  try {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

// Helper para fechas en inputs
const formatDateForInput = (dateString: string | undefined): string => {
  if (!dateString) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
  }
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  } catch {}
  return '';
};

// Helper para limpiar nombres de régimen de etiquetas de columna del PDF
const cleanRegimenName = (regimen: string): string => {
  if (!regimen) return '';
  // Remove PDF column headers that get accidentally included in text extraction
  let cleaned = regimen
    // Remove "Fecha Inicio Fecha Fin" at the start
    .replace(/^Fecha\s*Inicio\s*Fecha\s*Fin\s*/i, '')
    // Remove individual column headers if present
    .replace(/^Fecha\s*Inicio\s*/i, '')
    .replace(/^Fecha\s*Fin\s*/i, '')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleaned;
};

interface CSFSectionProps {
  client: Client;
  onClientUpdate: (client: Client) => void;
}

export default function CSFSection({ client, onClientUpdate }: CSFSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Client>>({});

  // Start editing
  const startEditing = () => {
    setEditData({
      nombres: client.nombres,
      primerApellido: client.primerApellido,
      segundoApellido: client.segundoApellido,
      curp: client.curp,
      email: client.email,
      telefono: client.telefono,
      address: { ...client.address },
      regimenesFiscales: client.regimenesFiscales?.map(r => ({ ...r })) || [],
      actividadesEconomicas: client.actividadesEconomicas?.map(a => ({ ...a })) || [],
      obligaciones: client.obligaciones?.map(o => ({ ...o })) || [],
    });
    setEditing(true);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditing(false);
    setEditData({});
  };

  // Save changes
  const saveChanges = async () => {
    try {
      setSaving(true);
      await clientService.updateClient(client.id, editData);
      const updated = await clientService.getClientById(client.id);
      if (updated) onClientUpdate(updated);
      setEditing(false);
    } catch (err) {
      console.error('Error saving:', err);
      setError('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  // Toggle régimen predeterminado
  const togglePredeterminado = async (index: number) => {
    const regimenes = client.regimenesFiscales?.map((r, i) => ({
      ...r,
      esPredeterminado: i === index
    })) || [];
    
    try {
      await clientService.updateClient(client.id, { regimenesFiscales: regimenes });
      const updated = await clientService.getClientById(client.id);
      if (updated) onClientUpdate(updated);
    } catch (err) {
      console.error('Error updating default regime:', err);
    }
  };

  // PDF upload handler - FULL PARSING
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      // Extract text from PDF
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }

      const cleanText = fullText.replace(/\s+/g, ' ').trim();
      
      // Extract RFC and validate
      const rfcMatch = cleanText.match(/RFC:\s*([A-Z]{3,4}\d{6}[A-Z0-9]{3})/i) ||
                       cleanText.match(/([A-Z]{4}\d{6}[A-Z0-9]{3})/);
      if (rfcMatch) {
        const extractedRfc = rfcMatch[1].toUpperCase().trim();
        if (extractedRfc !== client.rfc.toUpperCase().trim()) {
          setError(`El RFC de la CSF (${extractedRfc}) no coincide con el RFC del cliente (${client.rfc}). Por favor, sube la CSF correcta.`);
          setUploading(false);
          event.target.value = '';
          return;
        }
      }

      // Upload file
      const filePath = `clients/${client.id}/csf/${Date.now()}`;
      const csfRef = ref(storage, filePath);
      await uploadBytes(csfRef, file);
      const downloadURL = await getDownloadURL(csfRef);

      // Prepare update data
      const updateData: Partial<Client> = {
        lastCSFUrl: downloadURL,
        lastCSFDate: new Date().toISOString()
      };

      // Extract idCIF
      const idCIFMatch = cleanText.match(/idCIF:\s*(\d+)/i);
      if (idCIFMatch) updateData.idCIF = idCIFMatch[1];

      // Extract CURP
      const curpMatch = cleanText.match(/CURP:\s*([A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d)/i);
      if (curpMatch) updateData.curp = curpMatch[1].toUpperCase();

      // Extract names
      const nombreMatch = cleanText.match(/Nombre\s*\(s\):\s*([A-ZÁÉÍÓÚÑ\s]+?)(?=Primer|Apellido|$)/i);
      if (nombreMatch) updateData.nombres = nombreMatch[1].trim();
      
      const primerApellidoMatch = cleanText.match(/Primer\s*Apellido:\s*([A-ZÁÉÍÓÚÑ\s]+?)(?=Segundo|Nombre|$)/i);
      if (primerApellidoMatch) updateData.primerApellido = primerApellidoMatch[1].trim();
      
      const segundoApellidoMatch = cleanText.match(/Segundo\s*Apellido:\s*([A-ZÁÉÍÓÚÑ\s]+?)(?=Nombre|CURP|Fecha|$)/i);
      if (segundoApellidoMatch) updateData.segundoApellido = segundoApellidoMatch[1].trim();

      // ============================================
      // Extract Domicilio Fiscal (Address)
      // ============================================
      const addressData: any = {};
      
      // Código Postal
      const cpMatch = cleanText.match(/C[oó]digo\s*Postal[:\s]*(\d{5})/i);
      if (cpMatch) addressData.codigoPostal = cpMatch[1];
      
      // Tipo de Vialidad
      const tipoVialidadMatch = cleanText.match(/Tipo\s*de\s*Vialidad[:\s]*([A-ZÁÉÍÓÚÑ\s]+?)(?=Nombre\s*de\s*Vialidad|$)/i);
      if (tipoVialidadMatch) addressData.tipoVialidad = tipoVialidadMatch[1].trim();
      
      // Nombre de Vialidad
      const nombreVialidadMatch = cleanText.match(/Nombre\s*de\s*Vialidad[:\s]*([A-ZÁÉÍÓÚÑ0-9\s]+?)(?=N[uú]mero\s*Exterior|$)/i);
      if (nombreVialidadMatch) addressData.nombreVialidad = nombreVialidadMatch[1].trim();
      
      // Número Exterior
      const numExtMatch = cleanText.match(/N[uú]mero\s*Exterior[:\s]*([A-Z0-9\s]+?)(?=N[uú]mero\s*Interior|Nombre\s*de\s*la\s*Colonia|$)/i);
      if (numExtMatch) addressData.numeroExterior = numExtMatch[1].trim();
      
      // Número Interior
      const numIntMatch = cleanText.match(/N[uú]mero\s*Interior[:\s]*([A-Z0-9\s]+?)(?=Nombre\s*de\s*la\s*Colonia|Nombre\s*de\s*la\s*Localidad|$)/i);
      if (numIntMatch && numIntMatch[1].trim()) addressData.numeroInterior = numIntMatch[1].trim();
      
      // Nombre de la Colonia
      const coloniaMatch = cleanText.match(/Nombre\s*de\s*la\s*Colonia[:\s]*([A-ZÁÉÍÓÚÑ0-9\s,]+?)(?=Nombre\s*de\s*la\s*Localidad|Nombre\s*del\s*Municipio|$)/i);
      if (coloniaMatch) addressData.nombreColonia = coloniaMatch[1].trim();
      
      // Nombre de la Localidad
      const localidadMatch = cleanText.match(/Nombre\s*de\s*la\s*Localidad[:\s]*([A-ZÁÉÍÓÚÑ0-9\s]+?)(?=Nombre\s*del\s*Municipio|$)/i);
      if (localidadMatch && localidadMatch[1].trim()) addressData.nombreLocalidad = localidadMatch[1].trim();
      
      // Nombre del Municipio o Demarcación Territorial
      const municipioMatch = cleanText.match(/Nombre\s*del\s*Municipio\s*o\s*Demarcaci[oó]n\s*Territorial[:\s]*([A-ZÁÉÍÓÚÑ0-9\s]+?)(?=Nombre\s*de\s*la\s*Entidad|$)/i);
      if (municipioMatch) addressData.municipio = municipioMatch[1].trim();
      
      // Entidad Federativa
      const entidadMatch = cleanText.match(/Nombre\s*de\s*la\s*Entidad\s*Federativa[:\s]*([A-ZÁÉÍÓÚÑ\s]+?)(?=Entre\s*Calle|Actividades|Tel[eé]fono|Correo|$)/i);
      if (entidadMatch) addressData.nombreEntidadFederativa = entidadMatch[1].trim();
      
      // Entre Calle y Y Calle
      const entreCalleMatch = cleanText.match(/Entre\s*Calle[:\s]*([A-ZÁÉÍÓÚÑ0-9\s,]+?)(?=Y\s*Calle|Actividades|Tel[eé]fono|$)/i);
      const yCalleMatch = cleanText.match(/Y\s*Calle[:\s]*([A-ZÁÉÍÓÚÑ0-9\s,]+?)(?=Actividades|Tel[eé]fono|$)/i);
      if (entreCalleMatch || yCalleMatch) {
        const entreCalle = entreCalleMatch ? entreCalleMatch[1].trim() : '';
        const yCalle = yCalleMatch ? yCalleMatch[1].trim() : '';
        addressData.entreCalles = [entreCalle, yCalle].filter(c => c).join(' y ');
      }
      
      if (Object.keys(addressData).length > 0) {
        updateData.address = addressData;
      }

      // ============================================
      // Extract Regímenes Fiscales
      // ============================================
      const regimenesSection = cleanText.match(/Reg[ií]menes[\s:]+([\s\S]+?)(?=Obligaciones[\s:]+|$)/i);
      if (regimenesSection) {
        const regimenesText = regimenesSection[1].replace(/R[eé]gimen\s+Fecha\s*Inicio\s+Fecha\s*Fin/gi, '').trim();
        const regimenes: Array<{ regimen: string; fechaInicio: string; fechaFin?: string; esPredeterminado?: boolean }> = [];
        
        // Find all dates
        const datePattern = /\d{2}\/\d{2}\/\d{4}/g;
        const dates: { date: string; index: number }[] = [];
        let dateMatch;
        while ((dateMatch = datePattern.exec(regimenesText)) !== null) {
          dates.push({ date: dateMatch[0], index: dateMatch.index });
        }
        
        let i = 0;
        while (i < dates.length) {
          const currentDate = dates[i];
          let fechaFin: string | undefined;
          
          // Check if next date is fechaFin (very close)
          if (i + 1 < dates.length) {
            const gap = dates[i + 1].index - (currentDate.index + currentDate.date.length);
            if (gap < 15 && gap >= 0) {
              fechaFin = dates[i + 1].date;
              i++;
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
          
          let regimenName = regimenesText.substring(textStart, currentDate.index).trim()
            .replace(/\s+/g, ' ')
            .replace(/^[\s,]+/, '')
            .replace(/[\s,]+$/, '');
          
          if (regimenName.length > 5) {
            if (!regimenName.toLowerCase().startsWith('régimen')) {
              regimenName = 'Régimen de ' + regimenName;
            }
            regimenes.push({
              regimen: regimenName,
              fechaInicio: currentDate.date,
              fechaFin: fechaFin,
              esPredeterminado: regimenes.length === 0
            });
          }
          i++;
        }
        
        if (regimenes.length > 0) {
          updateData.regimenesFiscales = regimenes;
        }
      }

      // ============================================
      // Extract Obligaciones
      // ============================================
      const obligacionesSection = cleanText.match(/Obligaciones[\s:]+([\s\S]+?)(?=Sus\s+datos\s+personales|Cadena\s+Original|$)/i);
      if (obligacionesSection) {
        const obligacionesText = obligacionesSection[1]
          .replace(/Descripci[oó]n\s+de\s+la\s+Obligaci[oó]n\s+Descripci[oó]n\s+Vencimiento\s+Fecha\s*Inicio\s+Fecha\s*Fin/gi, '')
          .trim();
        const obligaciones: Array<{ descripcion: string; descripcionVencimiento: string; fechaInicio: string; fechaFin?: string }> = [];
        
        // Find all "A más tardar" occurrences with their dates
        const vencimientoPattern = /A\s+m[aá]s\s+tardar[^0-9]+?(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}\/\d{2}\/\d{4}))?/gi;
        const vencimientos: { text: string; fechaInicio: string; fechaFin?: string; startIndex: number; endIndex: number }[] = [];
        let vMatch;
        while ((vMatch = vencimientoPattern.exec(obligacionesText)) !== null) {
          vencimientos.push({
            text: vMatch[0].replace(/\d{2}\/\d{2}\/\d{4}/g, '').trim(),
            fechaInicio: vMatch[1],
            fechaFin: vMatch[2],
            startIndex: vMatch.index,
            endIndex: vMatch.index + vMatch[0].length
          });
        }
        
        for (let j = 0; j < vencimientos.length; j++) {
          const v = vencimientos[j];
          const descStart = j === 0 ? 0 : vencimientos[j - 1].endIndex;
          let descripcion = obligacionesText.substring(descStart, v.startIndex).trim()
            .replace(/^\d{2}\/\d{2}\/\d{4}\s*/, '')
            .replace(/\s+/g, ' ');
          
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
          updateData.obligaciones = obligaciones;
        }
      }

      // ============================================
      // Extract Actividades Económicas
      // ============================================
      const actividadesSection = cleanText.match(/Actividades\s*Econ[oó]micas[\s:]+([\s\S]+?)(?=Reg[ií]menes[\s:]+|$)/i);
      if (actividadesSection) {
        const actividadesText = actividadesSection[1]
          .replace(/Orden\s+Actividad\s*Econ[oó]mica\s+Porcentaje\s+Fecha\s*Inicio\s+Fecha\s*Fin/gi, '')
          .trim();
        const actividades: Array<{ orden: number; actividad: string; porcentaje: number; fechaInicio: string; fechaFin?: string }> = [];
        
        const actividadPattern = /(\d)\s+([A-Za-záéíóúñÁÉÍÓÚÑ\s,\.\(\)]+?)\s+(\d{1,3})\s+(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}\/\d{2}\/\d{4}))?/gi;
        let aMatch;
        while ((aMatch = actividadPattern.exec(actividadesText)) !== null) {
          const actividad = aMatch[2].trim().replace(/\s+/g, ' ').replace(/^\d+\s*/, '');
          if (actividad.length > 3) {
            actividades.push({
              orden: parseInt(aMatch[1]),
              actividad: actividad,
              porcentaje: parseInt(aMatch[3]),
              fechaInicio: aMatch[4],
              fechaFin: aMatch[5] || undefined
            });
          }
        }
        
        if (actividades.length > 0) {
          updateData.actividadesEconomicas = actividades;
        }
      }

      // Helper function to remove undefined values recursively
      const removeUndefined = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(item => removeUndefined(item));
        }
        if (obj !== null && typeof obj === 'object') {
          const cleaned: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
              cleaned[key] = removeUndefined(value);
            }
          }
          return cleaned;
        }
        return obj;
      };

      // Clean the update data before saving
      const cleanedUpdateData = removeUndefined(updateData);

      // Update client
      await clientService.updateClient(client.id, cleanedUpdateData);
      const updated = await clientService.getClientById(client.id);
      if (updated) onClientUpdate(updated);
      
    } catch (err) {
      console.error('Error uploading CSF:', err);
      setError(`Error al subir: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!client.lastCSFUrl) return;
    try {
      try {
        const fileRef = ref(storage, client.lastCSFUrl);
        await deleteObject(fileRef);
      } catch {}
      
      await clientService.updateClient(client.id, { lastCSFUrl: '', lastCSFDate: '' });
      const updated = await clientService.getClientById(client.id);
      if (updated) onClientUpdate(updated);
    } catch (err) {
      setError('Error al eliminar');
    }
  };

  const regimenPredeterminado = client.regimenesFiscales?.find(r => r.esPredeterminado) || client.regimenesFiscales?.[0];
  const daysSinceUpdate = client.lastCSFDate 
    ? Math.floor((Date.now() - new Date(client.lastCSFDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div 
        className="bg-gray-100 px-4 py-2.5 border-b border-gray-300 flex justify-between items-center cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <FiChevronDown className="h-4 w-4 text-gray-500" /> : <FiChevronRight className="h-4 w-4 text-gray-500" />}
          <h3 className="text-sm font-medium text-gray-700">Constancia de Situación Fiscal</h3>
          {client.lastCSFUrl && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${daysSinceUpdate !== null && daysSinceUpdate > 20 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {daysSinceUpdate === 0 ? 'Hoy' : `${daysSinceUpdate}d`}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {!editing ? (
            <button onClick={startEditing} className="p-1 text-gray-400 hover:text-gray-600">
              <FiEdit2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <>
              <button onClick={cancelEditing} className="p-1 text-gray-400 hover:text-red-500">
                <FiX className="h-3.5 w-3.5" />
              </button>
              <button onClick={saveChanges} disabled={saving} className="p-1 text-purple-500 hover:text-purple-700">
                <FiSave className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <input type="file" id="csf-upload" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
          <label htmlFor="csf-upload" className="px-2.5 py-1 bg-black text-white text-xs rounded hover:bg-gray-800 cursor-pointer">
            {uploading ? 'Procesando...' : client.lastCSFUrl ? 'Reemplazar' : 'Subir CSF'}
          </label>
        </div>
      </div>

      {error && <div className="text-red-600 text-xs px-4 py-2 bg-red-50">{error}</div>}

      {expanded && (
        <div className="text-xs">
          {/* File Status */}
          {client.lastCSFUrl && (
            <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap items-center gap-3">
              <button onClick={() => window.open(client.lastCSFUrl!, '_blank')} className="text-purple-600 hover:text-purple-800 flex items-center gap-1">
                <FiDownload className="h-3.5 w-3.5" /> Descargar PDF
              </button>
              {client.idCIF && (
                <a 
                  href={`https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=10&D2=1&D3=${client.idCIF}_${client.rfc}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-800 flex items-center gap-1"
                  title="Validar CSF en portal SAT"
                >
                  <FiCheckCircle className="h-3.5 w-3.5" /> Validar en SAT
                </a>
              )}
              <button onClick={handleDelete} className="text-red-500 hover:text-red-700 flex items-center gap-1">
                <FiTrash2 className="h-3.5 w-3.5" /> Eliminar
              </button>
              <div className="flex items-center gap-3 ml-auto text-gray-400">
                {client.idCIF && <span>idCIF: {client.idCIF}</span>}
                {client.lastCSFDate && <span>Actualizado: {formatDisplayDate(client.lastCSFDate)}</span>}
              </div>
            </div>
          )}

          {/* Datos de Identificación */}
          <div className="px-4 py-3 border-b">
            <h4 className="text-[10px] text-gray-500 uppercase font-medium mb-2">Datos de Identificación</h4>
            {!editing ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><span className="text-gray-400 block">RFC</span><span className="font-medium">{client.rfc}</span></div>
                <div><span className="text-gray-400 block">CURP</span><span className="font-medium">{client.curp || 'N/A'}</span></div>
                <div><span className="text-gray-400 block">Email</span><span className="font-medium">{client.email || 'N/A'}</span></div>
                <div><span className="text-gray-400 block">Teléfono</span><span className="font-medium">{client.telefono || 'N/A'}</span></div>
                <div className="col-span-2"><span className="text-gray-400 block">Nombre</span><span className="font-medium">{client.nombres} {client.primerApellido} {client.segundoApellido || ''}</span></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><span className="text-gray-400 block mb-1">RFC</span><input disabled value={client.rfc} className="w-full border rounded px-2 py-1 bg-gray-100 text-gray-500" /></div>
                <div><span className="text-gray-400 block mb-1">CURP</span><input value={editData.curp || ''} onChange={e => setEditData({...editData, curp: e.target.value})} className="w-full border rounded px-2 py-1" /></div>
                <div><span className="text-gray-400 block mb-1">Email</span><input value={editData.email || ''} onChange={e => setEditData({...editData, email: e.target.value})} className="w-full border rounded px-2 py-1" /></div>
                <div><span className="text-gray-400 block mb-1">Teléfono</span><input value={editData.telefono || ''} onChange={e => setEditData({...editData, telefono: e.target.value})} className="w-full border rounded px-2 py-1" /></div>
                <div><span className="text-gray-400 block mb-1">Nombres</span><input value={editData.nombres || ''} onChange={e => setEditData({...editData, nombres: e.target.value})} className="w-full border rounded px-2 py-1" /></div>
                <div><span className="text-gray-400 block mb-1">Primer Apellido</span><input value={editData.primerApellido || ''} onChange={e => setEditData({...editData, primerApellido: e.target.value})} className="w-full border rounded px-2 py-1" /></div>
                <div><span className="text-gray-400 block mb-1">Segundo Apellido</span><input value={editData.segundoApellido || ''} onChange={e => setEditData({...editData, segundoApellido: e.target.value})} className="w-full border rounded px-2 py-1" /></div>
              </div>
            )}
          </div>

          {/* Domicilio */}
          <div className="px-4 py-3 border-b">
            <h4 className="text-[10px] text-gray-500 uppercase font-medium mb-2">Domicilio Fiscal</h4>
            {!editing ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                {client.address?.tipoVialidad && (
                  <div><span className="text-gray-400 block text-[10px]">Tipo Vialidad</span><span className="font-medium">{client.address.tipoVialidad}</span></div>
                )}
                <div className="col-span-2 md:col-span-1"><span className="text-gray-400 block text-[10px]">Nombre Vialidad</span><span className="font-medium">{client.address?.nombreVialidad || 'N/A'}</span></div>
                <div><span className="text-gray-400 block text-[10px]">No. Exterior</span><span className="font-medium">{client.address?.numeroExterior || 'N/A'}</span></div>
                <div><span className="text-gray-400 block text-[10px]">No. Interior</span><span className="font-medium">{client.address?.numeroInterior || '-'}</span></div>
                <div className="col-span-2"><span className="text-gray-400 block text-[10px]">Colonia</span><span className="font-medium">{client.address?.nombreColonia || 'N/A'}</span></div>
                <div><span className="text-gray-400 block text-[10px]">Código Postal</span><span className="font-medium">{client.address?.codigoPostal || 'N/A'}</span></div>
                {client.address?.nombreLocalidad && (
                  <div className="col-span-2"><span className="text-gray-400 block text-[10px]">Localidad</span><span className="font-medium">{client.address.nombreLocalidad}</span></div>
                )}
                <div><span className="text-gray-400 block text-[10px]">Municipio</span><span className="font-medium">{client.address?.municipio || 'N/A'}</span></div>
                <div><span className="text-gray-400 block text-[10px]">Entidad Federativa</span><span className="font-medium">{client.address?.nombreEntidadFederativa || 'N/A'}</span></div>
                {client.address?.entreCalles && (
                  <div className="col-span-2 md:col-span-4"><span className="text-gray-400 block text-[10px]">Entre Calles</span><span className="font-medium">{client.address.entreCalles}</span></div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div><span className="text-gray-400 block mb-1">Tipo Vialidad</span><input value={editData.address?.tipoVialidad || ''} onChange={e => setEditData({...editData, address: {...editData.address, tipoVialidad: e.target.value} as Client['address']})} className="w-full border rounded px-2 py-1" /></div>
                <div className="col-span-2"><span className="text-gray-400 block mb-1">Nombre Vialidad</span><input value={editData.address?.nombreVialidad || ''} onChange={e => setEditData({...editData, address: {...editData.address, nombreVialidad: e.target.value} as Client['address']})} className="w-full border rounded px-2 py-1" /></div>
                <div><span className="text-gray-400 block mb-1">No. Ext</span><input value={editData.address?.numeroExterior || ''} onChange={e => setEditData({...editData, address: {...editData.address, numeroExterior: e.target.value} as Client['address']})} className="w-full border rounded px-2 py-1" /></div>
                <div><span className="text-gray-400 block mb-1">No. Int</span><input value={editData.address?.numeroInterior || ''} onChange={e => setEditData({...editData, address: {...editData.address, numeroInterior: e.target.value} as Client['address']})} className="w-full border rounded px-2 py-1" /></div>
                <div className="col-span-2"><span className="text-gray-400 block mb-1">Colonia</span><input value={editData.address?.nombreColonia || ''} onChange={e => setEditData({...editData, address: {...editData.address, nombreColonia: e.target.value} as Client['address']})} className="w-full border rounded px-2 py-1" /></div>
                <div><span className="text-gray-400 block mb-1">CP</span><input value={editData.address?.codigoPostal || ''} onChange={e => setEditData({...editData, address: {...editData.address, codigoPostal: e.target.value} as Client['address']})} className="w-full border rounded px-2 py-1" /></div>
                <div><span className="text-gray-400 block mb-1">Localidad</span><input value={editData.address?.nombreLocalidad || ''} onChange={e => setEditData({...editData, address: {...editData.address, nombreLocalidad: e.target.value} as Client['address']})} className="w-full border rounded px-2 py-1" /></div>
                <div><span className="text-gray-400 block mb-1">Municipio</span><input value={editData.address?.municipio || ''} onChange={e => setEditData({...editData, address: {...editData.address, municipio: e.target.value} as Client['address']})} className="w-full border rounded px-2 py-1" /></div>
                <div><span className="text-gray-400 block mb-1">Estado</span><input value={editData.address?.nombreEntidadFederativa || ''} onChange={e => setEditData({...editData, address: {...editData.address, nombreEntidadFederativa: e.target.value} as Client['address']})} className="w-full border rounded px-2 py-1" /></div>
                <div className="col-span-2"><span className="text-gray-400 block mb-1">Entre Calles</span><input value={editData.address?.entreCalles || ''} onChange={e => setEditData({...editData, address: {...editData.address, entreCalles: e.target.value} as Client['address']})} className="w-full border rounded px-2 py-1" /></div>
              </div>
            )}
          </div>

          {/* Regímenes Fiscales */}
          <div className="px-4 py-3 border-b">
            <h4 className="text-[10px] text-gray-500 uppercase font-medium mb-2">Regímenes Fiscales</h4>
            {(client.regimenesFiscales?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {client.regimenesFiscales?.map((reg, idx) => (
                  <div key={idx} className={`flex items-center gap-2 p-2 rounded ${reg.esPredeterminado ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'}`}>
                    <button onClick={() => togglePredeterminado(idx)} className={`p-1 rounded ${reg.esPredeterminado ? 'text-purple-500' : 'text-gray-300 hover:text-purple-400'}`}>
                      {reg.esPredeterminado ? <StarIconSolid className="h-4 w-4" /> : <StarIcon className="h-4 w-4" />}
                    </button>
                    <div className="flex-1">
                      <span className={reg.esPredeterminado ? 'font-medium text-purple-900' : ''}>{cleanRegimenName(reg.regimen)}</span>
                      {reg.esPredeterminado && <span className="ml-2 text-[10px] text-purple-600">(Predeterminado)</span>}
                    </div>
                    <span className="text-gray-400">{formatDisplayDate(reg.fechaInicio)}</span>
                    {reg.fechaFin && <span className="text-red-500">→ {formatDisplayDate(reg.fechaFin)}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic">Sin regímenes registrados</p>
            )}
          </div>

          {/* Actividades Económicas */}
          <div className="px-4 py-3 border-b">
            <h4 className="text-[10px] text-gray-500 uppercase font-medium mb-2">Actividades Económicas</h4>
            {(client.actividadesEconomicas?.length ?? 0) > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] text-gray-400 uppercase">
                    <th className="text-left py-1 w-12">Orden</th>
                    <th className="text-left py-1">Actividad</th>
                    <th className="text-center py-1 w-16">%</th>
                    <th className="text-right py-1 w-24">Inicio</th>
                  </tr>
                </thead>
                <tbody>
                  {client.actividadesEconomicas?.map((act, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      <td className="py-1.5 text-center text-gray-500">{act.orden}</td>
                      <td className="py-1.5">{act.actividad}</td>
                      <td className="py-1.5 text-center"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{act.porcentaje}%</span></td>
                      <td className="py-1.5 text-right text-gray-500">{formatDisplayDate(act.fechaInicio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 italic">Sin actividades registradas</p>
            )}
          </div>

          {/* Obligaciones */}
          <div className="px-4 py-3">
            <h4 className="text-[10px] text-gray-500 uppercase font-medium mb-2">Obligaciones Fiscales</h4>
            {(client.obligaciones?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {client.obligaciones?.filter(o => !o.fechaFin).map((obl, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded">
                    <p className="font-medium">{obl.descripcion}</p>
                    <p className="text-gray-500 text-[10px] mt-0.5">{obl.descripcionVencimiento}</p>
                  </div>
                ))}
                {client.obligaciones?.some(o => o.fechaFin) && (
                  <details className="mt-2">
                    <summary className="text-[10px] text-gray-400 cursor-pointer">
                      Obligaciones finalizadas ({client.obligaciones?.filter(o => o.fechaFin).length})
                    </summary>
                    <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-200">
                      {client.obligaciones?.filter(o => o.fechaFin).map((obl, idx) => (
                        <p key={idx} className="text-gray-400 text-[10px]">{obl.descripcion}</p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <p className="text-gray-400 italic">Sin obligaciones registradas</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
