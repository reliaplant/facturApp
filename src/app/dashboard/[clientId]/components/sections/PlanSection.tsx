import { SectionProps } from '../infoClientePF';
import SectionHeader from './SectionHeader';
import EditButtons from './EditButtons';

export default function PlanSection({
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
        title="Información de Servicio" 
        isEditing={isEditing} 
        toggleEditMode={toggleEditMode} 
      />
      <div className="p-3 text-sm">
        {!isEditing ? (
          <div>
            <p className="font-medium">Plan</p>
            <p>{client.plan}</p>
          </div>
        ) : (
          <>
            <div>
              <label className="font-medium block mb-1">Plan</label>
              <select 
                value={editClient.plan || ''} 
                onChange={(e) => handleInputChange('plan', e.target.value)}
                className="w-full border rounded p-1 text-sm"
              >
                <option value="BÁSICO">BÁSICO</option>
                <option value="ESTÁNDAR">ESTÁNDAR</option>
                <option value="PREMIUM">PREMIUM</option>
              </select>
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
