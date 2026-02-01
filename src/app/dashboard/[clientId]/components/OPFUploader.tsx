'use client';

import { useState } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { clientService } from '@/services/client-service';
import { Client } from '@/models/Client';
import { formatDate } from './infoClientePF';
import { FiUpload, FiTrash2, FiDownload, FiFileText } from 'react-icons/fi';
import app from '@/services/firebase';

// Initialize Firebase storage directly here to avoid dependency issues
const storage = getStorage(app);

interface OPFUploaderProps {
  clientId: string;
  onClientUpdate: (client: Client) => void;
  client?: Client | null;
}

export default function OPFUploader({ clientId, onClientUpdate, client }: OPFUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      // Create a simpler, more explicit storage path
      const filePath = `clients/${clientId}/opf/${Date.now()}`;
      const opfRef = ref(storage, filePath);
      
      // Upload file and get URL
      await uploadBytes(opfRef, file);
      const downloadURL = await getDownloadURL(opfRef);
      
      // Update client data in database
      await clientService.updateClient(clientId, {
        lastOPFUrl: downloadURL,
        lastOPFDate: new Date().toISOString()
      });

      // Refresh client data
      const updatedClient = await clientService.getClientById(clientId);
      if (updatedClient) {
        onClientUpdate(updatedClient);
      }
    } catch (err) {
      console.error('Error uploading OPF:', err);
      setError(`Error al subir el archivo: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!client?.lastOPFUrl) return;

    try {
      // First try to delete from storage
      try {
        const fileRef = ref(storage, client.lastOPFUrl);
        await deleteObject(fileRef);
      } catch (storageErr) {
        console.error("Storage deletion error:", storageErr);
        // Continue even if storage deletion fails
      }

      // Create an update object that removes the fields
      const updateData: Record<string, any> = {};
      
      // Use deleteField() from Firestore to properly remove fields
      // or use empty string if you want to keep the field but clear its value
      updateData.lastOPFUrl = "";  // empty string instead of null/undefined
      updateData.lastOPFDate = ""; // empty string instead of null/undefined

      // Update client record
      await clientService.updateClient(clientId, updateData);

      // Refresh client data
      const updatedClient = await clientService.getClientById(clientId);
      if (updatedClient) {
        onClientUpdate(updatedClient);
      }
    } catch (err) {
      console.error('Error deleting OPF:', err);
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
        <h3 className="text-sm font-medium text-gray-700">Opinión de Cumplimiento</h3>
        
        {/* Always show upload button in header */}
        <div className="flex items-center space-x-2">
          <input
            type="file"
            id="opf-upload"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label
            htmlFor="opf-upload"
            className="px-2.5 py-1 bg-black text-white text-xs rounded hover:bg-gray-800 cursor-pointer transition-colors"
          >
            {uploading ? 'Subiendo...' : client?.lastOPFUrl ? 'Reemplazar' : 'Subir OPF'}
          </label>
        </div>
      </div>
      
      {error && (
        <div className="text-red-600 text-xs px-4 pt-2">{error}</div>
      )}

      <div className="text-xs p-4">
        {client?.lastOPFUrl ? (
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => handleDownload(client.lastOPFUrl as string)}
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
            {client.lastOPFDate && (
              <span className="text-gray-400 ml-auto">
                Actualizado: {formatDate(client.lastOPFDate)} 
                {Math.floor((Date.now() - new Date(client.lastOPFDate).getTime()) / (1000 * 60 * 60 * 24)) === 0 
                ? ' (hoy)'
                : ` (${Math.floor((Date.now() - new Date(client.lastOPFDate).getTime()) / (1000 * 60 * 60 * 24))} días)`}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center">
            <FiFileText className="h-4 w-4 text-gray-400 mr-2" />
            <p className="text-gray-500">No hay opinión de cumplimiento cargada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
