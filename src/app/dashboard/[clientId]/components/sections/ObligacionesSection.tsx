import { useState } from 'react';
import { SectionProps, formatDate } from '../infoClientePF';
import SectionHeader from './SectionHeader';
import EditButtons from './EditButtons';
import { PlusIcon, TrashIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

// Helper para convertir fechas a formato YYYY-MM-DD para inputs de tipo date
const formatDateForInput = (dateString: string | undefined): string => {
  if (!dateString) return '';
  
  // If already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // If in DD/MM/YYYY format (common in CSF)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
  }
  
  // Try to parse as a date
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Ignore parse errors
  }
  
  return '';
};

interface Obligacion {
  descripcion: string;
  descripcionVencimiento: string;
  fechaInicio: string;
  fechaFin?: string;
}

export default function ObligacionesSection({
  client,
  editClient,
  isEditing,
  saving,
  toggleEditMode,
  handleInputChange,
  saveChanges
}: SectionProps) {
  const [newObligacion, setNewObligacion] = useState<Obligacion>({
    descripcion: '',
    descripcionVencimiento: '',
    fechaInicio: new Date().toISOString().split('T')[0]
  });

  const addObligacion = () => {
    if (!newObligacion.descripcion || !newObligacion.fechaInicio) return;
    
    const updatedObligaciones = [
      ...(editClient?.obligaciones || []),
      { ...newObligacion }
    ];
    
    handleInputChange('obligaciones', updatedObligaciones);
    setNewObligacion({
      descripcion: '',
      descripcionVencimiento: '',
      fechaInicio: new Date().toISOString().split('T')[0]
    });
  };

  const updateObligacion = (index: number, field: keyof Obligacion, value: string) => {
    const updatedObligaciones = [...(editClient?.obligaciones || [])];
    updatedObligaciones[index] = {
      ...updatedObligaciones[index],
      [field]: value
    };
    
    handleInputChange('obligaciones', updatedObligaciones);
  };

  const removeObligacion = (index: number) => {
    const updatedObligaciones = [...(editClient?.obligaciones || [])];
    updatedObligaciones.splice(index, 1);
    
    handleInputChange('obligaciones', updatedObligaciones);
  };

  // Early return if client is null
  if (!client) return null;

  // Separar obligaciones activas e inactivas
  const obligacionesActivas = client.obligaciones?.filter(o => !o.fechaFin) || [];
  const obligacionesInactivas = client.obligaciones?.filter(o => o.fechaFin) || [];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <SectionHeader 
        title="Obligaciones Fiscales" 
        isEditing={isEditing} 
        toggleEditMode={toggleEditMode} 
      />
      <div className="text-xs">
        {!isEditing ? (
          (client.obligaciones?.length ?? 0) > 0 ? (
            <div>
              {/* Obligaciones activas */}
              {obligacionesActivas.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide">Descripción de la Obligación</th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide">Descripción Vencimiento</th>
                        <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide w-28">Fecha Inicio</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {obligacionesActivas.map((obligacion, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{obligacion.descripcion}</td>
                          <td className="px-3 py-2 text-gray-600 text-[11px]">{obligacion.descripcionVencimiento}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-600">{formatDate(obligacion.fechaInicio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Obligaciones inactivas (colapsadas) */}
              {obligacionesInactivas.length > 0 && (
                <details className="border-t border-gray-200">
                  <summary className="px-4 py-2 bg-gray-50 cursor-pointer text-[10px] text-gray-500 uppercase font-medium hover:bg-gray-100">
                    Obligaciones finalizadas ({obligacionesInactivas.length})
                  </summary>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-red-500 uppercase tracking-wide">Descripción</th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-red-500 uppercase tracking-wide w-28">Fecha Inicio</th>
                          <th className="px-3 py-2 text-left text-[10px] font-medium text-red-500 uppercase tracking-wide w-28">Fecha Fin</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {obligacionesInactivas.map((obligacion, index) => (
                          <tr key={index} className="text-gray-400">
                            <td className="px-3 py-2">{obligacion.descripcion}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatDate(obligacion.fechaInicio)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-red-500">{formatDate(obligacion.fechaFin || '')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="px-4 py-3 text-center text-gray-400 text-xs italic">
              Sin obligaciones fiscales registradas
            </div>
          )
        ) : (
          <div className="p-4 pb-24 space-y-4">
            {/* Existing obligations */}
            {(editClient.obligaciones?.length ?? 0) > 0 && (
              <div className="space-y-2">
                {editClient.obligaciones?.map((obligacion, index) => (
                  <div key={index} className={`rounded-lg border p-3 ${obligacion.fechaFin ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <div>
                          <span className="text-[10px] text-gray-500 font-medium">Descripción de la Obligación *</span>
                          <input 
                            type="text"
                            value={obligacion.descripcion || ''}
                            onChange={(e) => updateObligacion(index, 'descripcion', e.target.value)}
                            placeholder="Ej: Declaración anual de ISR. Personas Físicas."
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white mt-0.5"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 font-medium">Descripción de Vencimiento</span>
                          <input 
                            type="text"
                            value={obligacion.descripcionVencimiento || ''}
                            onChange={(e) => updateObligacion(index, 'descripcionVencimiento', e.target.value)}
                            placeholder="Ej: A más tardar el 30 de abril del ejercicio siguiente."
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white mt-0.5"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] text-gray-500 font-medium">Fecha Inicio *</span>
                            <input 
                              type="date"
                              value={formatDateForInput(obligacion.fechaInicio)}
                              onChange={(e) => updateObligacion(index, 'fechaInicio', e.target.value)}
                              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white mt-0.5"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 font-medium">Fecha Fin (si ya no aplica)</span>
                            <input 
                              type="date"
                              value={formatDateForInput(obligacion.fechaFin)}
                              onChange={(e) => updateObligacion(index, 'fechaFin', e.target.value)}
                              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white mt-0.5"
                            />
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeObligacion(index)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new obligation */}
            <div className="border border-dashed border-gray-300 rounded-lg bg-white p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div>
                    <span className="text-[10px] text-gray-500 font-medium">Descripción de la Obligación *</span>
                    <input 
                      type="text"
                      value={newObligacion.descripcion}
                      onChange={(e) => setNewObligacion({...newObligacion, descripcion: e.target.value})}
                      placeholder="Ej: Declaración anual de ISR. Personas Físicas."
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-medium">Descripción de Vencimiento</span>
                    <input 
                      type="text"
                      value={newObligacion.descripcionVencimiento}
                      onChange={(e) => setNewObligacion({...newObligacion, descripcionVencimiento: e.target.value})}
                      placeholder="Ej: A más tardar el 30 de abril del ejercicio siguiente."
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-medium">Fecha Inicio *</span>
                    <input 
                      type="date"
                      value={newObligacion.fechaInicio}
                      onChange={(e) => setNewObligacion({...newObligacion, fechaInicio: e.target.value})}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 mt-0.5"
                    />
                  </div>
                </div>
                <button
                  onClick={addObligacion}
                  disabled={!newObligacion.descripcion || !newObligacion.fechaInicio}
                  className="p-1.5 text-purple-600 hover:bg-purple-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Agregar"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <EditButtons 
              onCancel={toggleEditMode} 
              onSave={saveChanges} 
              saving={saving} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
