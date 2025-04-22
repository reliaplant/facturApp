import { CheckIcon } from '@heroicons/react/24/outline';

interface EditButtonsProps {
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}

export default function EditButtons({ onCancel, onSave, saving }: EditButtonsProps) {
  return (
    <div className="flex justify-end space-x-2 mt-2">
      <button
        onClick={onCancel}
        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
      >
        Cancelar
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
      >
        {saving ? 'Guardando...' : 'Guardar'}
        <CheckIcon className="ml-1 h-3 w-3" />
      </button>
    </div>
  );
}
