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
    <div className="border rounded-lg shadow-sm overflow-hidden">
      <SectionHeader 
        title="Dirección" 
        isEditing={isEditing} 
        toggleEditMode={toggleEditMode} 
      />
      <div className="p-3 bg-white text-sm">
        {!isEditing ? (
          client.address ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Tipo Vialidad: </span>
                  <span>{client.address.tipoVialidad || 'No especificado'}</span>
                </div>
                <div>
                  <span className="font-medium">Nombre Vialidad: </span>
                  <span>{client.address.nombreVialidad || 'No especificado'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Número Exterior: </span>
                  <span>{client.address.numeroExterior || 'No especificado'}</span>
                </div>
                <div>
                  <span className="font-medium">Número Interior: </span>
                  <span>{client.address.numeroInterior || 'No especificado'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Colonia: </span>
                  <span>{client.address.nombreColonia || 'No especificado'}</span>
                </div>
                <div>
                  <span className="font-medium">Localidad: </span>
                  <span>{client.address.nombreLocalidad || 'No especificado'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Municipio: </span>
                  <span>{client.address.municipio || 'No especificado'}</span>
                </div>
                <div>
                  <span className="font-medium">Estado: </span>
                  <span>{client.address.nombreEntidadFederativa || 'No especificado'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Código Postal: </span>
                  <span>{client.address.codigoPostal || 'No especificado'}</span>
                </div>
                <div>
                  <span className="font-medium">Entre Calles: </span>
                  <span>{client.address.entreCalles || 'No especificado'}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No hay información de dirección disponible</p>
          )
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="font-medium block mb-1">Tipo Vialidad</label>
                <input 
                  type="text" 
                  value={editClient.address?.tipoVialidad || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'tipoVialidad')}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Nombre Vialidad</label>
                <input 
                  type="text" 
                  value={editClient.address?.nombreVialidad || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'nombreVialidad')}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="font-medium block mb-1">Número Exterior</label>
                <input 
                  type="text" 
                  value={editClient.address?.numeroExterior || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'numeroExterior')}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Número Interior</label>
                <input 
                  type="text" 
                  value={editClient.address?.numeroInterior || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'numeroInterior')}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="font-medium block mb-1">Colonia</label>
                <input 
                  type="text" 
                  value={editClient.address?.nombreColonia || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'nombreColonia')}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Localidad</label>
                <input 
                  type="text" 
                  value={editClient.address?.nombreLocalidad || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'nombreLocalidad')}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="font-medium block mb-1">Municipio</label>
                <input 
                  type="text" 
                  value={editClient.address?.municipio || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'municipio')}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Estado</label>
                <input 
                  type="text" 
                  value={editClient.address?.nombreEntidadFederativa || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'nombreEntidadFederativa')}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="font-medium block mb-1">Código Postal</label>
                <input 
                  type="text" 
                  value={editClient.address?.codigoPostal || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'codigoPostal')}
                  className="w-full border rounded p-1 text-sm" 
                />
              </div>
              <div>
                <label className="font-medium block mb-1">Entre Calles</label>
                <input 
                  type="text" 
                  value={editClient.address?.entreCalles || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value, 'address', 'entreCalles')}
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
