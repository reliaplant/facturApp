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
    <div className="">
      <div className="bg-gray-50 px-3 py-2 border-b flex justify-between items-center">
        <h3 className="">Opinión de Cumplimiento Fiscal</h3>
        
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
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 cursor-pointer"
          >
            {uploading ? 'Subiendo...' : client?.lastOPFUrl ? 'Reemplazar OPF' : 'Subir OPF'}
          </label>
        </div>
      </div>
      
      {error && (
        <div className="text-red-600 text-sm mb-3 px-3 pt-2">{error}</div>
      )}

      <div className="bg-white p-3 text-sm ">
        {client?.lastOPFUrl ? (
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2">
              <FiDownload className="h-5 w-5 text-blue-500" />
              <button 
                onClick={() => handleDownload(client.lastOPFUrl as string)}
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
            {client.lastOPFDate && (
              <div className="flex items-center gap-2 text-gray-500 ml-auto">
                <span>
                  Actualizado: {formatDate(client.lastOPFDate)} 
                  {Math.floor((Date.now() - new Date(client.lastOPFDate).getTime()) / (1000 * 60 * 60 * 24)) === 0 
                  ? ' (hoy)'
                  : ` (${Math.floor((Date.now() - new Date(client.lastOPFDate).getTime()) / (1000 * 60 * 60 * 24))} días atrás)`}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center">
            <FiFileText className="h-5 w-5 text-gray-400 mr-2" />
            <p className="text-gray-500">No hay opinión de cumplimiento cargada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
