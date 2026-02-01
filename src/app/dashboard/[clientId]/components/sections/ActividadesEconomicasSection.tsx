import { useState } from 'react';
import { SectionProps, formatDate } from '../infoClientePF';
import SectionHeader from './SectionHeader';
import EditButtons from './EditButtons';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

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

interface ActividadEconomica {
  orden: number;
  actividad: string;
  porcentaje: number;
  fechaInicio: string;
  fechaFin?: string;
}

export default function ActividadesEconomicasSection({
  client,
  editClient,
  isEditing,
  saving,
  toggleEditMode,
  handleInputChange,
  saveChanges
}: SectionProps) {
  const [newActividad, setNewActividad] = useState<ActividadEconomica>({
    orden: 1,
    actividad: '',
    porcentaje: 100,
    fechaInicio: new Date().toISOString().split('T')[0]
  });

  const addActividad = () => {
    if (!newActividad.actividad || !newActividad.fechaInicio) return;
    
    const existingActividades = editClient?.actividadesEconomicas || [];
    const maxOrden = existingActividades.length > 0 
      ? Math.max(...existingActividades.map(a => a.orden || 0)) 
      : 0;
    
    const updatedActividades = [
      ...existingActividades,
      { ...newActividad, orden: maxOrden + 1 }
    ];
    
    handleInputChange('actividadesEconomicas', updatedActividades);
    setNewActividad({
      orden: 1,
      actividad: '',
      porcentaje: 100,
      fechaInicio: new Date().toISOString().split('T')[0]
    });
  };

  const updateActividad = (index: number, field: keyof ActividadEconomica, value: string | number) => {
    const updatedActividades = [...(editClient?.actividadesEconomicas || [])];
    updatedActividades[index] = {
      ...updatedActividades[index],
      [field]: value
    };
    
    handleInputChange('actividadesEconomicas', updatedActividades);
  };

  const removeActividad = (index: number) => {
    const updatedActividades = [...(editClient?.actividadesEconomicas || [])];
    updatedActividades.splice(index, 1);
    
    handleInputChange('actividadesEconomicas', updatedActividades);
  };

  // Calcular total de porcentajes
  const totalPorcentaje = (editClient?.actividadesEconomicas || []).reduce(
    (sum, a) => sum + (a.porcentaje || 0), 0
  );

  // Early return if client is null
  if (!client) return null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <SectionHeader 
        title="Actividades Económicas" 
        isEditing={isEditing} 
        toggleEditMode={toggleEditMode} 
      />
      <div className="text-xs">
        {!isEditing ? (
          (client.actividadesEconomicas?.length ?? 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide w-12">Orden</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide">Actividad Económica</th>
                    <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wide w-20">%</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide w-28">Fecha Inicio</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide w-28">Fecha Fin</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {client.actividadesEconomicas?.sort((a, b) => (a.orden || 0) - (b.orden || 0)).map((actividad, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-center font-medium text-gray-600">{actividad.orden}</td>
                      <td className="px-3 py-2">{actividad.actividad}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                          {actividad.porcentaje}%
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">{formatDate(actividad.fechaInicio)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {actividad.fechaFin ? (
                          <span className="text-red-600">{formatDate(actividad.fechaFin)}</span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">Total:</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                        (client.actividadesEconomicas?.reduce((sum, a) => sum + (a.porcentaje || 0), 0) || 0) === 100 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {client.actividadesEconomicas?.reduce((sum, a) => sum + (a.porcentaje || 0), 0) || 0}%
                      </span>
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="px-4 py-3 text-center text-gray-400 text-xs italic">
              Sin actividades económicas registradas
            </div>
          )
        ) : (
          <div className="p-4 pb-24 space-y-4">
            {/* Existing activities */}
            {(editClient.actividadesEconomicas?.length ?? 0) > 0 && (
              <div className="space-y-2">
                {editClient.actividadesEconomicas?.map((actividad, index) => (
                  <div key={index} className={`rounded-lg border p-3 ${actividad.fechaFin ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-16">
                        <span className="text-[10px] text-gray-500 font-medium">Orden</span>
                        <input 
                          type="number"
                          min="1"
                          value={actividad.orden || 1}
                          onChange={(e) => updateActividad(index, 'orden', parseInt(e.target.value) || 1)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white mt-0.5"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-500 font-medium">Actividad Económica *</span>
                        <input 
                          type="text"
                          value={actividad.actividad || ''}
                          onChange={(e) => updateActividad(index, 'actividad', e.target.value)}
                          placeholder="Ej: Otros servicios profesionales, científicos y técnicos"
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white mt-0.5"
                        />
                      </div>
                      <div className="w-20">
                        <span className="text-[10px] text-gray-500 font-medium">Porcentaje</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            value={actividad.porcentaje || 0}
                            onChange={(e) => updateActividad(index, 'porcentaje', parseInt(e.target.value) || 0)}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                          />
                          <span className="text-gray-500">%</span>
                        </div>
                      </div>
                      <div className="w-32">
                        <span className="text-[10px] text-gray-500 font-medium">Fecha Inicio *</span>
                        <input 
                          type="date"
                          value={formatDateForInput(actividad.fechaInicio)}
                          onChange={(e) => updateActividad(index, 'fechaInicio', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white mt-0.5"
                        />
                      </div>
                      <div className="w-32">
                        <span className="text-[10px] text-gray-500 font-medium">Fecha Fin</span>
                        <input 
                          type="date"
                          value={formatDateForInput(actividad.fechaFin)}
                          onChange={(e) => updateActividad(index, 'fechaFin', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white mt-0.5"
                        />
                      </div>
                      <button 
                        onClick={() => removeActividad(index)}
                        className="mt-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Total porcentaje indicator */}
                <div className={`text-right text-xs font-medium ${totalPorcentaje === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                  Total: {totalPorcentaje}% {totalPorcentaje !== 100 && '(debe sumar 100%)'}
                </div>
              </div>
            )}

            {/* Add new activity */}
            <div className="border border-dashed border-gray-300 rounded-lg bg-white p-3">
              <div className="flex items-start gap-3">
                <div className="w-16">
                  <span className="text-[10px] text-gray-500 font-medium">Orden</span>
                  <input 
                    type="number"
                    min="1"
                    value={newActividad.orden}
                    onChange={(e) => setNewActividad({...newActividad, orden: parseInt(e.target.value) || 1})}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-purple-500 mt-0.5"
                  />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-gray-500 font-medium">Actividad Económica *</span>
                  <input 
                    type="text"
                    value={newActividad.actividad}
                    onChange={(e) => setNewActividad({...newActividad, actividad: e.target.value})}
                    placeholder="Ej: Otros servicios profesionales, científicos y técnicos"
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 mt-0.5"
                  />
                </div>
                <div className="w-20">
                  <span className="text-[10px] text-gray-500 font-medium">Porcentaje</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={newActividad.porcentaje}
                      onChange={(e) => setNewActividad({...newActividad, porcentaje: parseInt(e.target.value) || 0})}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
                <div className="w-32">
                  <span className="text-[10px] text-gray-500 font-medium">Fecha Inicio *</span>
                  <input 
                    type="date"
                    value={newActividad.fechaInicio}
                    onChange={(e) => setNewActividad({...newActividad, fechaInicio: e.target.value})}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 mt-0.5"
                  />
                </div>
                <button
                  onClick={addActividad}
                  disabled={!newActividad.actividad || !newActividad.fechaInicio}
                  className="mt-4 p-1.5 text-purple-600 hover:bg-purple-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
