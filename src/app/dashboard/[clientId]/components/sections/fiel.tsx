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
    CheckCircle2
} from 'lucide-react';


interface FielProps {
    client: Client;
    onClientUpdated: (updatedClient: Client) => void;
}

type DocumentType = 'cer' | 'acuseCer' | 'keyCer' | 'renCer' | 'claveFiel' | 'cartaManifiesto';
type ActionType = 'download' | 'delete' | 'upload';

interface DocumentInfo {
    label: string;
    type: DocumentType;
    url?: string;
    date?: string;
    isPrivate: boolean;
    accept: string;
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
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: ActionType, docType: DocumentType } | null>(null);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Define document types
    const documents: DocumentInfo[] = [
        { 
            label: 'Certificado (.cer):', 
            type: 'cer', 
            url: localClient.cerUrl, 
            date: localClient.cerDate, 
            isPrivate: false,
            accept: '.cer'
        },
        { 
            label: 'Clave privada (.key):', 
            type: 'keyCer', 
            url: localClient.keyCerUrl, 
            date: localClient.keyCerDate, 
            isPrivate: true,
            accept: '.key'
        },
        { 
            label: 'Contraseña de clave privada (.txt):', 
            type: 'claveFiel', 
            url: localClient.claveFielUrl, 
            date: localClient.claveFielDate, 
            isPrivate: true,
            accept: '.txt'
        },
        { 
            label: 'Renovación (.ren)', 
            type: 'renCer', 
            url: localClient.renCerUrl, 
            date: localClient.renCerDate, 
            isPrivate: false,
            accept: '.ren'
        },
        { 
            label: 'Acuse Renovación (PDF)', 
            type: 'acuseCer', 
            url: localClient.acuseCerUrl, 
            date: localClient.acuseCerDate, 
            isPrivate: false,
            accept: '.pdf'
        },
        { 
            label: 'Carta Manifiesto (PDF)', 
            type: 'cartaManifiesto', 
            url: localClient.cartaManifiestoUrl, 
            date: localClient.cartaManifiestoDate, 
            isPrivate: false,
            accept: '.pdf'
        },
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
                } else if (type === 'claveFiel') {
                    updated.claveFielUrl = result.url;
                    updated.claveFielDate = result.date;
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
            
            // Get the URL to delete from storage
            const doc = documents.find(d => d.type === type);
            if (!doc || !doc.url) {
                console.warn(`No URL found for ${type} document - nothing to delete`);
                return;
            }
            
            // Delete the file from storage first
            await clientService.deleteFileFromStorage(doc.url);
            console.log(`Deleted file from storage: ${doc.url}`);

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

    return (
        <>
            {/* Main Card */}
            <div className="w-full bg-white rounded-lg overflow-hidden">
                {/* Card Header */}
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
                    <h3 className="text-sm font-medium text-gray-700">Documentos FIEL</h3>
                </div>

                {/* Card Content */}
                <div className="overflow-x-auto">
                    <div className="">
                        {/* Table */}
                        <table className="w-full text-xs table-fixed min-w-[500px]">
                            {/* Table Header */}
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="w-[45%] px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                                        Documento
                                    </th>
                                    <th className="w-[35%] px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                                        Actualizado
                                    </th>
                                    <th className="w-[20%] px-4 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wide">
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
                                            {/* Document Name Cell */}
                                            <td className="py-2 px-4">
                                                <div className='flex flex-row gap-3 items-center'>
                                                    <div>
                                                        {hasFile ? (
                                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                            <CheckCircle2 className="h-4 w-4 text-gray-300" />
                                                        )}
                                                    </div>
                                                    <span className="font-medium">
                                                        {doc.label}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Date Cell */}
                                            <td className="py-2 px-4 text-gray-500">
                                                {doc.date ? (
                                                    <>
                                                        {formatDate(doc.date)}
                                                        {' ('}
                                                        {Math.floor((new Date().getTime() - new Date(doc.date).getTime()) / (1000 * 60 * 60 * 24)) === 0
                                                            ? 'hoy'
                                                            : `${Math.floor((new Date().getTime() - new Date(doc.date).getTime()) / (1000 * 60 * 60 * 24))} días`}
                                                        {')'}
                                                    </>
                                                ) : <span className="text-gray-400">—</span>}
                                            </td>

                                            {/* Actions Cell */}
                                            <td className="py-2 px-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    {isUploading === doc.type ? (
                                                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                                    ) : (
                                                        <>
                                                            {/* Upload button for all document types */}
                                                            <label
                                                                htmlFor={`file-${doc.type}`}
                                                                className="h-7 w-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer"
                                                                title="Subir archivo"
                                                            >
                                                                <Upload className="h-3.5 w-3.5" />
                                                            </label>

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
                                                                accept={doc.accept}
                                                            />

                                                            {hasFile && (
                                                                <>
                                                                    {/* Download button for all document types */}
                                                                    <button
                                                                        className="h-8 w-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
                                                                        title="Descargar archivo"
                                                                        onClick={() => initiateAction('download', doc.type)}
                                                                    >
                                                                        <Download className="h-4 w-4" />
                                                                    </button>
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
        </>
    );
}
