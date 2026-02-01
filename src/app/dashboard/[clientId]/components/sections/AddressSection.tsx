import { SectionProps } from '../infoClientePF';
import SectionHeader from './SectionHeader';
import EditButtons from './EditButtons';

export default function AddressSection({
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
        title="Dirección" 
        isEditing={isEditing} 
        toggleEditMode={toggleEditMode} 
      />
      <div className={`p-4 pb-24 text-xs ${isEditing ? 'bg-gray-50' : 'bg-white'}`}>
        {!isEditing ? (
          client.address ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Tipo Vialidad</p>
                <p className="font-medium">{client.address.tipoVialidad || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Vialidad</p>
                <p className="font-medium">{client.address.nombreVialidad || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">No. Exterior</p>
                <p className="font-medium">{client.address.numeroExterior || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">No. Interior</p>
                <p className="font-medium">{client.address.numeroInterior || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Colonia</p>
                <p className="font-medium">{client.address.nombreColonia || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Localidad</p>
                <p className="font-medium">{client.address.nombreLocalidad || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Municipio</p>
                <p className="font-medium">{client.address.municipio || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Estado</p>
                <p className="font-medium">{client.address.nombreEntidadFederativa || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">C.P.</p>
                <p className="font-medium">{client.address.codigoPostal || 'N/A'}</p>
              </div>
              <div className="col-span-2 md:col-span-3">
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Entre Calles</p>
                <p className="font-medium">{client.address.entreCalles || 'N/A'}</p>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 text-center text-gray-400 text-xs italic">
              Sin información de dirección
            </div>
          )
        ) : (
          <div className="space-y-3">
            {/* Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Tipo Vialidad</label>
                <input 
                  type="text" 
                  value={editClient.address?.tipoVialidad || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'tipoVialidad')}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Vialidad</label>
                <input 
                  type="text" 
                  value={editClient.address?.nombreVialidad || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'nombreVialidad')}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">No. Ext</label>
                <input 
                  type="text" 
                  value={editClient.address?.numeroExterior || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'numeroExterior')}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">No. Int</label>
                <input 
                  type="text" 
                  value={editClient.address?.numeroInterior || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'numeroInterior')}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
            </div>
            {/* Row 2 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Colonia</label>
                <input 
                  type="text" 
                  value={editClient.address?.nombreColonia || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'nombreColonia')}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Localidad</label>
                <input 
                  type="text" 
                  value={editClient.address?.nombreLocalidad || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'nombreLocalidad')}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Municipio</label>
                <input 
                  type="text" 
                  value={editClient.address?.municipio || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'municipio')}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Estado</label>
                <input 
                  type="text" 
                  value={editClient.address?.nombreEntidadFederativa || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'nombreEntidadFederativa')}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
            </div>
            {/* Row 3 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">C.P.</label>
                <input 
                  type="text" 
                  value={editClient.address?.codigoPostal || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'codigoPostal')}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-gray-500 text-[10px] uppercase tracking-wide mb-1 block">Entre Calles</label>
                <input 
                  type="text" 
                  value={editClient.address?.entreCalles || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'entreCalles')}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" 
                />
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
