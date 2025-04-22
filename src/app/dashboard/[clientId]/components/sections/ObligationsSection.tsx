import { useState } from 'react';
import { SectionProps, formatDate } from '../infoClientePF';
import SectionHeader from './SectionHeader';
import EditButtons from './EditButtons';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Obligation {
  descripcion: string;
  vencimiento: string;
  fechaInicio: string;
  fechaFin?: string;
}

export default function ObligationsSection({
  client,
  editClient,
  isEditing,
  saving,
  toggleEditMode,
  handleInputChange,
  saveChanges
}: SectionProps) {
  const [newObligation, setNewObligation] = useState<Obligation>({
    descripcion: '',
    vencimiento: 'Mensual',
    fechaInicio: new Date().toISOString().split('T')[0]
  });

  const addObligation = () => {
    if (!newObligation.descripcion || !newObligation.fechaInicio) return;
    
    const updatedObligations = [
      ...(editClient.obligaciones || []),
      { ...newObligation }
    ];
    
    handleInputChange('obligaciones', updatedObligations);
    setNewObligation({
      descripcion: '',
      vencimiento: 'Mensual',
      fechaInicio: new Date().toISOString().split('T')[0]
    });
  };

  const updateObligation = (index: number, field: keyof Obligation, value: string) => {
    const updatedObligations = [...(editClient.obligaciones || [])];
    updatedObligations[index] = {
      ...updatedObligations[index],
      [field]: value
    };
    
    handleInputChange('obligaciones', updatedObligations);
  };

  const removeObligation = (index: number) => {
    const updatedObligations = [...(editClient.obligaciones || [])];
    updatedObligations.splice(index, 1);
    
    handleInputChange('obligaciones', updatedObligations);
  };

  return (
    <div className="border rounded-lg shadow-sm overflow-hidden">
      <SectionHeader 
        title="Obligaciones" 
        isEditing={isEditing} 
        toggleEditMode={toggleEditMode} 
      />
      <div className="text-sm">
        {!isEditing ? (
          (client.obligaciones?.length ?? 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Inicio</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fin</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {client.obligaciones?.map((obligacion, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 whitespace-nowrap">{obligacion.descripcion}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{obligacion.vencimiento}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(obligacion.fechaInicio)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{obligacion.fechaFin ? formatDate(obligacion.fechaFin) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No hay obligaciones registradas</p>
          )
        ) : (
          <div className="space-y-3">
            {/* List of existing obligations */}
            {(editClient.obligaciones?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <p className="font-medium">Obligaciones actuales:</p>
                {editClient.obligaciones?.map((obligacion, index) => (
                  <div key={index} className="border p-2 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-grow">
                        <label className="font-medium block mb-1">Descripción</label>
                        <input 
                          type="text" 
                          value={obligacion.descripcion} 
                          onChange={(e) => updateObligation(index, 'descripcion', e.target.value)}
                          className="w-full border rounded p-1 text-sm" 
                        />
                      </div>
                      <button 
                        onClick={() => removeObligation(index)}
                        className="ml-2 text-red-500 hover:text-red-700"
                        title="Eliminar obligación"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-2">
                      <div>
                        <label className="font-medium block mb-1">Vencimiento</label>
                        <select
                          value={obligacion.vencimiento}
                          onChange={(e) => updateObligation(index, 'vencimiento', e.target.value)}
                          className="w-full border rounded p-1 text-sm"
                        >
                          <option value="Mensual">Mensual</option>
                          <option value="Bimestral">Bimestral</option>
                          <option value="Trimestral">Trimestral</option>
                          <option value="Cuatrimestral">Cuatrimestral</option>
                          <option value="Semestral">Semestral</option>
                          <option value="Anual">Anual</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-medium block mb-1">Fecha Inicio</label>
                        <input 
                          type="date" 
                          value={obligacion.fechaInicio ? new Date(obligacion.fechaInicio).toISOString().split('T')[0] : ''}
                          onChange={(e) => updateObligation(index, 'fechaInicio', e.target.value)}
                          className="w-full border rounded p-1 text-sm" 
                        />
                      </div>
                      <div>
                        <label className="font-medium block mb-1">Fecha Fin (opcional)</label>
                        <input 
                          type="date" 
                          value={obligacion.fechaFin ? new Date(obligacion.fechaFin).toISOString().split('T')[0] : ''}
                          onChange={(e) => updateObligation(index, 'fechaFin', e.target.value)}
                          className="w-full border rounded p-1 text-sm" 
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <hr className="my-3" />
              </div>
            )}

            {/* Add new obligation form */}
            <div className="border p-2 rounded-md bg-gray-50">
              <p className="font-medium mb-2">Agregar nueva obligación:</p>
              <div className="mb-2">
                <label className="font-medium block mb-1">Descripción</label>
                <input 
                  type="text" 
                  value={newObligation.descripcion} 
                  onChange={(e) => setNewObligation({...newObligation, descripcion: e.target.value})}
                  placeholder="Ej: Declaración de IVA"
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
              <div className="grid md:grid-cols-3 gap-2 mb-2">
                <div>
                  <label className="font-medium block mb-1">Vencimiento</label>
                  <select
                    value={newObligation.vencimiento}
                    onChange={(e) => setNewObligation({...newObligation, vencimiento: e.target.value})}
                    className="w-full border rounded p-1 text-sm"
                  >
                    <option value="Mensual">Mensual</option>
                    <option value="Bimestral">Bimestral</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Cuatrimestral">Cuatrimestral</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium block mb-1">Fecha Inicio</label>
                  <input 
                    type="date" 
                    value={newObligation.fechaInicio}
                    onChange={(e) => setNewObligation({...newObligation, fechaInicio: e.target.value})}
                    className="w-full border rounded p-1 text-sm" 
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1">Fecha Fin (opcional)</label>
                  <input 
                    type="date" 
                    value={newObligation.fechaFin || ''}
                    onChange={(e) => setNewObligation({...newObligation, fechaFin: e.target.value})}
                    className="w-full border rounded p-1 text-sm" 
                  />
                </div>
              </div>
              <button
                onClick={addObligation}
                disabled={!newObligation.descripcion || !newObligation.fechaInicio}
                className="flex items-center px-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                Agregar Obligación
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
