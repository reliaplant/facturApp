import { SectionProps, formatDate } from '../infoClientePF';
import SectionHeader from './SectionHeader';
import EditButtons from './EditButtons';

export default function PersonalInfoSection({
  client,
  editClient,
  isEditing,
  saving,
  toggleEditMode,
  handleInputChange,
  saveChanges
}: SectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <SectionHeader 
        title="Datos de Identificación" 
        isEditing={isEditing} 
        toggleEditMode={toggleEditMode} 
      />
    <div className={`p-4 pb-24 text-xs space-y-3 ${isEditing ? 'bg-gray-50' : 'bg-white'}`}>
        {!isEditing ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">RFC</p>
                <p className="font-medium">{client.rfc}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">CURP</p>
                <p className="font-medium">{client.curp}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Email</p>
                <p className="font-medium">{client.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Teléfono</p>
                <p className="font-medium">{client.telefono || 'N/A'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Nombre Completo</p>
                <p className="font-medium">{client.nombres} {client.primerApellido} {client.segundoApellido || ''}</p>
              </div>
              {client.nombreComercial && (
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Nombre Comercial</p>
                  <p className="font-medium">{client.nombreComercial}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {/* Row 1: RFC, CURP */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">RFC</label>
                <input 
                  type="text" 
                  value={editClient.rfc || ''} 
                  onChange={(e) => handleInputChange('rfc', e.target.value)}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">CURP</label>
                <input 
                  type="text" 
                  value={editClient.curp || ''} 
                  onChange={(e) => handleInputChange('curp', e.target.value)}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Email</label>
                <input 
                  type="email" 
                  value={editClient.email || ''} 
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Teléfono</label>
                <input 
                  type="tel" 
                  value={editClient.telefono || ''} 
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
            </div>
            
            {/* Row 2: Nombres */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Nombres</label>
                <input 
                  type="text" 
                  value={editClient.nombres || ''} 
                  onChange={(e) => handleInputChange('nombres', e.target.value)}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Primer Apellido</label>
                <input 
                  type="text" 
                  value={editClient.primerApellido || ''} 
                  onChange={(e) => handleInputChange('primerApellido', e.target.value)}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Segundo Apellido</label>
                <input 
                  type="text" 
                  value={editClient.segundoApellido || ''} 
                  onChange={(e) => handleInputChange('segundoApellido', e.target.value)}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Nombre Comercial</label>
                <input 
                  type="text" 
                  value={editClient.nombreComercial || ''} 
                  onChange={(e) => handleInputChange('nombreComercial', e.target.value)}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
            </div>

            {/* Row 3: Fiscal Info */}
            <div className="border-t pt-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Inicio Operaciones</label>
                  <input 
                    type="date" 
                    value={editClient.fechaInicioOperaciones ? new Date(editClient.fechaInicioOperaciones).toISOString().split('T')[0] : ''} 
                    onChange={(e) => handleInputChange('fechaInicioOperaciones', e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Último Cambio</label>
                  <input 
                    type="date" 
                    value={editClient.fechaUltimoCambioEstado ? new Date(editClient.fechaUltimoCambioEstado).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleInputChange('fechaUltimoCambioEstado', e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Estatus Padrón</label>
                  <select 
                    value={editClient.estatusEnElPadron || ''} 
                    onChange={(e) => handleInputChange('estatusEnElPadron', e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="SUSPENDIDO">SUSPENDIDO</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>
                </div>
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
