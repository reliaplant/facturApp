'use client';

import { useEffect, useState } from 'react';
import { Client } from '@/models/Client';
import { clientService } from '@/services/client-service';
import CSFSection from './CSFSection';
import OPFUploader from './OPFUploader';
import FielDocumentsSection from './sections/fiel';
import { LoadingSkeleton } from './sections/LoadingSkeleton';
import TasksSection from './sections/TasksSection';
import PlanSection from './sections/PlanSection';
import { FiDownload, FiFileText, FiCalendar, FiTrash2, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

// Function to calculate profile completion score
function calculateProfileScore(client: Client): { filled: number; total: number; percentage: number; missing: string[] } {
  const missing: string[] = [];
  
  // Personal info fields to check
  const personalFields: { field: keyof Client | string; label: string; check: (c: Client) => boolean }[] = [
    { field: 'rfc', label: 'RFC', check: (c) => !!c.rfc?.trim() },
    { field: 'curp', label: 'CURP', check: (c) => !!c.curp?.trim() },
    { field: 'nombres', label: 'Nombres', check: (c) => !!c.nombres?.trim() },
    { field: 'primerApellido', label: 'Primer Apellido', check: (c) => !!c.primerApellido?.trim() },
    { field: 'email', label: 'Email', check: (c) => !!c.email?.trim() },
    { field: 'telefono', label: 'Teléfono', check: (c) => !!c.telefono?.trim() },
    { field: 'fechaInicioOperaciones', label: 'Fecha Inicio Operaciones', check: (c) => !!c.fechaInicioOperaciones?.trim() },
    { field: 'estatusEnElPadron', label: 'Estatus en Padrón', check: (c) => !!c.estatusEnElPadron?.trim() },
  ];

  // Address fields to check
  const addressFields: { field: string; label: string; check: (c: Client) => boolean }[] = [
    { field: 'codigoPostal', label: 'Código Postal', check: (c) => !!c.address?.codigoPostal?.trim() },
    { field: 'nombreVialidad', label: 'Calle', check: (c) => !!c.address?.nombreVialidad?.trim() },
    { field: 'numeroExterior', label: 'Número Exterior', check: (c) => !!c.address?.numeroExterior?.trim() },
    { field: 'nombreColonia', label: 'Colonia', check: (c) => !!c.address?.nombreColonia?.trim() },
    { field: 'municipio', label: 'Municipio', check: (c) => !!c.address?.municipio?.trim() },
    { field: 'nombreEntidadFederativa', label: 'Estado', check: (c) => !!c.address?.nombreEntidadFederativa?.trim() },
  ];

  // Arrays to check (at least one item)
  const arrayFields: { field: string; label: string; check: (c: Client) => boolean }[] = [
    { field: 'actividadesEconomicas', label: 'Actividades Económicas', check: (c) => (c.actividadesEconomicas?.length || 0) > 0 },
    { field: 'regimenesFiscales', label: 'Regímenes Fiscales', check: (c) => (c.regimenesFiscales?.length || 0) > 0 },
    { field: 'obligaciones', label: 'Obligaciones', check: (c) => (c.obligaciones?.length || 0) > 0 },
  ];

  // FIEL documents to check
  const fielFields: { field: string; label: string; check: (c: Client) => boolean }[] = [
    { field: 'cerUrl', label: 'Certificado (.cer)', check: (c) => !!c.cerUrl },
    { field: 'keyCerUrl', label: 'Llave Privada (.key)', check: (c) => !!c.keyCerUrl },
    { field: 'claveFielUrl', label: 'Contraseña FIEL', check: (c) => !!c.claveFielUrl },
  ];

  const allFields = [...personalFields, ...addressFields, ...arrayFields, ...fielFields];
  const total = allFields.length;
  let filled = 0;

  for (const f of allFields) {
    if (f.check(client)) {
      filled++;
    } else {
      missing.push(f.label);
    }
  }

  return {
    filled,
    total,
    percentage: Math.round((filled / total) * 100),
    missing
  };
}

interface InfoClientePFProps {
  clientId: string;
}

export interface EditSections {
  plan: boolean;
}

export interface SectionProps {
  client: Client;
  editClient: Client;
  isEditing: boolean;
  saving: boolean;
  toggleEditMode: () => void;
  handleInputChange: (field: keyof Client, value: any, nestedObj?: keyof Client, nestedField?: string) => void;
  saveChanges: () => void;
}

export default function InfoClientePF({ clientId }: InfoClientePFProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState<EditSections>({
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
      } catch (err: any) {
        console.error('Error fetching client data:', err);
        setError(`Error al cargar la información del cliente: ${err?.message || 'Error desconocido'}`);
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
      // Add name if it doesn't exist
      name: clientData.name || `${clientData.nombres || ''} ${clientData.primerApellido || ''}`.trim(),
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
    field: keyof Client, 
    value: string | number | boolean, 
    nestedObj?: keyof Client, 
    nestedField?: string
  ) => {
    if (!editClient) return;
    
    const updatedClient = { ...editClient };
    
    if (nestedObj && nestedField) {
      if (!updatedClient[nestedObj]) {
        // Type assertion to help TypeScript understand this is a valid operation
        (updatedClient[nestedObj] as any) = {};
      }
      
      // Use type assertion to safely update the nested object
      (updatedClient[nestedObj] as any) = {
        ...(updatedClient[nestedObj] as any),
        [nestedField]: value
      };
    } else {
      // For top-level properties
      (updatedClient as any)[field] = value;
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
    <div className="space-y-3 max-w-4xl mx-auto py-6 px-4">
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
          {/* Profile Completion Score */}
          {(() => {
            const score = calculateProfileScore(client);
            const isComplete = score.percentage === 100;
            return (
              <div className={`border rounded-xl p-6 ${isComplete ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {isComplete ? (
                      <FiCheckCircle className="w-8 h-8 text-purple-600" />
                    ) : (
                      <FiAlertCircle className="w-8 h-8 text-red-500" />
                    )}
                    <div className="flex flex-col">
                      <span className={`text-lg font-bold ${isComplete ? 'text-purple-800' : 'text-red-700'}`}>
                        Perfil {isComplete ? 'completo' : 'incompleto'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {score.filled} de {score.total} campos
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-40 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${isComplete ? 'bg-purple-500' : 'bg-red-500'}`}
                        style={{ width: `${score.percentage}%` }}
                      />
                    </div>
                    <span className={`text-lg font-bold min-w-[50px] text-right ${isComplete ? 'text-purple-700' : 'text-red-600'}`}>
                      {score.percentage}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* CSF Section - Contiene toda la información del cliente */}
          <CSFSection 
            client={client} 
            onClientUpdate={handleClientUpdate} 
          />

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

          {/* Tasks Section (if exists) */}
          {client.listaPendientes && client.listaPendientes.length > 0 && (
            <TasksSection client={client} />
          )}

          {/* Plan Section (if exists) */}
          {client.plan && (
            <PlanSection 
              client={client}
              editClient={editClient!}
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
