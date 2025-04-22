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

interface CSFUploaderProps {
  clientId: string;
  onClientUpdate: (client: Client) => void;
  client?: Client | null;
}

export default function CSFUploader({ clientId, onClientUpdate, client }: CSFUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      // Create a simpler, more explicit storage path
      const filePath = `clients/${clientId}/csf/${Date.now()}`;
      const csfRef = ref(storage, filePath);
      
      // Upload file and get URL
      await uploadBytes(csfRef, file);
      const downloadURL = await getDownloadURL(csfRef);
      
      // Update client data in database
      await clientService.updateClient(clientId, {
        lastCSFUrl: downloadURL,
        lastCSFDate: new Date().toISOString()
      });

      // Refresh client data
      const updatedClient = await clientService.getClientById(clientId);
      if (updatedClient) {
        onClientUpdate(updatedClient);
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
    <div className="">
      <div className="bg-gray-50 px-3 py-2 border-b flex justify-between items-center">
        <h3 className="">Constancia de Situación Fiscal</h3>
      </div>
      
      {error && (
        <div className="text-red-600 text-sm mb-3">{error}</div>
      )}

      <div className="bg-white text-sm p-3">
        {client?.lastCSFUrl ? (
          <div className="flex flex-col md:flex-row md:items-center gap-3">
           
            <div className="flex items-center gap-2">
              <FiDownload className="h-5 w-5 text-blue-500" />
              <button 
                onClick={() => handleDownload(client.lastCSFUrl as string)}
                className="text-blue-600 hover:text-blue-800"
              >
                Descargar
              </button>
            </div>
            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              <FiTrash2 className="inline mr-1" />
              Eliminar
            </button>
            {client.lastCSFDate && (
              <div className="flex items-center gap-2 text-gray-500 ml-auto">
                <span>
                  Actualizado: {formatDate(client.lastCSFDate)} 
                  {Math.floor((Date.now() - new Date(client.lastCSFDate).getTime()) / (1000 * 60 * 60 * 24)) === 0 
                  ? ' (hoy)'
                  : ` (${Math.floor((Date.now() - new Date(client.lastCSFDate).getTime()) / (1000 * 60 * 60 * 24))} días atrás)`}
                </span>
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
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 cursor-pointer"
          >
            {uploading ? 'Subiendo...' : client?.lastCSFUrl ? 'Reemplazar CSF' : 'Subir CSF'}
          </label>
        </div>
              </div>
              
            )}
            
          </div>
        ) : (
          <p className="text-gray-500">No hay constancia de situación fiscal cargada.</p>
        )}
      </div>
    </div>
  );
}
