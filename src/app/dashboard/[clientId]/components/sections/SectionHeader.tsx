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
    <div className="bg-gray-50 px-3 py-2 border-b flex justify-between items-center">
      <h3 className="">{title}</h3>
      {showEditButton && (
        <button 
          onClick={toggleEditMode}
          className="text-blue-600 hover:text-blue-800"
        >
          {isEditing ? (
            <XMarkIcon className="h-4 w-4" />
          ) : (
            <PencilIcon className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}
