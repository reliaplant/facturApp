import React, { useState, useEffect } from 'react';
import { SatRequest } from '@/models/SatRequest';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import SatRequestService from "@/services/sat-request-service";
import SatSyncService from "@/services/sat-sync-service";
import { cfdiService } from "@/services/cfdi-service";
import { parseCFDIFromString } from "@/services/cfdi-parser";
import JSZip from "jszip";
import SatCalendarGrid from "@/components/sat-calendar-grid";

interface SatRequestsProps {
  clientRfc: string;
}

const SatRequests: React.FC<SatRequestsProps> = ({ clientRfc }) => {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [requests, setRequests] = useState<SatRequest[]>([]);
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Calendar grid state
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  
  // Auth context
  const { isSuperAdmin } = useAuth();
  
  // Load real data when component mounts or RFC changes
  useEffect(() => {
    fetchRequests();
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
      
      toast({
        title: "Verificación realizada",
        description: "Se ha verificado el estado de la solicitud"
      });
      
      // Refresh the list to show updated status
      fetchRequests();
    } catch (error: any) {
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

  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="p-3">
          <SatCalendarGrid
            requests={requests}
            year={calendarYear}
            onYearChange={setCalendarYear}
          />
        </div>
      </div>
    </div>
  );
};

export default SatRequests;
