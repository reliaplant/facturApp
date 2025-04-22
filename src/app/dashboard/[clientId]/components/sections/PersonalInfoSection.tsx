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
    <div className="border rounded-lg shadow-sm overflow-hidden">
      <SectionHeader 
        title="Datos de Identificación del Contribuyente" 
        isEditing={isEditing} 
        toggleEditMode={toggleEditMode} 
      />
    <div className={`p-3 text-sm space-y-2 ${isEditing ? 'bg-gray-100' : 'bg-white'}`}>
        {!isEditing ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-medium">RFC</p>
                <p>{client.rfc}</p>
              </div>
              <div>
                <p className="font-medium">CURP</p>
                <p>{client.curp}</p>
              </div>
            </div>
            <div>
              <p className="font-medium">Nombre Completo</p>
              <p>{client.nombres} {client.primerApellido} {client.segundoApellido || ''}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {client.nombreComercial && (
                <div>
                  <p className="font-medium">Nombre Comercial</p>
                  <p>{client.nombreComercial}</p>
                </div>
              )}
              <div>
                <p className="font-medium">Email</p>
                <p>{client.email || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium">Teléfono</p>
                <p>{client.telefono || 'N/A'}</p>
              </div>
            </div>

            {/* Fiscal Information */}
            <hr className="my-2" />
            <h3 className="font-medium">Información Fiscal</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-medium">Fecha Inicio Operaciones</p>
                <p>{formatDate(client.fechaInicioOperaciones)}</p>
              </div>
              <div>
                <p className="font-medium">Estatus en el Padrón</p>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  client.estatusEnElPadron === 'ACTIVO' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {client.estatusEnElPadron}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-medium">Fecha Último Cambio</p>
                <p>{formatDate(client.fechaUltimoCambioEstado)}</p>
              </div>

            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">RFC</label>
                <input 
                  type="text" 
                  value={editClient.rfc || ''} 
                  onChange={(e) => handleInputChange('rfc', e.target.value)}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
              <div>
                <label className="font-medium block mb-1">CURP</label>
                <input 
                  type="text" 
                  value={editClient.curp || ''} 
                  onChange={(e) => handleInputChange('curp', e.target.value)}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-medium block mb-1">Nombres</label>
                <input 
                  type="text" 
                  value={editClient.nombres || ''} 
                  onChange={(e) => handleInputChange('nombres', e.target.value)}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Primer Apellido</label>
                <input 
                  type="text" 
                  value={editClient.primerApellido || ''} 
                  onChange={(e) => handleInputChange('primerApellido', e.target.value)}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Segundo Apellido</label>
                <input 
                  type="text" 
                  value={editClient.segundoApellido || ''} 
                  onChange={(e) => handleInputChange('segundoApellido', e.target.value)}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-medium block mb-1">Nombre Comercial</label>
                <input 
                  type="text" 
                  value={editClient.nombreComercial || ''} 
                  onChange={(e) => handleInputChange('nombreComercial', e.target.value)}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Email</label>
                <input 
                  type="email" 
                  value={editClient.email || ''} 
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Teléfono</label>
                <input 
                  type="tel" 
                  value={editClient.telefono || ''} 
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
            </div>

            {/* Fiscal Information Edit */}
            <hr className="my-2" />
            <h3 className="font-medium">Información Fiscal</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">Fecha Inicio Operaciones</label>
                <input 
                  type="date" 
                  value={editClient.fechaInicioOperaciones ? new Date(editClient.fechaInicioOperaciones).toISOString().split('T')[0] : ''} 
                  onChange={(e) => handleInputChange('fechaInicioOperaciones', e.target.value)}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Estatus en el Padrón</label>
                <select 
                  value={editClient.estatusEnElPadron || ''} 
                  onChange={(e) => handleInputChange('estatusEnElPadron', e.target.value)}
                  className="w-full border rounded p-1 text-sm"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="SUSPENDIDO">SUSPENDIDO</option>
                  <option value="CANCELADO">CANCELADO</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium block mb-1">Fecha Último Cambio</label>
                <input 
                  type="date" 
                  value={editClient.fechaUltimoCambioEstado ? new Date(editClient.fechaUltimoCambioEstado).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleInputChange('fechaUltimoCambioEstado', e.target.value)}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>

            </div>
            <EditButtons 
              onCancel={toggleEditMode} 
              onSave={saveChanges} 
              saving={saving} 
            />
          </>
        )}
      </div>
    </div>
  );
}
