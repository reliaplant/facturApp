'use client';

import { useEffect, useState } from 'react';
import { Client } from '@/models/Client';
import { clientService } from '@/services/client-service';
import CSFUploader from './CSFUploader';
import OPFUploader from './OPFUploader';
import FielDocumentsSection from './sections/fiel';
import { LoadingSkeleton } from './sections/LoadingSkeleton';
import PersonalInfoSection from './sections/PersonalInfoSection';
import FiscalInfoSection from './sections/FiscalInfoSection';
import AddressSection from './sections/AddressSection';
import StatusSection from './sections/StatusSection';
import ActivitiesSection from './sections/ActivitiesSection';
import ObligationsSection from './sections/ObligationsSection';
import TasksSection from './sections/TasksSection';
import PlanSection from './sections/PlanSection';
import { FiDownload, FiFileText, FiCalendar, FiTrash2 } from 'react-icons/fi';

interface InfoClientePFProps {
  clientId: string;
}

export interface EditSections {
  personal: boolean;
  fiscal: boolean;
  address: boolean;
  status: boolean;
  activities: boolean;
  obligations: boolean;
  plan: boolean;
}

export interface SectionProps {
  client: Client;
  editClient: Client;
  isEditing: boolean;
  saving: boolean;
  toggleEditMode: () => void;
  handleInputChange: (field: string, value: any, nestedObj?: string, nestedField?: string) => void;
  saveChanges: () => void;
}

