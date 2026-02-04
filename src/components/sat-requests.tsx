import React, { useState, useEffect } from 'react';
import { SatRequest } from '@/models/SatRequest';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  RefreshCw, 
  FileArchive, 
  FileCheck,
  Archive,
  ExternalLink,
  Zap,
  AlertCircle,
  Trash2,
  Download,
  Play,
  HelpCircle,
  FileText
} from "lucide-react";
import { SatLogsModal } from "@/components/sat-logs-modal";
import { SatLogger } from "@/services/sat-log-service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import SatRequestService from "@/services/sat-request-service";
import SatSyncService from "@/services/sat-sync-service";
import { cfdiService } from "@/services/cfdi-service";
import { parseCFDIFromString } from "@/services/cfdi-parser";
import JSZip from "jszip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Utility function to format relative time
const formatRelativeTime = (date: Date | null): string => {
  if (!date) return "Fecha desconocida";
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return `hace ${diffSecs} seg`;
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 30) return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  
  // For older dates, show the formatted date
  return date.toLocaleDateString('es-MX', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric'
  });
};

interface SatRequestsProps {
  clientRfc: string;
}

// Helper function to format a date string for display with correct timezone handling
const formatDateString = (dateStr: string): string => {
  try {
    // Fix timezone issues by ensuring we use the exact date provided
    // First, split by hyphen to get year, month, day parts
    const [year, month, day] = dateStr.split('-').map(part => parseInt(part, 10));
    
    // Create a date with these exact parts at noon to avoid timezone issues
    // Use manual formatting to avoid timezone shifts in date-fns
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return format(date, 'dd MMM yyyy', { locale: es });
  } catch (e) {
    console.error("Error formatting date:", e, dateStr);
    return dateStr;
  }
};

