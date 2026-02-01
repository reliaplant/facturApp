import { PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SectionHeaderProps {
  title: string;
  isEditing: boolean;
  toggleEditMode: () => void;
  showEditButton?: boolean;
}

export default function SectionHeader({ 
  title, 
  isEditing, 
  toggleEditMode,
  showEditButton = true 
}: SectionHeaderProps) {
  return (
    <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
      <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      {showEditButton && (
        <button 
          onClick={toggleEditMode}
          className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200 transition-colors"
        >
          {isEditing ? (
            <XMarkIcon className="h-3.5 w-3.5" />
          ) : (
            <PencilIcon className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