export default function InfoClientePF({ clientId }: InfoClientePFProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState<EditSections>({
    personal: false,
    fiscal: false,
    address: false,
    status: false,
    activities: false,
    obligations: false,
    plan: false
  });

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!clientId) {
          setError('ID de cliente no proporcionado');
          setLoading(false);
          return;
        }
        
        console.log(`Fetching client data for ID: ${clientId}`);
        const clientData = await clientService.getClientById(clientId);
        
        if (!clientData) {
          console.error(`No client data returned for ID: ${clientId}`);
          setError('No se encontró información para este cliente');
          setLoading(false);
          return;
        }
        
        console.log(`Client data fetched successfully:`, clientData);
        // Ensure required fields are present
        const validClient = ensureRequiredFields(clientData);
        setClient(validClient);
      } catch (err) {
        console.error('Error fetching client data:', err);
        setError(`Error al cargar la información del cliente: ${err.message || 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchClient();
    } else {
      setError('ID de cliente no proporcionado');
      setLoading(false);
    }
  }, [clientId]);

  // Make sure all required fields exist on the client object
  const ensureRequiredFields = (clientData: Client): Client => {
    // Create a new object with all the required default values
    const validatedClient: Client = {
      ...clientData,
      id: clientData.id || clientId,
      rfc: clientData.rfc || '',
      curp: clientData.curp || '',
      nombres: clientData.nombres || '',
      primerApellido: clientData.primerApellido || '',
      fechaInicioOperaciones: clientData.fechaInicioOperaciones || new Date().toISOString(),
      estatusEnElPadron: clientData.estatusEnElPadron || 'ACTIVO',
      fechaUltimoCambioEstado: clientData.fechaUltimoCambioEstado || new Date().toISOString(),
      ultimaActualizacionDatos: clientData.ultimaActualizacionDatos || new Date().toISOString(),
      address: clientData.address || {
        nombreColonia: '',
        nombreLocalidad: '',
        municipio: '',
        nombreEntidadFederativa: ''
      },
      actividadesEconomicas: clientData.actividadesEconomicas || [],
      obligaciones: clientData.obligaciones || [],
      estatusPago: clientData.estatusPago || 'PENDIENTE',
      estatusCliente: clientData.estatusCliente || 'ACTIVO',
      estatusDeclaracion: clientData.estatusDeclaracion || 'PENDIENTE',
      estatusDeclaracionPagoCliente: clientData.estatusDeclaracionPagoCliente || 'PENDIENTE',
      isActive: typeof clientData.isActive !== 'undefined' ? clientData.isActive : true,
      createdAt: clientData.createdAt || new Date().toISOString(),
      updatedAt: clientData.updatedAt || new Date().toISOString()
    };
    
    return validatedClient;
  };

  // Update editClient when client changes
  useEffect(() => {
    if (client) {
      console.log("Setting editClient from client:", client);
      setEditClient(JSON.parse(JSON.stringify(client)));
    }
  }, [client]);

  // Add handler for client updates from CSF uploader
  const handleClientUpdate = (updatedClient: Client) => {
    console.log("Client updated from child component:", updatedClient);
    
    if (!updatedClient) {
      console.error("Received null or undefined client from child component");
      // Don't update state if we get invalid data
      return;
    }
    
    // Make sure all fields are present
    const validClient = ensureRequiredFields(updatedClient);
    
    // Fix: check that we have client.id before setting state
    if (validClient.id) {
      console.log("Setting validated client:", validClient);
      setClient(validClient);
    } else {
      console.error("Validated client is missing ID");
    }
  };

  const toggleEditMode = (section: keyof EditSections) => {
    setEditMode({
      ...editMode,
      [section]: !editMode[section]
    });
    
    // Reset to original data when canceling edit
    if (editMode[section]) {
      setEditClient(JSON.parse(JSON.stringify(client)));
    }
  };

  const handleInputChange = (
    field: string, 
    value: string | number | boolean, 
    nestedObj?: string, 
    nestedField?: string
  ) => {
    if (!editClient) return;
    
    const updatedClient = { ...editClient };
    
    if (nestedObj && nestedField) {
      if (!updatedClient[nestedObj]) {
        updatedClient[nestedObj] = {};
      }
      updatedClient[nestedObj] = {
        ...updatedClient[nestedObj],
        [nestedField]: value
      };
    } else {
      updatedClient[field] = value;
    }
    
    setEditClient(updatedClient);
  };

  const saveChanges = async (section: keyof EditSections) => {
    if (!editClient) return;
    
    try {
      setSaving(true);
      await clientService.updateClient(clientId, editClient);
      setClient({...editClient});
      setEditMode({ ...editMode, [section]: false });
    } catch (err) {
      console.error('Error saving client data:', err);
      setError('No se pudo guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto py-12">
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md mb-3">
          <h3 className="font-bold text-sm">Error</h3>
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-2">ID del cliente: {clientId || 'No disponible'}</p>
          <div className="mt-2">
            <button 
              className="bg-red-200 hover:bg-red-300 text-red-800 px-3 py-1 rounded text-xs"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : !client ? (
        // Only check for client, not editClient since that's derived from client
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded-md mb-3">
          <h3 className="font-bold text-sm">Cliente no encontrado</h3>
          <p className="text-sm">No se encontró información para este cliente.</p>
          <p className="text-xs mt-2">ID del cliente: {clientId || 'No disponible'}</p>
          <div className="mt-2">
            <button 
              className="bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-3 py-1 rounded text-xs"
              onClick={() => {
                // Fix: Attempt to fetch the client data again
                const fetchClient = async () => {
                  try {
                    setLoading(true);
                    const clientData = await clientService.getClientById(clientId);
                    if (clientData) {
                      const validClient = ensureRequiredFields(clientData);
                      setClient(validClient);
                    }
                  } catch (err) {
                    console.error("Error re-fetching client:", err);
                  } finally {
                    setLoading(false);
                  }
                };
                
                fetchClient();
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : (
        // We have a client, now we can render the components
        // Don't check for editClient since it's derived from client
        <>
          {/* CSF Section */}
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <CSFUploader 
              clientId={clientId} 
              onClientUpdate={handleClientUpdate} 
              client={client}
            />
          </div>

          {/* OPF Section */}
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <OPFUploader 
              clientId={clientId} 
              onClientUpdate={handleClientUpdate} 
              client={client}
            />
          </div>

          {/* FIEL Documents Section */}
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <FielDocumentsSection 
              client={client}
              onClientUpdated={handleClientUpdate}
            />
          </div>

          {/* Personal Info Section */}
          <PersonalInfoSection 
            client={client}
            editClient={editClient}
            isEditing={editMode.personal}
            saving={saving}
            toggleEditMode={() => toggleEditMode('personal')}
            handleInputChange={handleInputChange}
            saveChanges={() => saveChanges('personal')}
          />

          {/* Address Section */}
          <AddressSection 
            client={client}
            editClient={editClient}
            isEditing={editMode.address}
            saving={saving}
            toggleEditMode={() => toggleEditMode('address')}
            handleInputChange={handleInputChange}
            saveChanges={() => saveChanges('address')}
          />

          {/* Activities Section */}
          <ActivitiesSection 
            client={client}
            editClient={editClient}
            isEditing={editMode.activities}
            saving={saving}
            toggleEditMode={() => toggleEditMode('activities')}
            handleInputChange={handleInputChange}
            saveChanges={() => saveChanges('activities')}
          />

          {/* Obligations Section */}
          <ObligationsSection 
            client={client}
            editClient={editClient}
            isEditing={editMode.obligations}
            saving={saving}
            toggleEditMode={() => toggleEditMode('obligations')}
            handleInputChange={handleInputChange}
            saveChanges={() => saveChanges('obligations')}
          />

          {/* Tasks Section (if exists) */}
          {client.listaPendientes && client.listaPendientes.length > 0 && (
            <TasksSection client={client} />
          )}

          {/* Plan Section (if exists) */}
          {client.plan && (
            <PlanSection 
              client={client}
              editClient={editClient}
              isEditing={editMode.plan}
              saving={saving}
              toggleEditMode={() => toggleEditMode('plan')}
              handleInputChange={handleInputChange}
              saveChanges={() => saveChanges('plan')}
            />
          )}
        </>
      )}
    </div>
  );
}

// Helper function (can be moved to a utilities file)
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

export function getStatusBgColor(status: string): string {
  const statusLower = status?.toLowerCase();
  if (!statusLower) return 'bg-gray-100 text-gray-800';
  
  if (statusLower.includes('activ') || statusLower.includes('vigent') || statusLower.includes('al día')) {
    return 'bg-green-100 text-green-800';
  } else if (statusLower.includes('cancel') || statusLower.includes('baja') || statusLower.includes('moroso')) {
    return 'bg-red-100 text-red-800';
  } else if (statusLower.includes('pendiente') || statusLower.includes('próximo')) {
    return 'bg-yellow-100 text-yellow-800';
  }
  
  return 'bg-gray-100 text-gray-800';
}