const SatRequests: React.FC<SatRequestsProps> = ({ clientRfc }) => {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [requests, setRequests] = useState<SatRequest[]>([]);
  const [downloadUrls, setDownloadUrls] = useState<{ [key: string]: string }>({});
  const [loadingUrls, setLoadingUrls] = useState<{ [key: string]: boolean }>({});
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Auth context
  const { isSuperAdmin } = useAuth();
  const [syncStatus, setSyncStatus] = useState<{
    needsSync: boolean;
    isFirstSync?: boolean;
    hasPendingRequests?: boolean;
    pendingRequestsCount?: number;
    issued: { from: string; to: string; daysBehind: number; needsSync?: boolean; hasPendingRequest?: boolean };
    received: { from: string; to: string; daysBehind: number; needsSync?: boolean; hasPendingRequest?: boolean };
  } | null>(null);
  
  // Load real data when component mounts or RFC changes
  useEffect(() => {
    fetchRequests();
    fetchSyncStatus();
  }, [clientRfc]);

  const fetchRequests = async () => {
    setIsRefreshing(true);
    try {
      // Use the service to get correctly typed requests
      const satRequests = await SatRequestService.getRequests(clientRfc);
      setRequests(satRequests);
    } catch (error) {
      console.error("Error fetching SAT requests:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las solicitudes SAT",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch sync status to show what needs to be synced
  const fetchSyncStatus = async () => {
    try {
      const status = await SatSyncService.getSyncStatus(clientRfc);
      setSyncStatus(status);
    } catch (error) {
      console.error("Error fetching sync status:", error);
    }
  };

  // Smart sync - automatically syncs pending dates
  const handleSmartSync = async () => {
    // Si hay pendientes y no hay nada nuevo que sincronizar, mostrar modal explicativo
    if (syncStatus?.hasPendingRequests && !syncStatus?.needsSync) {
      setShowPendingModal(true);
      return;
    }
    
    // Si todo está al día, mostrar toast
    if (!syncStatus?.needsSync && !syncStatus?.hasPendingRequests) {
      toast({
        title: "Ya sincronizado",
        description: "Todo está al día. No hay fechas pendientes.",
      });
      return;
    }
    
    setIsSyncing(true);
    try {
      const result = await SatSyncService.syncClient(clientRfc);
      
      if (result.success) {
        if (result.requestsCreated > 0) {
          // Construir mensaje detallado
          const tiposSolicitados = [];
          if (result.details?.issued?.requestId) tiposSolicitados.push('emitidas');
          if (result.details?.received?.requestId) tiposSolicitados.push('recibidas');
          
          // Log successful request creation
          try {
            if (result.details?.issued?.requestId) {
              await SatLogger.requestCreated(clientRfc, clientRfc, result.details.issued.requestId, { type: 'issued' });
            }
            if (result.details?.received?.requestId) {
              await SatLogger.requestCreated(clientRfc, clientRfc, result.details.received.requestId, { type: 'received' });
            }
          } catch (logErr) {
            console.error("Error logging request creation:", logErr);
          }
          
          toast({
            title: "Sincronización iniciada",
            description: `Se solicitaron facturas ${tiposSolicitados.join(' y ')} al SAT`,
          });
        } else {
          toast({
            title: "Ya sincronizado",
            description: "No hay fechas pendientes de sincronizar. Todo está al día.",
          });
        }
        
        // Refresh requests and sync status
        fetchRequests();
        fetchSyncStatus();
      } else {
        // Log error
        try {
          await SatLogger.requestCreationError(clientRfc, clientRfc, result?.message || "Error desconocido");
        } catch (logErr) {
          console.error("Error logging request creation error:", logErr);
        }
        
        toast({
          title: "Error",
          description: result?.message || "Error desconocido",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      // Log error
      try {
        await SatLogger.requestCreationError(clientRfc, clientRfc, error?.message || "Error desconocido");
      } catch (logErr) {
        console.error("Error logging request creation error:", logErr);
      }
      
      toast({
        title: "Error",
        description: error.message || "Error al sincronizar",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle delete request (super admin only)
  const handleDeleteRequest = async (request: SatRequest) => {
    if (!isSuperAdmin) return;
    
    const confirmDelete = window.confirm(
      `¿Estás seguro de borrar esta solicitud?\n\nRequest ID: ${request.requestId}\nTipo: ${request.downloadType === 'issued' ? 'Emitidas' : 'Recibidas'}\n\nEsta acción no se puede deshacer.`
    );
    
    if (!confirmDelete) return;
    
    setDeletingId(request.id);
    try {
      await SatRequestService.deleteRequest(clientRfc, request.id);
      
      toast({
        title: "Solicitud eliminada",
        description: `Se eliminó la solicitud ${request.requestId.substring(0, 8)}...`,
      });
      
      // Refresh
      fetchRequests();
      fetchSyncStatus();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la solicitud",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Helper function to format a date string for display
  const formatDateString = (dateStr: string): string => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy', { locale: es });
    } catch (e) {
      return dateStr;
    }
  };

  // Modified download packages function - removes automatic processing
  const handleDownloadPackages = async (request: SatRequest, processAfter: boolean = true) => {
    if (!request.packageIds || request.packageIds.length === 0) {
      toast({
        title: "Error",
        description: "No hay paquetes para descargar",
        variant: "destructive",
      });
      return;
    }

    setDownloadingId(request.id);
    try {
      // Call the descargarPaquetes Cloud Function
      const downloadResult = await SatRequestService.downloadPackages(
        clientRfc, 
        request.packageIds
      );

      // Update the request status in Firebase
      if (downloadResult.success) {
        // Log success
        try {
          await SatLogger.downloadSuccess(clientRfc, clientRfc, request.requestId || "unknown", downloadResult.savedPaths?.length || 0);
        } catch (logErr) {
          console.error("Error logging download success:", logErr);
        }
        
        // Mark request as downloaded in Firestore
        await SatRequestService.updateRequestStatus(
          clientRfc,
          request.id,
          { 
            packagesDownloaded: true,
            downloadedAt: new Date().toISOString()
          }
        );

        toast({
          title: "Descarga exitosa",
          description: `Se descargaron ${downloadResult.savedPaths.length} paquetes. ${processAfter ? 'Procesando XMLs...' : ''}`,
        });
        
        // Refresh to show updated status
        fetchRequests();
        
        // Si processAfter es true, automáticamente procesar los XMLs
        if (processAfter) {
          // Pequeña pausa para que se actualice el estado
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Procesar los paquetes
          await handleProcessPackages({
            ...request,
            packagesDownloaded: true
          });
        }
      } else {
        // Log error
        try {
          await SatLogger.downloadError(clientRfc, clientRfc, request.requestId || "unknown", downloadResult?.message || "Error desconocido");
        } catch (logErr) {
          console.error("Error logging download error:", logErr);
        }
        
        // Guardar error en Firestore
        await SatRequestService.updateRequestStatus(
          clientRfc,
          request.id,
          { 
            downloadError: downloadResult.message || "Error al descargar paquetes",
            downloadAttemptedAt: new Date().toISOString()
          }
        );
        
        toast({
          title: "Error en la descarga",
          description: downloadResult.message || "No se pudieron descargar los paquetes",
          variant: "destructive",
        });
        
        fetchRequests();
      }

      // Refresh the list to show updated status
      fetchRequests();
    } catch (error: any) {
      console.error("Error downloading packages:", error);
      
      // Log error
      try {
        await SatLogger.downloadError(clientRfc, clientRfc, request.requestId || "unknown", error?.message || "Error inesperado");
      } catch (logErr) {
        console.error("Error logging download error:", logErr);
      }
      
      // Guardar error en Firestore
      try {
        await SatRequestService.updateRequestStatus(
          clientRfc,
          request.id,
          { 
            downloadError: error.message || "Error inesperado al descargar",
            downloadAttemptedAt: new Date().toISOString()
          }
        );
      } catch (e) {
        console.error("Error guardando estado de error:", e);
      }
      
      toast({
        title: "Error",
        description: error.message || "Error al descargar los paquetes",
        variant: "destructive",
      });
      
      fetchRequests();
    } finally {
      setDownloadingId(null);
    }
  };

  // Process packages locally - downloads ZIP, extracts XMLs, parses and saves to Firestore
  const handleProcessPackages = async (request: SatRequest) => {
    if (!request.packageIds || request.packageIds.length === 0) {
      toast({
        title: "Error",
        description: "No hay paquetes para procesar",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(request.id);
    
    let totalCfdisProcessed = 0;
    let totalCfdisSaved = 0;
    let totalCfdisExisting = 0;
    let totalErrors = 0;
    
    try {
      const packageIds = request.packageIds;
      console.log(`🔍 Procesando ${packageIds.length} paquetes localmente:`, packageIds);
      
      for (const packageId of packageIds) {
        console.log(`📦 Procesando paquete: ${packageId}`);
        
        try {
          // 1. Descargar el ZIP usando Cloud Function (evita CORS)
          console.log(`  ⬇️ Descargando ZIP via Cloud Function...`);
          let zipBlob;
          try {
            zipBlob = await SatRequestService.downloadPackageAsBase64(clientRfc, packageId);
            console.log(`  ✅ ZIP descargado: ${(zipBlob.size / 1024).toFixed(2)} KB`);
          } catch (downloadError: any) {
            console.error(`  ❌ Error descargando ZIP:`, downloadError);
            throw new Error(`Error descargando ZIP: ${downloadError.message}`);
          }
          
          // 2. Descomprimir con JSZip
          console.log(`  📂 Descomprimiendo ZIP...`);
          let zip;
          try {
            zip = await JSZip.loadAsync(zipBlob);
          } catch (zipError: any) {
            console.error(`  ❌ Error descomprimiendo ZIP:`, zipError);
            throw new Error(`Error descomprimiendo ZIP: ${zipError.message}`);
          }
          
          // 4. Procesar cada XML
          const cfdisToSave = [];
          const xmlFiles = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith('.xml'));
          console.log(`  📄 Encontrados ${xmlFiles.length} archivos XML`);
          
          for (const fileName of xmlFiles) {
            try {
              const xmlContent = await zip.files[fileName].async('string');
              const cfdi = parseCFDIFromString(xmlContent, clientRfc, clientRfc);
              
              if (cfdi) {
                cfdisToSave.push(cfdi);
                totalCfdisProcessed++;
              }
            } catch (xmlError) {
              console.error(`  ❌ Error parseando ${fileName}:`, xmlError);
              totalErrors++;
            }
          }
          
          // 5. Guardar en Firestore (con verificación de duplicados por UUID)
          if (cfdisToSave.length > 0) {
            console.log(`  💾 Guardando ${cfdisToSave.length} CFDIs en Firestore...`);
            try {
              const saveResult = await cfdiService.saveInvoices(clientRfc, cfdisToSave);
              
              totalCfdisSaved += saveResult.savedIds?.length || 0;
              totalCfdisExisting += saveResult.existingIds?.length || 0;
              
              console.log(`  ✅ Paquete ${packageId}: ${saveResult.savedIds?.length || 0} nuevos, ${saveResult.existingIds?.length || 0} existentes`);
            } catch (saveError: any) {
              console.error(`  ❌ Error guardando CFDIs:`, saveError);
              throw new Error(`Error guardando CFDIs: ${saveError.message}`);
            }
          } else {
            console.log(`  ⚠️ Paquete ${packageId}: No se encontraron CFDIs válidos`);
          }
          
        } catch (packageError: any) {
          console.error(`❌ Error procesando paquete ${packageId}:`, packageError);
          toast({
            title: `Error en paquete`,
            description: packageError.message || "Error desconocido",
            variant: "destructive"
          });
          totalErrors++;
        }
      }

      // Actualizar estado del request
      const allSuccess = totalErrors === 0;
      
      await SatRequestService.updateRequestStatus(
        clientRfc,
        request.id,
        { 
          packagesProcessed: allSuccess, // Solo true si no hubo errores
          processedWithErrors: !allSuccess, // Nuevo campo para errores parciales
          processedAt: new Date().toISOString(),
          processedCount: totalCfdisSaved,
          existingCount: totalCfdisExisting,
          totalErrors: totalErrors,
          ...(totalErrors > 0 && { error: `${totalErrors} errores durante el procesamiento` })
        }
      );
      
      // Log result
      try {
        if (allSuccess) {
          await SatLogger.processingSuccess(clientRfc, clientRfc, request.requestId || "unknown", totalCfdisSaved);
        } else if (totalCfdisSaved > 0) {
          await SatLogger.processingPartial(clientRfc, clientRfc, request.requestId || "unknown", totalCfdisSaved, totalErrors);
        } else {
          await SatLogger.processingError(clientRfc, clientRfc, request.requestId || "unknown", `${totalErrors} errores, 0 importados`);
        }
      } catch (logErr) {
        console.error("Error logging processing result:", logErr);
      }
      
      // Actualizar última fecha de sync
      if (request.to && request.downloadType) {
        try {
          const syncedDate = request.to.split(' ')[0];
          await SatSyncService.updateLastSyncDate(
            clientRfc,
            request.downloadType,
            syncedDate
          );
          console.log(`✅ Actualizada última fecha de sync: ${syncedDate} (${request.downloadType})`);
        } catch (syncError) {
          console.error("Error actualizando última fecha de sync:", syncError);
        }
      }
      
      fetchSyncStatus();
      
      // Mostrar resultado
      if (allSuccess) {
        toast({
          title: "Importación completada",
          description: `${totalCfdisSaved} CFDIs importados, ${totalCfdisExisting} ya existían`,
        });
      } else {
        toast({
          title: "Importación con errores",
          description: `${totalCfdisSaved} importados, ${totalCfdisExisting} existentes, ${totalErrors} errores`,
          variant: "destructive"
        });
      }

      fetchRequests();
    } catch (error: any) {
      console.error("Error processing packages:", error);
      
      // Log error
      try {
        await SatLogger.processingError(clientRfc, clientRfc, request.requestId || "unknown", error?.message || "Error inesperado");
      } catch (logErr) {
        console.error("Error logging processing error:", logErr);
      }
      
      await SatRequestService.updateRequestStatus(
        clientRfc,
        request.id,
        {
          packagesProcessed: false,
          error: error.message || "Error inesperado al procesar los paquetes"
        }
      );
      
      toast({
        title: "Error",
        description: error.message || "Error al procesar los paquetes",
        variant: "destructive",
      });
      
      fetchRequests();
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifyRequest = async (request: SatRequest) => {
    setVerifyingId(request.id);
    try {
      const result = await SatRequestService.verifyRequest(clientRfc, request.requestId, request.id);
      
      // Log success - only if we have packages or the request completed
      const packagesCount = result?.packageIds?.length || 0;
      if (packagesCount > 0 || result?.completed) {
        try {
          await SatLogger.verificationSuccess(clientRfc, clientRfc, request.requestId, packagesCount);
        } catch (logErr) {
          console.error("Error logging verification success:", logErr);
        }
      }
      
      toast({
        title: "Verificación realizada",
        description: "Se ha verificado el estado de la solicitud"
      });
      
      // Refresh the list to show updated status
      fetchRequests();
    } catch (error: any) {
      // Log error
      try {
        await SatLogger.verificationError(clientRfc, clientRfc, request.requestId || "unknown", error?.message || "Error desconocido");
      } catch (logErr) {
        console.error("Error logging verification error:", logErr);
      }
      
      // Guardar error en Firestore
      try {
        await SatRequestService.updateRequestStatus(
          clientRfc,
          request.id,
          { 
            verifyError: error.message || "Error al verificar",
            verifyAttemptedAt: new Date().toISOString()
          }
        );
      } catch (e) {
        console.error("Error guardando estado de error:", e);
      }
      
      toast({
        title: "Error",
        description: error.message || "Error al verificar la solicitud",
        variant: "destructive",
      });
      
      fetchRequests();
    } finally {
      setVerifyingId(null);
    }
  };

  // Simpler helper function that primarily checks for packageIds
  const isReadyForDownload = (request: SatRequest): boolean => {
    console.log("Request checking for download:", request.id, "packageIds:", request.packageIds, 
      "already downloaded:", request.packagesDownloaded);
    
    // Simplified logic: show download button if there are packageIds and it hasn't been downloaded yet
    return (
      request.packageIds !== undefined && 
      request.packageIds.length > 0 && 
      !request.packagesDownloaded
    );
  };

  // Debug logged requests on component mount
  useEffect(() => {
    if (requests.length > 0) {
      console.log("Current requests:", requests);
      requests.forEach(req => {
        if (req.packageIds && req.packageIds.length > 0) {
          console.log(`Request ${req.id} has packageIds:`, req.packageIds);
        }
      });
    }
  }, [requests]);

  // Function to get download URL for a specific package
  const handleGetDownloadUrl = async (packageId: string) => {
    try {
      // Mark this package as loading
      setLoadingUrls(prev => ({ ...prev, [packageId]: true }));
      
      // Get the download URL
      const url = await SatRequestService.getPackageDownloadUrl(clientRfc, packageId);
      
      // Store it in state
      setDownloadUrls(prev => ({ ...prev, [packageId]: url }));
      
      // Optional: Open the URL in a new tab
      window.open(url, '_blank');
    } catch (error) {
      console.error(`Error getting download URL for package ${packageId}:`, error);
      toast({
        title: "Error",
        description: "No se pudo obtener el enlace de descarga",
        variant: "destructive",
      });
    } finally {
      // Clear loading state
      setLoadingUrls(prev => ({ ...prev, [packageId]: false }));
    }
  };
  
  // Modified function to show package details and download options
  const renderPackageDownloadButtons = (request: SatRequest) => {
    // If no packages or not downloaded yet, return empty
    if (!request.packageIds || !request.packagesDownloaded) {
      return null;
    }
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {request.packageIds.map(packageId => (
          <button
            key={packageId}
            onClick={() => handleGetDownloadUrl(packageId)}
            disabled={loadingUrls[packageId]}
            className="inline-flex items-center text-xs text-gray-700 hover:text-blue-600 hover:underline"
            title={`Descargar paquete ${packageId}`}
          >
            {loadingUrls[packageId] ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Archive className="h-3 w-3 mr-1" />
            )}
            Paquete {packageId.substring(0, 8)}...
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="bg-gray-100 px-7 py-2 border-b border-gray-300 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium whitespace-nowrap">
            Solicitudes SAT
          </h2>
          
          <div className="flex items-center gap-2">
            {/* Smart Sync Button - Solo SuperAdmin */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="xs" 
                    disabled={isSyncing || !isSuperAdmin}
                    onClick={handleSmartSync}
                    className={`flex items-center whitespace-nowrap ${
                      !isSuperAdmin
                        ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                        : syncStatus?.needsSync 
                          ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100' 
                          : syncStatus?.hasPendingRequests
                            ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                            : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <Zap className="h-3 w-3 mr-1" />
                        Sincronizar
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  {!isSuperAdmin ? (
                    <p className="text-xs text-gray-500">Solo disponible para Super Administradores</p>
                  ) : syncStatus?.isFirstSync ? (
                    <div className="text-xs space-y-1">
                      <p className="font-medium">Primera sincronización</p>
                      <p className="text-gray-400">Se descargará desde el 1 de enero de {new Date().getFullYear()}</p>
                      <p className="text-gray-400 mt-1">Click para sincronizar</p>
                    </div>
                  ) : syncStatus?.needsSync ? (
                    <div className="text-xs space-y-1">
                      <p className="font-medium">Hay fechas pendientes:</p>
                      {syncStatus.issued.needsSync && (
                        <p>• Emitidas: {syncStatus.issued.daysBehind} días atrás</p>
                      )}
                      {syncStatus.received.needsSync && (
                        <p>• Recibidas: {syncStatus.received.daysBehind} días atrás</p>
                      )}
                      {syncStatus.issued.hasPendingRequest && (
                        <p className="text-blue-500">• Emitidas: solicitud en proceso</p>
                      )}
                      {syncStatus.received.hasPendingRequest && (
                        <p className="text-blue-500">• Recibidas: solicitud en proceso</p>
                      )}
                      <p className="text-gray-400 mt-1">Click para sincronizar lo que falta</p>
                    </div>
                  ) : syncStatus?.hasPendingRequests ? (
                    <div className="text-xs space-y-1">
                      <p className="font-medium">Solicitudes pendientes de procesar:</p>
                      {syncStatus.issued.hasPendingRequest && (
                        <p>• Emitidas: pendiente verificar/descargar/procesar</p>
                      )}
                      {syncStatus.received.hasPendingRequest && (
                        <p>• Recibidas: pendiente verificar/descargar/procesar</p>
                      )}
                      <p className="text-gray-400 mt-1">Procesa las solicitudes de la tabla</p>
                    </div>
                  ) : (
                    <p className="text-xs">Las facturas están sincronizadas hasta ayer</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Logs Button */}
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setShowLogsModal(true)}
              className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              title="Ver logs"
            >
              <FileText className="h-4 w-4" />
            </Button>

            {/* Info Button */}
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setShowInfoModal(true)}
              className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              title="¿Cómo funciona?"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto">
            <table className="w-full text-xs relative">
              <thead className="sticky top-0 z-20">
                <tr className="after:absolute after:content-[''] after:h-[4px] after:left-0 after:right-0 after:bottom-0 after:shadow-[0_4px_8px_rgba(0,0,0,0.15)]">
                  <th className="pl-7 px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Fecha</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Última Act.</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Rango</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Request ID</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Tipo</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Estado</th>
                  <th className="pr-7 px-2 py-1.5 font-medium text-center bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Acción</th>
                  {isSuperAdmin && (
                    <th className="px-2 py-1.5 font-medium text-center bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600"></th>
                  )}
                </tr>
              </thead>
              <tbody className="mt-1">
                {isRefreshing ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-center text-gray-500 text-xs">
                      Cargando solicitudes...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-center text-gray-500 text-xs">
                      No hay solicitudes para mostrar
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr 
                      key={request.id} 
                      className="border-t border-gray-200 dark:border-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    >
                      <td className="pl-7 px-2 py-1 align-middle h-[56px]">
                        <div className="flex flex-col">
                          <span className="text-xs" title={request.createdAt?.toDate?.() 
                            ? request.createdAt.toDate().toLocaleString() 
                            : "Fecha pendiente"}>
                            {request.createdAt?.toDate?.() 
                              ? formatRelativeTime(request.createdAt.toDate())
                              : "Fecha pendiente"}
                          </span>
                          <span className="text-purple-500 text-[10px]">
                            {request.createdAt?.toDate?.() 
                              ? request.createdAt.toDate().toLocaleString() 
                              : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1 align-middle h-[56px]">
                        <div className="flex flex-col">
                          <span className="text-xs" title={request.updatedAt?.toDate?.() 
                            ? request.updatedAt.toDate().toLocaleString() 
                            : "Sin actualizar"}>
                            {request.updatedAt?.toDate?.() 
                              ? formatRelativeTime(request.updatedAt.toDate())
                              : "Sin actualizar"}
                          </span>
                          <span className="text-purple-500 text-[10px]">
                            {request.updatedAt?.toDate?.() 
                              ? request.updatedAt.toDate().toLocaleString() 
                              : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1 align-middle h-[56px]">
                        {request.from && request.to ? (
                          <div className="flex flex-col">
                            <span className="text-xs">
                              {request.from.includes(' ') 
                                ? formatDateString(request.from.split(' ')[0]) 
                                : formatDateString(request.from)}
                            </span>
                            <span className="text-purple-500 text-[10px]">
                              {request.to.includes(' ') 
                                ? formatDateString(request.to.split(' ')[0]) 
                                : formatDateString(request.to)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No disponible</span>
                        )}
                      </td>
                      <td className="px-2 py-1 align-middle h-[56px]">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs truncate max-w-[120px]" title={request.requestId}>
                            {request.requestId ? request.requestId.substring(0, 12) + '...' : "N/A"}
                          </span>
                          <span className="text-purple-500 text-[10px]">
                            {request.id?.substring(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1 align-middle h-[56px]">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{request.downloadType === "issued" ? "Emitida" : "Recibida"}</span>
                          {request.packageIds && request.packageIds.length > 0 ? (
                            <span className="text-purple-500 text-[10px]">
                              {request.packageIds.length} paquete{request.packageIds.length > 1 ? 's' : ''}
                            </span>
                          ) : request.completed && request.packageIds?.length === 0 ? (
                            <span className="text-gray-400 text-[10px]">
                              Sin facturas
                            </span>
                          ) : null}
                          {request.packagesDownloaded && renderPackageDownloadButtons(request)}
                        </div>
                      </td>
                      <td className="px-2 py-1 align-middle h-[56px]">
                        {/* Estado mejorado con tooltip para errores */}
                        {(() => {
                          // Verificar si hay algún error para mostrar tooltip
                          const hasAnyError = request.error || request.verifyError || request.downloadError || request.processedWithErrors;
                          
                          const statusContent = request.packagesProcessed && !request.error ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
                                <span className="text-xs text-blue-700 font-medium">Procesado</span>
                              </div>
                              {(request.processedCount !== undefined || request.existingCount !== undefined) && (
                                <span className="text-[10px] text-gray-500 ml-3.5">
                                  {request.processedCount || 0} nuevos, {request.existingCount || 0} existentes
                                </span>
                              )}
                            </div>
                          ) : (request.processedWithErrors || (request.packagesProcessed && request.error)) ? (
                            <div className="flex flex-col cursor-help">
                              <div className="flex items-center gap-1.5">
                                <span className="flex h-2 w-2 rounded-full bg-orange-500"></span>
                                <span className="text-xs text-orange-700 font-medium">Procesado con errores</span>
                              </div>
                              <span className="text-[10px] text-orange-600 ml-3.5">
                                {request.totalErrors || '?'} error(es) - ver detalles
                              </span>
                            </div>
                          ) : request.downloadError ? (
                            <div className="flex flex-col cursor-help">
                              <div className="flex items-center gap-1.5">
                                <span className="flex h-2 w-2 rounded-full bg-red-500"></span>
                                <span className="text-xs text-red-700 font-medium">Error descarga</span>
                              </div>
                              <span className="text-[10px] text-red-500 ml-3.5">
                                ver detalles
                              </span>
                            </div>
                          ) : request.packagesDownloaded ? (
                            <div className="flex items-center gap-1.5">
                              <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
                              <span className="text-xs text-indigo-700 font-medium">Descargado</span>
                            </div>
                          ) : request.completed && request.packageIds?.length === 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span className="flex h-2 w-2 rounded-full bg-gray-400"></span>
                              <span className="text-xs text-gray-500 font-medium">Sin facturas</span>
                            </div>
                          ) : (request.completed || request.status === "3" || 
                               request.status === "Finished" || request.status === "finished") ? (
                            <div className="flex items-center gap-1.5">
                              <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                              <span className="text-xs text-green-700 font-medium">Listo</span>
                            </div>
                          ) : request.error || request.verifyError ? (
                            <div className="flex flex-col cursor-help">
                              <div className="flex items-center gap-1.5">
                                <span className="flex h-2 w-2 rounded-full bg-red-500"></span>
                                <span className="text-xs text-red-700 font-medium">Error</span>
                              </div>
                              <span className="text-[10px] text-red-500 ml-3.5">
                                ver detalles
                              </span>
                            </div>
                          ) : request.status === 'in_progress' || request.status === '1' ? (
                            <div className="flex items-center gap-1.5">
                              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                              <span className="text-xs text-amber-700 font-medium">En proceso</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="flex h-2 w-2 rounded-full bg-gray-400 animate-pulse"></span>
                              <span className="text-xs text-gray-600 font-medium">Solicitado</span>
                            </div>
                          );
                          
                          // Si hay errores, envolver en tooltip
                          if (hasAnyError) {
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>{statusContent}</div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-sm">
                                    <div className="text-xs space-y-1">
                                      <p className="font-semibold text-red-600">Detalles de errores:</p>
                                      {request.verifyError && (
                                        <p><span className="font-medium">Verificación:</span> {request.verifyError}</p>
                                      )}
                                      {request.downloadError && (
                                        <p><span className="font-medium">Descarga:</span> {request.downloadError}</p>
                                      )}
                                      {request.error && (
                                        <p><span className="font-medium">Procesamiento:</span> {request.error}</p>
                                      )}
                                      {request.totalErrors && (
                                        <p><span className="font-medium">Total errores:</span> {request.totalErrors}</p>
                                      )}
                                      {request.processedCount !== undefined && (
                                        <p className="text-green-600"><span className="font-medium">Importados OK:</span> {request.processedCount}</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          }
                          
                          return statusContent;
                        })()}
                      </td>
                      <td className="pr-7 px-2 py-1 align-middle h-[56px]">
                        <div className="flex justify-center space-x-2">
                          {!request.completed && !request.packagesDownloaded && !request.error && (
                            <Button 
                              variant="outline"
                              size="xs"
                              className="text-xs h-7 px-2 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                              onClick={() => handleVerifyRequest(request)}
                              disabled={verifyingId === request.id}
                            >
                              {verifyingId === request.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Verificando...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Verificar
                                </>
                              )}
                            </Button>
                          )}
                          {isReadyForDownload(request) && (
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="outline"
                                size="xs"
                                className="text-xs h-7 px-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                onClick={() => handleDownloadPackages(request, true)}
                                disabled={downloadingId === request.id || processingId === request.id}
                              >
                                {(downloadingId === request.id || processingId === request.id) ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    {downloadingId === request.id ? 'Descargando...' : 'Procesando...'}
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3 mr-1" />
                                    Importar
                                  </>
                                )}
                              </Button>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost"
                                      size="xs"
                                      className="text-xs h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                                      onClick={() => handleDownloadPackages(request, false)}
                                      disabled={downloadingId === request.id}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p className="text-xs">Solo descargar ZIP (sin procesar)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                          {/* Botón de reprocesar cuando hay errores */}
                          {/* Botón de reprocesar - visible si hay errores O si ya está procesado (para re-importar) */}
                          {(request.processedWithErrors || request.downloadError || request.packagesProcessed) && request.packageIds && request.packageIds.length > 0 && (
                            <Button 
                              variant="outline"
                              size="xs"
                              className={`text-xs h-7 px-2 ${
                                request.processedWithErrors || request.downloadError
                                  ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                              }`}
                              onClick={() => handleProcessPackages(request)}
                              disabled={processingId === request.id}
                            >
                              {processingId === request.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Reprocesando...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Reprocesar
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-2 py-1 align-middle h-[56px] text-center">
                          <button
                            onClick={() => handleDeleteRequest(request)}
                            disabled={deletingId === request.id}
                            className="text-red-400 hover:text-red-600 disabled:opacity-50"
                            title="Borrar solicitud"
                          >
                            {deletingId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de solicitudes pendientes */}
      <Dialog open={showPendingModal} onOpenChange={setShowPendingModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              Solicitudes en proceso
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p>
                  No se pueden crear nuevas solicitudes porque hay {syncStatus?.pendingRequestsCount} solicitud(es) pendiente(s) de procesar:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {syncStatus?.issued.hasPendingRequest && (
                    <li><strong>Emitidas:</strong> Pendiente de verificar, descargar o procesar</li>
                  )}
                  {syncStatus?.received.hasPendingRequest && (
                    <li><strong>Recibidas:</strong> Pendiente de verificar, descargar o procesar</li>
                  )}
                </ul>
                <p className="text-sm text-gray-500">
                  Haz clic en "Verificar" en las solicitudes de la tabla para continuar el proceso.
                  Una vez procesadas, podrás sincronizar nuevas fechas.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowPendingModal(false)}>
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de información - Cómo funciona */}
      <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="h-5 w-5 text-blue-500" />
              ¿Cómo funciona la Descarga Masiva del SAT?
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 text-sm">
            {/* Introducción */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">
                La <strong>Descarga Masiva</strong> es un servicio del SAT que permite obtener todos tus CFDIs 
                (facturas emitidas y recibidas) de forma automática usando tu FIEL.
              </p>
            </div>

            {/* Proceso */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">📋 Proceso paso a paso</h3>
              <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                <li><strong>Solicitar:</strong> Se envía una petición al SAT indicando el rango de fechas y tipo (emitidas/recibidas)</li>
                <li><strong>Verificar:</strong> El SAT procesa la solicitud (puede tardar de segundos a minutos)</li>
                <li><strong>Descargar:</strong> Cuando está lista, se descargan los paquetes ZIP con los XMLs</li>
                <li><strong>Procesar:</strong> Se extraen los XMLs y se guardan en tu sistema</li>
              </ol>
            </div>

            {/* Estados */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">🚦 Estados de una solicitud</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-gray-400"></span>
                  <span><strong>Solicitado:</strong> Esperando que el SAT la procese</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                  <span><strong>En proceso:</strong> El SAT la está procesando</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
                  <span><strong>Listo:</strong> Paquetes listos para descargar</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500"></span>
                  <span><strong>Descargado:</strong> ZIPs descargados, pendiente procesar XMLs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                  <span><strong>Procesado:</strong> ✅ Facturas importadas correctamente</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-gray-400"></span>
                  <span><strong>Sin facturas:</strong> El rango no tiene CFDIs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
                  <span><strong>Error:</strong> Algo falló, intenta de nuevo</span>
                </div>
              </div>
            </div>

            {/* Reglas importantes */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">⚠️ Reglas importantes del SAT</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li><strong>Máximo 2 solicitudes simultáneas</strong> por tipo (emitidas/recibidas). Si excedes este límite, el SAT te bloquea temporalmente.</li>
                <li><strong>Bloqueo temporal:</strong> Si te bloquean, debes esperar <strong>24-72 horas</strong> para poder hacer nuevas solicitudes.</li>
                <li><strong>Tiempo de procesamiento:</strong> El SAT puede tardar desde segundos hasta varios minutos en preparar los paquetes.</li>
                <li><strong>Verifica antes de crear nuevas:</strong> Siempre procesa las solicitudes pendientes antes de crear nuevas.</li>
              </ul>
            </div>

            {/* Botón Sincronizar */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">⚡ Botón Sincronizar</h3>
              <p className="text-gray-600 mb-2">
                El botón de sincronizar detecta automáticamente qué fechas faltan y crea las solicitudes necesarias:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li><span className="text-amber-600 font-medium">Amarillo:</span> Hay fechas pendientes de sincronizar</li>
                <li><span className="text-blue-600 font-medium">Azul:</span> Hay solicitudes en proceso</li>
                <li><span className="text-green-600 font-medium">Verde:</span> Todo está al día</li>
              </ul>
            </div>

            {/* Tips */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">💡 Tips</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Si una solicitud está mucho tiempo en "En proceso", espera 1-2 minutos y dale "Verificar"</li>
                <li>Si ves "Solicitado" después de verificar, el SAT aún no la procesa. Intenta más tarde.</li>
                <li>Puedes descargar los paquetes ZIP originales haciendo clic en los enlaces después de descargar</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowInfoModal(false)}>
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logs Modal */}
      <SatLogsModal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        clientId={clientRfc}
        clientName={clientRfc}
      />
    </div>
  );
};

export default SatRequests;
