'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { clientService } from '@/services/client-service';
import { Client } from '@/models/Client';
import { useAuth } from '@/contexts/AuthContext';
import {
    Loader2,
    Edit,
    Download,
    Trash2,
    Upload,
    X,
    CheckCircle2,
    Eye,
    EyeOff,
    RefreshCw
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';


interface FielProps {
    client: Client;
    onClientUpdated: (updatedClient: Client) => void;
}

type DocumentType = 'cer' | 'acuseCer' | 'keyCer' | 'renCer' | 'claveFiel' | 'cartaManifiesto' | 'contrato';
type ActionType = 'download' | 'delete' | 'upload';

interface DocumentInfo {
    label: string;
    type: DocumentType;
    url?: string;
    date?: string;
    isPrivate: boolean;
    accept: string;
    isPasswordField?: boolean;
}

const formatDate = (dateString: string) => {
    if (!dateString) return 'No disponible';
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
};

// Fixed password for all FIEL operations
const MASTER_PASSWORD = "Nenito";

export default function FielDocumentsSection({ client, onClientUpdated }: FielProps) {
    const { isAdmin, isSuperAdmin } = useAuth();
    const canManagePassword = isAdmin || isSuperAdmin;
    
    const [isUploading, setIsUploading] = useState<DocumentType | null>(null);
    const [localClient, setLocalClient] = useState<Client>(client);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: ActionType, docType: DocumentType } | null>(null);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    
    // Estado para el input de contraseña FIEL
    const [fielPasswordInput, setFielPasswordInput] = useState('');
    const [isSavingFielPassword, setIsSavingFielPassword] = useState(false);
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [visiblePassword, setVisiblePassword] = useState<string | null>(null);
    const [isLoadingPassword, setIsLoadingPassword] = useState(false);
    
    // Estado para autoSync
    const [autoSync, setAutoSync] = useState(localClient.autoSync ?? false);
    const [isSavingAutoSync, setIsSavingAutoSync] = useState(false);

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
            label: 'Contraseña de clave privada:', 
            type: 'claveFiel', 
            url: localClient.claveFielUrl, 
            date: localClient.claveFielDate, 
            isPrivate: true,
            accept: '', // No necesita archivo, se ingresa como texto
            isPasswordField: true // Marcador para renderizar diferente
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
        { 
            label: 'Contrato (PDF)', 
            type: 'contrato', 
            url: localClient.contratoUrl, 
            date: localClient.contratoDate, 
            isPrivate: false,
            accept: '.pdf'
        },
    ];

    useEffect(() => {
        setLocalClient(client);
        setAutoSync(client.autoSync ?? false);
    }, [client]);

    // Función para cambiar el estado de autoSync
    const handleAutoSyncChange = async (checked: boolean) => {
        setIsSavingAutoSync(true);
        try {
            const clientRef = doc(db, 'clients', client.id);
            await updateDoc(clientRef, { autoSync: checked });
            
            setAutoSync(checked);
            const updated = { ...localClient, autoSync: checked };
            setLocalClient(updated);
            onClientUpdated(updated);
            
            console.log(`✅ AutoSync ${checked ? 'activado' : 'desactivado'} para ${client.rfc}`);
        } catch (error) {
            console.error('Error actualizando autoSync:', error);
            // Revertir el estado en caso de error
            setAutoSync(!checked);
        } finally {
            setIsSavingAutoSync(false);
        }
    };

    // Función para ver la contraseña temporalmente (5 segundos)
    const handleViewPassword = async () => {
        setIsLoadingPassword(true);
        try {
            const password = await clientService.getFielPassword(client.id);
            
            if (password) {
                setVisiblePassword(password);
                
                // Ocultar después de 5 segundos
                setTimeout(() => {
                    setVisiblePassword(null);
                }, 5000);
            } else {
                setVisiblePassword('Sin datos');
                setTimeout(() => setVisiblePassword(null), 2000);
            }
        } catch (error) {
            console.error('Error al obtener contraseña:', error);
            setVisiblePassword('Error');
            setTimeout(() => setVisiblePassword(null), 2000);
        } finally {
            setIsLoadingPassword(false);
        }
    };

    // Función para guardar la contraseña de la FIEL
    const handleSaveFielPassword = async () => {
        if (!fielPasswordInput.trim()) return;
        
        setIsSavingFielPassword(true);
        try {
            const result = await clientService.saveFielPassword(client.id, fielPasswordInput.trim());
            
            const updated = { ...localClient };
            updated.claveFielUrl = result.url;
            updated.claveFielDate = result.date;
            setLocalClient(updated);
            onClientUpdated(updated);
            
            setFielPasswordInput('');
            console.log('✅ Contraseña FIEL guardada');
        } catch (error) {
            console.error('Error guardando contraseña FIEL:', error);
        } finally {
            setIsSavingFielPassword(false);
        }
    };

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
                } else if (type === 'contrato') {
                    updated.contratoUrl = result.url;
                    updated.contratoDate = result.date;
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
                } else if (type === 'contrato') {
                    mergedClient.contratoUrl = result.url;
                    mergedClient.contratoDate = result.date;
                }

                // Calcular si la FIEL está completa (cer, key y clave)
                mergedClient.tieneFielValida = !!(mergedClient.cerUrl && mergedClient.keyCerUrl && mergedClient.claveFielUrl);

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
                case 'contrato':
                    updateData.contratoUrl = null;
                    updateData.contratoDate = null;
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
            } else if (type === 'contrato') {
                updatedLocalClient.contratoUrl = undefined;
                updatedLocalClient.contratoDate = undefined;
            }
            
            // Recalcular si la FIEL está completa
            updatedLocalClient.tieneFielValida = !!(updatedLocalClient.cerUrl && updatedLocalClient.keyCerUrl && updatedLocalClient.claveFielUrl);
            
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
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-700">Documentos FIEL</h3>
                    
                    {/* AutoSync Toggle */}
                    <div className="flex items-center gap-2">
                        {isSavingAutoSync && (
                            <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                        )}
                        <label htmlFor="autoSync" className="text-xs text-gray-600 cursor-pointer flex items-center gap-1.5">
                            <RefreshCw className="h-3 w-3" />
                            Sync automático
                        </label>
                        <Switch
                            id="autoSync"
                            checked={autoSync}
                            onCheckedChange={handleAutoSyncChange}
                            disabled={isSavingAutoSync || !localClient.cerUrl || !localClient.keyCerUrl || !localClient.claveFielUrl}
                        />
                    </div>
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
                                    
                                    // Renderizado especial para el campo de contraseña
                                    if (doc.isPasswordField) {
                                        return (
                                            <tr key={doc.type} className="border-b hover:bg-gray-50">
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
                                                <td className="py-2 px-4 text-right">
                                                    <div className="flex justify-end gap-1 items-center">
                                                        {!canManagePassword ? (
                                                            hasFile ? <span className="text-xs text-gray-400">••••••</span> : null
                                                        ) : isSavingFielPassword ? (
                                                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                                        ) : isEditingPassword ? (
                                                            <>
                                                                <input
                                                                    type="password"
                                                                    placeholder="Contraseña"
                                                                    value={fielPasswordInput}
                                                                    onChange={(e) => setFielPasswordInput(e.target.value)}
                                                                    className="h-7 w-28 px-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            handleSaveFielPassword();
                                                                            setIsEditingPassword(false);
                                                                        } else if (e.key === 'Escape') {
                                                                            setIsEditingPassword(false);
                                                                            setFielPasswordInput('');
                                                                        }
                                                                    }}
                                                                />
                                                                <button
                                                                    onClick={() => {
                                                                        handleSaveFielPassword();
                                                                        setIsEditingPassword(false);
                                                                    }}
                                                                    disabled={!fielPasswordInput.trim()}
                                                                    className="h-7 w-7 rounded-full flex items-center justify-center text-green-600 hover:bg-green-50 disabled:text-gray-300"
                                                                    title="Guardar"
                                                                >
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setIsEditingPassword(false);
                                                                        setFielPasswordInput('');
                                                                    }}
                                                                    className="h-7 w-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
                                                                    title="Cancelar"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                {hasFile && (
                                                                    visiblePassword ? (
                                                                        <span className="text-xs text-green-600 font-mono mr-2 bg-green-50 px-2 py-1 rounded">{visiblePassword}</span>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-400 mr-2">••••••</span>
                                                                    )
                                                                )}
                                                                {hasFile && (
                                                                    <button
                                                                        onClick={visiblePassword ? () => setVisiblePassword(null) : handleViewPassword}
                                                                        disabled={isLoadingPassword}
                                                                        className="h-7 w-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                                                                        title={visiblePassword ? "Ocultar contraseña" : "Ver contraseña (5 seg)"}
                                                                    >
                                                                        {isLoadingPassword ? (
                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                        ) : visiblePassword ? (
                                                                            <EyeOff className="h-3.5 w-3.5" />
                                                                        ) : (
                                                                            <Eye className="h-3.5 w-3.5" />
                                                                        )}
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setIsEditingPassword(true)}
                                                                    className="h-7 w-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
                                                                    title={hasFile ? "Cambiar contraseña" : "Agregar contraseña"}
                                                                >
                                                                    <Edit className="h-3.5 w-3.5" />
                                                                </button>
                                                                {hasFile && (
                                                                    <button
                                                                        className="h-7 w-7 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50"
                                                                        title="Eliminar contraseña"
                                                                        onClick={() => initiateAction('delete', doc.type)}
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }

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
                                                    {!canManagePassword ? (
                                                        // Usuarios sin permisos no ven acciones
                                                        hasFile ? <span className="text-xs text-gray-400">✓</span> : null
                                                    ) : isUploading === doc.type ? (
                                                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                                    ) : hasFile ? (
                                                        // Si ya existe el archivo: solo descargar y borrar
                                                        <>
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
                                                    ) : (
                                                        // Si no existe: solo subir
                                                        <>
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
