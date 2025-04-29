'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { clientService } from '@/services/client-service';
import { Client } from '@/models/Client';
import {
    Loader2,
    Edit,
    Download,
    Trash2,
    Upload,
    X,
    CheckCircle2,
    Copy,
    ClipboardCheck  // Add ClipboardCheck icon
} from 'lucide-react';


interface FielProps {
    client: Client;
    onClientUpdated: (updatedClient: Client) => void;
}

type DocumentType = 'cer' | 'acuseCer' | 'keyCer' | 'renCer' | 'claveFiel' | 'cartaManifiesto';
type ActionType = 'download' | 'delete' | 'upload' | 'viewKey' | 'editKey';

interface DocumentInfo {
    label: string;
    type: DocumentType;
    url?: string;
    date?: string;
    isPrivate: boolean;
}

const formatDate = (dateString: string) => {
    if (!dateString) return 'No disponible';
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
};

// Fixed password for all FIEL operations
const MASTER_PASSWORD = "Nenito";

export default function FielDocumentsSection({ client, onClientUpdated }: FielProps) {
    const [isUploading, setIsUploading] = useState<DocumentType | null>(null);
    const [localClient, setLocalClient] = useState<Client>(client);
    const [claveFieldValue, setClaveFieldValue] = useState('');
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: ActionType, docType: DocumentType } | null>(null);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [editKeyModalOpen, setEditKeyModalOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState<string | null>(null);

    // Define document types
    const documents: DocumentInfo[] = [
        { label: 'Certificado (.cer):', type: 'cer', url: localClient.cerUrl, date: localClient.cerDate, isPrivate: false },
        { label: 'Clave privada (.key):', type: 'keyCer', url: localClient.keyCerUrl, date: localClient.keyCerDate, isPrivate: true },
        { label: 'Contraseña de clave privada (texto):', type: 'claveFiel', url: localClient.claveFielUrl, date: localClient.claveFielDate, isPrivate: true },
        { label: 'Renovación (.ren)', type: 'renCer', url: localClient.renCerUrl, date: localClient.renCerDate, isPrivate: false },
        { label: 'Acuse Renovación (PDF)', type: 'acuseCer', url: localClient.acuseCerUrl, date: localClient.acuseCerDate, isPrivate: false },
        { label: 'Carta Manifiesto (PDF)', type: 'cartaManifiesto', url: localClient.cartaManifiestoUrl, date: localClient.cartaManifiestoDate, isPrivate: false },
    ];

    useEffect(() => {
        setLocalClient(client);
    }, [client]);

    const initiateAction = (action: ActionType, docType: DocumentType, file?: File) => {
        if (action === 'upload' && file) {
            setSelectedFile(file);
        }

        setPendingAction({ type: action, docType });
        setPassword('');
        setPasswordError('');
        setPasswordModalOpen(true);
    };

    const verifyPassword = () => {
        if (password !== MASTER_PASSWORD) {
            setPasswordError('Contraseña incorrecta');
            return;
        }

        setPasswordModalOpen(false);

        if (!pendingAction) return;

        const { type, docType } = pendingAction;

        switch (type) {
            case 'upload':
                if (selectedFile) {
                    handleFileUpload(selectedFile, docType);
                    setSelectedFile(null);
                }
                break;
            case 'download':
                handleDownload(docType);
                break;
            case 'delete':
                handleDelete(docType);
                break;
            case 'viewKey':
                break;
            case 'editKey':
                setEditKeyModalOpen(true);
                break;
        }

        setPendingAction(null);
    };

    const handleFileUpload = async (file: File, type: DocumentType) => {
        if (!file) return;

        try {
            setIsUploading(type);
            const result = await clientService.uploadFielDocument(client.id, file, type);

            // Update local state
            setLocalClient(prev => {
                const updated = { ...prev };
                if (type === 'cer') {
                    updated.cerUrl = result.url;
                    updated.cerDate = result.date;
                } else if (type === 'acuseCer') {
                    updated.acuseCerUrl = result.url;
                    updated.acuseCerDate = result.date;
                } else if (type === 'keyCer') {
                    updated.keyCerUrl = result.url;
                    updated.keyCerDate = result.date;
                } else if (type === 'renCer') {
                    updated.renCerUrl = result.url;
                    updated.renCerDate = result.date;
                } else if (type === 'cartaManifiesto') {
                    updated.cartaManifiestoUrl = result.url;
                    updated.cartaManifiestoDate = result.date;
                }
                return updated;
            });

            // Fix: Get the latest client data and merge with our updates before notifying parent
            const updatedClientData = await clientService.getClientById(client.id);
            if (updatedClientData) {
                // Create a typed object and then add properties with proper type assertions
                const mergedClient: Client = {
                    ...updatedClientData
                };
                
                // Safely set the dynamic properties
                if (type === 'cer') {
                    mergedClient.cerUrl = result.url;
                    mergedClient.cerDate = result.date;
                } else if (type === 'acuseCer') {
                    mergedClient.acuseCerUrl = result.url;
                    mergedClient.acuseCerDate = result.date;
                } else if (type === 'keyCer') {
                    mergedClient.keyCerUrl = result.url;
                    mergedClient.keyCerDate = result.date;
                } else if (type === 'renCer') {
                    mergedClient.renCerUrl = result.url;
                    mergedClient.renCerDate = result.date;
                } else if (type === 'cartaManifiesto') {
                    mergedClient.cartaManifiestoUrl = result.url;
                    mergedClient.cartaManifiestoDate = result.date;
                } else if (type === 'claveFiel') {
                    mergedClient.claveFielUrl = result.url;
                    mergedClient.claveFielDate = result.date;
                }

                // Notify parent component with complete client data
                onClientUpdated(mergedClient);
            } else {
                // Fallback if we can't fetch latest data
                onClientUpdated(localClient);
            }
        } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            // Handle error (show toast, etc.)
        } finally {
            setIsUploading(null);
        }
    };

    const handleEditClaveField = async () => {
        try {
            // We're saving the text directly as the URL for the clave field
            const currentDate = new Date().toISOString();
            const clientRef = {
                claveFielUrl: claveFieldValue,
                claveFielDate: currentDate
            };

            await clientService.updateClient(client.id, clientRef);

            setLocalClient(prev => ({
                ...prev,
                claveFielUrl: claveFieldValue,
                claveFielDate: currentDate
            }));

            onClientUpdated(localClient);
        } catch (error) {
            console.error("Error saving clave FIEL:", error);
        }
    };

    const handleDownload = (type: DocumentType) => {
        const doc = documents.find(d => d.type === type);
        if (doc && doc.url) {
            window.open(doc.url, '_blank');
        }
    };

    const handleDelete = async (type: DocumentType) => {
        try {
            // Prepare database update to remove references
            const updateData: Record<string, any> = {};
            
            switch (type) {
                case 'cer':
                    updateData.cerUrl = null;
                    updateData.cerDate = null;
                    break;
                case 'acuseCer':
                    updateData.acuseCerUrl = null;
                    updateData.acuseCerDate = null;
                    break;
                case 'keyCer':
                    updateData.keyCerUrl = null;
                    updateData.keyCerDate = null;
                    break;
                case 'renCer':
                    updateData.renCerUrl = null;
                    updateData.renCerDate = null;
                    break;
                case 'claveFiel':
                    updateData.claveFielUrl = null;
                    updateData.claveFielDate = null;
                    break;
                case 'cartaManifiesto':
                    updateData.cartaManifiestoUrl = null;
                    updateData.cartaManifiestoDate = null;
                    break;
            }
            
            // For the clave text field, we only need to update the database
            // For actual files, we need to delete from storage first
            if (type !== 'claveFiel') {
                // Only try to delete a file if it's not the claveFiel (which is just text)
                const doc = documents.find(d => d.type === type);
                if (!doc || !doc.url) {
                    console.warn(`No URL found for ${type} document - nothing to delete`);
                    return;
                }
                
                // Delete the file from storage first
                await clientService.deleteFileFromStorage(doc.url);
                console.log(`Deleted file from storage: ${doc.url}`);
            } else {
                console.log(`Removing claveFiel text from client document (no storage deletion needed)`);
            }

            // Update the client in the database
            await clientService.updateClient(client.id, updateData);

            // Update local state with the changes - using type-safe approach
            const updatedLocalClient = { ...localClient };
            
            // Use undefined instead of null to comply with Client type definition
            if (type === 'cer') {
                updatedLocalClient.cerUrl = undefined;
                updatedLocalClient.cerDate = undefined;
            } else if (type === 'acuseCer') {
                updatedLocalClient.acuseCerUrl = undefined;
                updatedLocalClient.acuseCerDate = undefined;
            } else if (type === 'keyCer') {
                updatedLocalClient.keyCerUrl = undefined;
                updatedLocalClient.keyCerDate = undefined;
            } else if (type === 'renCer') {
                updatedLocalClient.renCerUrl = undefined;
                updatedLocalClient.renCerDate = undefined;
            } else if (type === 'claveFiel') {
                updatedLocalClient.claveFielUrl = undefined;
                updatedLocalClient.claveFielDate = undefined;
            } else if (type === 'cartaManifiesto') {
                updatedLocalClient.cartaManifiestoUrl = undefined;
                updatedLocalClient.cartaManifiestoDate = undefined;
            }
            
            setLocalClient(updatedLocalClient);

            // Notify parent component with the updated client
            onClientUpdated(updatedLocalClient);

            console.log(`Successfully deleted ${type} document`);
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
        }
    };

    // Add clipboard copy function
    const handleCopyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopySuccess('claveFiel');
            setTimeout(() => setCopySuccess(null), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <>
            {/* Main Card */}
            <div className="w-full bg-white rounded-lg  shadow-sm">
                {/* Card Header */}
                <div className="p-3 pb-3 border-b">
                    <h3 className="">Documentos FIEL</h3>
                </div>

                {/* Card Content */}
                <div className="">
                    <div className="">
                        {/* Table */}
                        <table className="w-full">
                            {/* Table Header */}
                            <thead>
                                <tr className="border-b">
                                    <th className="w-[60%] px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Documento
                                    </th>
                                    <th className="w-[20%] px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actualizado
                                    </th>
                                    <th className="w-[20%] px-3 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            {/* Table Body */}
                            <tbody>
                                {documents.map((doc) => {
                                    const hasFile = !!doc.url;

                                    return (
                                        <tr key={doc.type} className="border-b hover:bg-gray-50">
                                            {/* Status Cell */}


                                            {/* Document Name Cell */}
                                            <td className="py-1 px-3 font-medium">
                                                <div className='flex flex-row gap-4 items-center'>
                                                    <div>
                                                        <td className="py-2 text-center">
                                                            {hasFile ? (
                                                                <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                                                            ) : (
                                                                <CheckCircle2 className="h-5 w-5 text-gray-300 mx-auto" />
                                                            )}
                                                        </td>
                                                    </div>
                                                    <div className="flex items-center whitespace-nowrap text-sm">
                                                        {doc.label}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Date Cell */}
                                            <td className="py-1 px-3 text-sm whitespace-nowrap text-gray-500">
                                                {doc.date ? (
                                                    <>
                                                        {formatDate(doc.date)}
                                                        {' ('}
                                                        {Math.floor((new Date().getTime() - new Date(doc.date).getTime()) / (1000 * 60 * 60 * 24)) === 0
                                                            ? 'actualizado hoy'
                                                            : `actualizado hace ${Math.floor((new Date().getTime() - new Date(doc.date).getTime()) / (1000 * 60 * 60 * 24))} días`}
                                                        {')'}
                                                    </>
                                                ) : 'No disponible'}
                                            </td>

                                            {/* Actions Cell */}
                                            <td className="py-1 px-3 text-right text-sm">
                                                <div className="flex justify-end gap-1">
                                                    {isUploading === doc.type ? (
                                                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                                    ) : (
                                                        <>
                                                            {doc.type === 'claveFiel' ? (
                                                                // Edit button for claveFiel
                                                                <button
                                                                    className="h-8 w-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
                                                                    title="Editar clave"
                                                                    onClick={() => {
                                                                        setClaveFieldValue(localClient.claveFielUrl || '');
                                                                        initiateAction('editKey', doc.type);
                                                                    }}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </button>
                                                            ) : (
                                                                // Upload button for files
                                                                <label
                                                                    htmlFor={`file-${doc.type}`}
                                                                    className="h-8 w-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer"
                                                                    title="Subir archivo"
                                                                >
                                                                    <Upload className="h-4 w-4" />
                                                                </label>
                                                            )}

                                                            <input
                                                                id={`file-${doc.type}`}
                                                                type="file"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    if (e.target.files && e.target.files[0]) {
                                                                        initiateAction('upload', doc.type, e.target.files[0]);
                                                                    }
                                                                }}
                                                                disabled={isUploading !== null}
                                                                accept=".pdf,.jpg,.jpeg,.png,.cer,.key"
                                                            />

                                                            {hasFile && (
                                                                <>
                                                                    {doc.type === 'claveFiel' ? (
                                                                        // Copy button for claveFiel instead of download
                                                                        <button
                                                                            className="h-8 w-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
                                                                            title="Copiar contraseña"
                                                                            onClick={() => handleCopyToClipboard(doc.url || '')}
                                                                        >
                                                                            {copySuccess === 'claveFiel' ? (
                                                                                <ClipboardCheck className="h-4 w-4 text-green-500" />
                                                                            ) : (
                                                                                <Copy className="h-4 w-4" />
                                                                            )}
                                                                        </button>
                                                                    ) : (
                                                                        // Regular download button for other files
                                                                        <button
                                                                            className="h-8 w-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
                                                                            title="Descargar archivo"
                                                                            onClick={() => initiateAction('download', doc.type)}
                                                                        >
                                                                            <Download className="h-4 w-4" />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        className="h-8 w-8 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50"
                                                                        title="Eliminar archivo"
                                                                        onClick={() => initiateAction('delete', doc.type)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Password Verification Modal */}
            {passwordModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
                        <button
                            onClick={() => {
                                setPasswordModalOpen(false);
                                setPendingAction(null);
                                setSelectedFile(null);
                            }}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="mb-4">
                            <h3 className="text-lg font-semibold">Verificación de contraseña</h3>
                            <p className="text-sm text-gray-500">Esta operación requiere verificación de contraseña.</p>
                        </div>

                        <div className="py-4">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Contraseña"
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        verifyPassword();
                                    }
                                }}
                            />
                            {passwordError && (
                                <p className="text-sm text-red-500 mt-2">{passwordError}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                onClick={() => {
                                    setPasswordModalOpen(false);
                                    setPendingAction(null);
                                    setSelectedFile(null);
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                onClick={verifyPassword}
                            >
                                Verificar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clave FIEL Edit Modal */}
            {editKeyModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
                        <button
                            onClick={() => setEditKeyModalOpen(false)}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="mb-4">
                            <h3 className="text-lg font-semibold">Editar Clave FIEL</h3>
                            <p className="text-sm text-gray-500">Ingrese la nueva clave FIEL.</p>
                        </div>

                        <div className="py-4">
                            <input
                                type="text"
                                value={claveFieldValue}
                                onChange={(e) => setClaveFieldValue(e.target.value)}
                                placeholder="Clave FIEL"
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                onClick={() => setEditKeyModalOpen(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                onClick={() => {
                                    handleEditClaveField();
                                    setEditKeyModalOpen(false);
                                }}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
