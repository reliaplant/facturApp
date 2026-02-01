import { useState } from 'react';
import { SectionProps, formatDate } from '../infoClientePF';
import SectionHeader from './SectionHeader';
import EditButtons from './EditButtons';
import { PlusIcon, TrashIcon, StarIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

// Catálogo de regímenes fiscales del SAT con sus obligaciones
const REGIMENES_FISCALES: Record<string, { nombre: string; obligaciones: string[] }> = {
  '601': { 
    nombre: 'General de Ley Personas Morales',
    obligaciones: [
      'Declaración anual de ISR (marzo)',
      'Pagos provisionales mensuales de ISR (día 17)',
      'Declaración mensual de IVA (día 17)',
      'Declaración Informativa de Operaciones con Terceros (DIOT)',
      'Contabilidad electrónica',
      'Emisión de CFDI por ingresos'
    ]
  },
  '603': { 
    nombre: 'Personas Morales con Fines no Lucrativos',
    obligaciones: [
      'Declaración anual informativa (febrero)',
      'Declaración de transparencia',
      'Contabilidad electrónica',
      'Emisión de CFDI por donativos'
    ]
  },
  '605': { 
    nombre: 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
    obligaciones: [
      'Declaración anual de ISR (abril)',
      'Informar cambio de domicilio fiscal'
    ]
  },
  '606': { 
    nombre: 'Arrendamiento',
    obligaciones: [
      'Declaración anual de ISR (abril)',
      'Pagos provisionales mensuales/trimestrales de ISR',
      'Declaración mensual de IVA (día 17)',
      'Emisión de CFDI por rentas',
      'DIOT (si aplica)'
    ]
  },
  '607': { 
    nombre: 'Régimen de Enajenación o Adquisición de Bienes',
    obligaciones: [
      'Declaración anual de ISR (abril)',
      'Pago de ISR por enajenación',
      'Emisión de CFDI'
    ]
  },
  '608': { 
    nombre: 'Demás ingresos',
    obligaciones: [
      'Declaración anual de ISR (abril)',
      'Pagos provisionales según tipo de ingreso'
    ]
  },
  '610': { 
    nombre: 'Residentes en el Extranjero sin Establecimiento Permanente en México',
    obligaciones: [
      'Retención de ISR por pagos recibidos',
      'Sin obligación de declaración anual en México'
    ]
  },
  '611': { 
    nombre: 'Ingresos por Dividendos',
    obligaciones: [
      'Declaración anual de ISR (abril)',
      'Acumulación de dividendos en declaración anual',
      'Acreditamiento de ISR retenido'
    ]
  },
  '612': { 
    nombre: 'Personas Físicas con Actividades Empresariales y Profesionales',
    obligaciones: [
      'Declaración anual de ISR (abril)',
      'Pagos provisionales mensuales de ISR (día 17)',
      'Declaración mensual de IVA (día 17)',
      'DIOT mensual',
      'Contabilidad electrónica',
      'Emisión de CFDI por ingresos'
    ]
  },
  '614': { 
    nombre: 'Ingresos por intereses',
    obligaciones: [
      'Declaración anual de ISR (abril)',
      'Acumulación de intereses reales',
      'Acreditamiento de ISR retenido'
    ]
  },
  '615': { 
    nombre: 'Régimen de los ingresos por obtención de premios',
    obligaciones: [
      'Declaración anual de ISR (abril)',
      'Acumulación de premios gravables'
    ]
  },
  '616': { 
    nombre: 'Sin obligaciones fiscales',
    obligaciones: [
      'Sin obligaciones periódicas'
    ]
  },
  '620': { 
    nombre: 'Sociedades Cooperativas de Producción',
    obligaciones: [
      'Declaración anual de ISR',
      'Pagos provisionales mensuales',
      'Declaración mensual de IVA',
      'Contabilidad electrónica'
    ]
  },
  '621': { 
    nombre: 'Incorporación Fiscal',
    obligaciones: [
      'Declaración bimestral de ISR e IVA',
      'Emisión de CFDI',
      'Registro de ingresos y gastos'
    ]
  },
  '622': { 
    nombre: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
    obligaciones: [
      'Declaración anual de ISR',
      'Pagos provisionales semestrales de ISR',
      'Declaración mensual de IVA',
      'Emisión de CFDI'
    ]
  },
  '623': { 
    nombre: 'Opcional para Grupos de Sociedades',
    obligaciones: [
      'Declaración anual consolidada',
      'Pagos provisionales consolidados',
      'Contabilidad electrónica'
    ]
  },
  '624': { 
    nombre: 'Coordinados',
    obligaciones: [
      'Declaración anual de ISR',
      'Pagos provisionales',
      'Contabilidad electrónica'
    ]
  },
  '625': { 
    nombre: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
    obligaciones: [
      'Declaración anual de ISR (abril)',
      'Retención de ISR por plataformas',
      'Declaración mensual de IVA',
      'Emisión de CFDI'
    ]
  },
  '626': { 
    nombre: 'Régimen Simplificado de Confianza',
    obligaciones: [
      'Declaración anual de ISR (abril)',
      'Pagos mensuales de ISR (día 17) - tasa según ingresos',
      'Declaración mensual de IVA (día 17)',
      'Emisión de CFDI por ingresos',
      'No requiere contabilidad electrónica'
    ]
  },
};

// Helper para obtener el código del régimen
const getCodigoRegimen = (regimen: string): string => {
  const match = regimen.match(/^(\d{3})/);
  return match ? match[1] : '';
};
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
interface RegimenFiscal {
  regimen: string;
  fechaInicio: string;
  fechaFin?: string;
  esPredeterminado?: boolean;
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
  const [newRegimen, setNewRegimen] = useState<RegimenFiscal>({
    regimen: '',
    fechaInicio: new Date().toISOString().split('T')[0]
  });

  const addRegimen = () => {
    if (!newRegimen.regimen || !newRegimen.fechaInicio) return;
    
    const updatedRegimenes = [
      ...(editClient.regimenesFiscales || []),
      { ...newRegimen }
    ];
    
    handleInputChange('regimenesFiscales', updatedRegimenes);
    setNewRegimen({
      regimen: '',
      fechaInicio: new Date().toISOString().split('T')[0]
    });
  };

  const updateRegimen = (index: number, field: keyof RegimenFiscal, value: string) => {
    const updatedRegimenes = [...(editClient.regimenesFiscales || [])];
    updatedRegimenes[index] = {
      ...updatedRegimenes[index],
      [field]: value
    };
    
    handleInputChange('regimenesFiscales', updatedRegimenes);
  };

  const removeRegimen = (index: number) => {
    const updatedRegimenes = [...(editClient.regimenesFiscales || [])];
    updatedRegimenes.splice(index, 1);
    
    handleInputChange('regimenesFiscales', updatedRegimenes);
  };

  const togglePredeterminado = (index: number) => {
    const updatedRegimenes = [...(editClient.regimenesFiscales || [])].map((reg, i) => ({
      ...reg,
      esPredeterminado: i === index
    }));
    
    handleInputChange('regimenesFiscales', updatedRegimenes);
  };

  // Obtener el régimen predeterminado para mostrar
  const regimenPredeterminado = client.regimenesFiscales?.find(r => r.esPredeterminado) || client.regimenesFiscales?.[0];
  const codigoPredeterminado = regimenPredeterminado ? getCodigoRegimen(regimenPredeterminado.regimen) : '';
  const obligacionesPredeterminado = codigoPredeterminado ? REGIMENES_FISCALES[codigoPredeterminado]?.obligaciones || [] : [];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <SectionHeader 
        title="Régimen Fiscal y Obligaciones" 
        isEditing={isEditing} 
        toggleEditMode={toggleEditMode} 
      />
      <div className="text-xs">
        {!isEditing ? (
          (client.regimenesFiscales?.length ?? 0) > 0 ? (
            <div>
              {/* Mostrar régimen predeterminado destacado */}
              {regimenPredeterminado && (
                <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
                  <div className="flex items-center gap-2">
                    <StarIconSolid className="h-4 w-4 text-purple-500" />
                    <span className="text-[10px] text-purple-600 uppercase font-medium">Régimen Predeterminado</span>
                  </div>
                  <div className="mt-1 font-medium text-purple-900">{regimenPredeterminado.regimen}</div>
                  
                  {/* Obligaciones del régimen predeterminado */}
                  {obligacionesPredeterminado.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <div className="flex items-center gap-1.5 mb-2">
                        <ClipboardDocumentListIcon className="h-3.5 w-3.5 text-purple-500" />
                        <span className="text-[10px] text-purple-600 uppercase font-medium">Obligaciones Fiscales del Régimen</span>
                      </div>
                      <ul className="space-y-1">
                        {obligacionesPredeterminado.map((obl, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-purple-800">
                            <span className="text-purple-400 mt-0.5">•</span>
                            <span>{obl}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {/* Lista de otros regímenes si hay más de uno */}
              {(client.regimenesFiscales?.length ?? 0) > 1 && (
                <div className="overflow-x-auto">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <span className="text-[10px] text-gray-500 uppercase font-medium">Otros Regímenes</span>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide">Régimen</th>
                        <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide">Fecha Inicio</th>
                        <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide">Fecha Fin</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {client.regimenesFiscales?.filter(r => !r.esPredeterminado && r !== regimenPredeterminado).map((regimen, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 whitespace-nowrap">{regimen.regimen}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatDate(regimen.fechaInicio)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{regimen.fechaFin ? formatDate(regimen.fechaFin) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-3 text-center text-gray-400 text-xs italic">
              Sin regímenes fiscales registrados
            </div>
          )
        ) : (
          <div className="p-4 pb-24 space-y-4">
            {/* Existing regímenes as compact list */}
            {(editClient.regimenesFiscales?.length ?? 0) > 0 && (
              <div className="space-y-3">
                {editClient.regimenesFiscales?.map((regimen, index) => {
                  const codigoReg = getCodigoRegimen(regimen.regimen);
                  const obligacionesReg = codigoReg ? REGIMENES_FISCALES[codigoReg]?.obligaciones || [] : [];
                  
                  return (
                    <div key={index} className={`rounded-lg overflow-hidden border ${regimen.esPredeterminado ? 'border-purple-300 bg-purple-50' : regimen.fechaFin ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center gap-2 p-2">
                        <button
                          onClick={() => togglePredeterminado(index)}
                          className={`p-1.5 rounded-full transition-colors ${regimen.esPredeterminado ? 'text-purple-500 bg-purple-100' : 'text-gray-300 hover:text-purple-400 hover:bg-purple-50'}`}
                          title={regimen.esPredeterminado ? 'Régimen predeterminado' : 'Marcar como predeterminado'}
                        >
                          {regimen.esPredeterminado ? <StarIconSolid className="h-4 w-4" /> : <StarIcon className="h-4 w-4" />}
                        </button>
                        <div className="flex-1 flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] text-gray-500 font-medium">Régimen Fiscal *</span>
                              <select 
                                value={regimen.regimen} 
                                onChange={(e) => updateRegimen(index, 'regimen', e.target.value)}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white mt-0.5"
                              >
                                <option value="">Seleccionar régimen...</option>
                                {Object.entries(REGIMENES_FISCALES).map(([codigo, data]) => (
                                  <option key={codigo} value={`${codigo} - ${data.nombre}`}>
                                    {codigo} - {data.nombre}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-500 font-medium">Fecha Inicio *</span>
                              <input 
                                type="date" 
                                value={formatDateForInput(regimen.fechaInicio)}
                                onChange={(e) => updateRegimen(index, 'fechaInicio', e.target.value)}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white mt-0.5" 
                              />
                            </div>
                          </div>
                          {/* Toggle inactivo */}
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={!!regimen.fechaFin}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    updateRegimen(index, 'fechaFin', new Date().toISOString().split('T')[0]);
                                  } else {
                                    updateRegimen(index, 'fechaFin', '');
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-red-500 focus:ring-red-500"
                              />
                              <span className={`text-[10px] font-medium ${regimen.fechaFin ? 'text-red-600' : 'text-gray-500'}`}>
                                Régimen inactivo
                              </span>
                            </label>
                            {regimen.fechaFin && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-red-500 font-medium">Fecha baja:</span>
                                <input 
                                  type="date" 
                                  value={formatDateForInput(regimen.fechaFin)}
                                  onChange={(e) => updateRegimen(index, 'fechaFin', e.target.value)}
                                  className="border border-red-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 bg-white" 
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => removeRegimen(index)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      
                      {/* Mostrar obligaciones del régimen seleccionado */}
                      {obligacionesReg.length > 0 && (
                        <div className="px-4 py-2 bg-white/50 border-t border-gray-200">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <ClipboardDocumentListIcon className="h-3 w-3 text-gray-400" />
                            <span className="text-[10px] text-gray-500 uppercase font-medium">Obligaciones de este régimen:</span>
                          </div>
                          <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                            {obligacionesReg.map((obl, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-gray-600">
                                <span className="text-gray-300 mt-0.5">•</span>
                                <span className="text-[10px]">{obl}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new - inline */}
            <div className="border border-dashed border-gray-300 rounded-lg bg-white overflow-hidden">
              {/* Labels */}
              <div className="flex items-center gap-2 px-2 pt-2 pb-1">
                <div className="w-8"></div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <span className="text-[10px] text-gray-500 font-medium">Régimen Fiscal *</span>
                  <span className="text-[10px] text-gray-500 font-medium">Fecha Inicio *</span>
                </div>
                <div className="w-8"></div>
              </div>
              <div className="flex items-center gap-2 px-2 pb-2">
                <div className="w-8"></div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <select 
                    value={newRegimen.regimen} 
                    onChange={(e) => setNewRegimen({...newRegimen, regimen: e.target.value})}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Seleccionar régimen...</option>
                    {Object.entries(REGIMENES_FISCALES).map(([codigo, data]) => (
                      <option key={codigo} value={`${codigo} - ${data.nombre}`}>
                        {codigo} - {data.nombre}
                      </option>
                    ))}
                  </select>
                  <input 
                    type="date" 
                    value={newRegimen.fechaInicio}
                    onChange={(e) => setNewRegimen({...newRegimen, fechaInicio: e.target.value})}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                  />
                </div>
                <button
                  onClick={addRegimen}
                  disabled={!newRegimen.regimen || !newRegimen.fechaInicio}
                  className="p-1.5 text-purple-600 hover:bg-purple-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Agregar"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
              
              {/* Preview de obligaciones del nuevo régimen */}
              {newRegimen.regimen && (() => {
                const codigoNew = getCodigoRegimen(newRegimen.regimen);
                const oblNew = codigoNew ? REGIMENES_FISCALES[codigoNew]?.obligaciones || [] : [];
                if (oblNew.length === 0) return null;
                return (
                  <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ClipboardDocumentListIcon className="h-3 w-3 text-blue-500" />
                      <span className="text-[10px] text-blue-600 uppercase font-medium">Obligaciones que se agregarán:</span>
                    </div>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {oblNew.map((obl, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-blue-700">
                          <span className="text-blue-300 mt-0.5">•</span>
                          <span className="text-[10px]">{obl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
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
