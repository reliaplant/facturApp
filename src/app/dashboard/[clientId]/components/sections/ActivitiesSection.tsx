import { useState } from 'react';
import { SectionProps, formatDate } from '../infoClientePF';
import SectionHeader from './SectionHeader';
import EditButtons from './EditButtons';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Activity {
  regimen: string;
  fechaInicio: string;
  fechaFin?: string;
}

export default function ActivitiesSection({
  client,
  editClient,
  isEditing,
  saving,
  toggleEditMode,
  handleInputChange,
  saveChanges
}: SectionProps) {
  const [newActivity, setNewActivity] = useState<Activity>({
    regimen: '',
    fechaInicio: new Date().toISOString().split('T')[0]
  });

  const addActivity = () => {
    if (!newActivity.regimen || !newActivity.fechaInicio) return;
    
    const updatedActivities = [
      ...(editClient.actividadesEconomicas || []),
      { ...newActivity }
    ];
    
    handleInputChange('actividadesEconomicas', updatedActivities);
    setNewActivity({
      regimen: '',
      fechaInicio: new Date().toISOString().split('T')[0]
    });
  };

  const updateActivity = (index: number, field: keyof Activity, value: string) => {
    const updatedActivities = [...(editClient.actividadesEconomicas || [])];
    updatedActivities[index] = {
      ...updatedActivities[index],
      [field]: value
    };
    
    handleInputChange('actividadesEconomicas', updatedActivities);
  };

  const removeActivity = (index: number) => {
    const updatedActivities = [...(editClient.actividadesEconomicas || [])];
    updatedActivities.splice(index, 1);
    
    handleInputChange('actividadesEconomicas', updatedActivities);
  };

  return (
    <div className="border rounded-lg shadow-sm overflow-hidden">
      <SectionHeader 
        title="Actividades Económicas" 
        isEditing={isEditing} 
        toggleEditMode={toggleEditMode} 
      />
      <div className="text-sm">
        {!isEditing ? (
          (client.actividadesEconomicas?.length ?? 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Régimen</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha Inicio</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha Fin</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {client.actividadesEconomicas?.map((actividad, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 whitespace-nowrap">{actividad.regimen}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(actividad.fechaInicio)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{actividad.fechaFin ? formatDate(actividad.fechaFin) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No hay actividades económicas registradas</p>
          )
        ) : (
          <div className="space-y-3">
            {/* List of existing activities */}
            {(editClient.actividadesEconomicas?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <p className="font-medium">Actividades actuales:</p>
                {editClient.actividadesEconomicas?.map((actividad, index) => (
                  <div key={index} className="border p-2 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-grow">
                        <label className="font-medium block mb-1">Régimen</label>
                        <input 
                          type="text" 
                          value={actividad.regimen} 
                          onChange={(e) => updateActivity(index, 'regimen', e.target.value)}
                          className="w-full border rounded p-1 text-sm" 
                        />
                      </div>
                      <button 
                        onClick={() => removeActivity(index)}
                        className="ml-2 text-red-500 hover:text-red-700"
                        title="Eliminar actividad"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-medium block mb-1">Fecha Inicio</label>
                        <input 
                          type="date" 
                          value={actividad.fechaInicio ? new Date(actividad.fechaInicio).toISOString().split('T')[0] : ''}
                          onChange={(e) => updateActivity(index, 'fechaInicio', e.target.value)}
                          className="w-full border rounded p-1 text-sm" 
                        />
                      </div>
                      <div>
                        <label className="font-medium block mb-1">Fecha Fin (opcional)</label>
                        <input 
                          type="date" 
                          value={actividad.fechaFin ? new Date(actividad.fechaFin).toISOString().split('T')[0] : ''}
                          onChange={(e) => updateActivity(index, 'fechaFin', e.target.value)}
                          className="w-full border rounded p-1 text-sm" 
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <hr className="my-3" />
              </div>
            )}

            {/* Add new activity form */}
            <div className="border p-2 rounded-md bg-gray-50">
              <p className="font-medium mb-2">Agregar nueva actividad:</p>
              <div className="mb-2">
                <label className="font-medium block mb-1">Régimen</label>
                <input 
                  type="text" 
                  value={newActivity.regimen} 
                  onChange={(e) => setNewActivity({...newActivity, regimen: e.target.value})}
                  placeholder="Ej: Régimen de Incorporación Fiscal"
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="font-medium block mb-1">Fecha Inicio</label>
                  <input 
                    type="date" 
                    value={newActivity.fechaInicio}
                    onChange={(e) => setNewActivity({...newActivity, fechaInicio: e.target.value})}
                    className="w-full border rounded p-1 text-sm" 
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">Fecha Fin (opcional)</label>
                  <input 
                    type="date" 
                    value={newActivity.fechaFin || ''}
                    onChange={(e) => setNewActivity({...newActivity, fechaFin: e.target.value})}
                    className="w-full border rounded p-1 text-sm" 
                  />
                </div>
              </div>
              <button
                onClick={addActivity}
                disabled={!newActivity.regimen || !newActivity.fechaInicio}
                className="flex items-center px-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                Agregar Actividad
              </button>
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
