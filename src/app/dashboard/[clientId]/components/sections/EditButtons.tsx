import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface EditButtonsProps {
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}

export default function EditButtons({ onCancel, onSave, saving }: EditButtonsProps) {
  return (
    <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-gray-200">
      <button
        onClick={onCancel}
        className="inline-flex items-center px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600 transition-colors"
      >
        <XMarkIcon className="h-3 w-3 mr-1" />
        Cancelar
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center px-3 py-1.5 text-xs bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        <CheckIcon className="h-3 w-3 mr-1" />
        {saving ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  );
}
