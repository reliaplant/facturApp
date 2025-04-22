import { Client } from '@/models/Client';
import { formatDate } from '../infoClientePF';
import SectionHeader from './SectionHeader';

interface TasksSectionProps {
  client: Client;
}

export default function TasksSection({ client }: TasksSectionProps) {
  return (
    <div className="border rounded-lg shadow-sm overflow-hidden">
      <SectionHeader 
        title="Tareas Pendientes" 
        isEditing={false} 
        toggleEditMode={() => {}} 
        showEditButton={false}
      />
      <div className="p-3 text-sm">
        <div className="space-y-1">
          {client.listaPendientes?.map((tarea, index) => (
            <div key={index} className="flex justify-between pb-1 border-b">
              <p className="truncate mr-2">{tarea.descripcion}</p>
              <p className="text-gray-500 whitespace-nowrap">{formatDate(tarea.fecha)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
