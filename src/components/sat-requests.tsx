import React, { useState, useEffect } from 'react';
import { SatRequest } from '@/models/SatRequest';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Loader2, 
  RefreshCw, 
  FileArchive, 
  FileCheck,
  Calendar,
  Archive,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import SatRequestService from "@/services/sat-request-service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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

// Format date range for display with proper locale formatting
const formatDateRange = (fromDate: string, toDate: string): string => {
  return `${formatDateString(fromDate)} - ${formatDateString(toDate)}`;
};

const SatRequests: React.FC<SatRequestsProps> = ({ clientRfc }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [requests, setRequests] = useState<SatRequest[]>([]);
  const [downloadUrls, setDownloadUrls] = useState<{ [key: string]: string }>({});
  const [loadingUrls, setLoadingUrls] = useState<{ [key: string]: boolean }>({});
  
  // Date selection state
  const currentYear = new Date().getFullYear();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Format yesterday as YYYY-MM-DD
  const formatDateToYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [fromDate, setFromDate] = useState<string>(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState<string>(formatDateToYYYYMMDD(yesterday));
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  // Updated handler for date selection
  const handleSolicitarDescarga = async (downloadType: "issued" | "received") => {
    setIsLoading(true);
    try {
      // Format the date strings for the SAT API
      const from = `${fromDate} 00:00:00`;
      const to = `${toDate} 23:59:59`;
      
      // Now we pass both the downloadType and the date range to createRequest
      const newRequest = await SatRequestService.createRequest(
        clientRfc, 
        from, 
        to, 
        downloadType
      );
      
      toast({
        title: "Solicitud enviada",
        description: `Solicitud de descarga de facturas ${downloadType === "issued" ? "emitidas" : "recibidas"} desde ${format(new Date(fromDate), 'dd/MM/yyyy', { locale: es })} hasta ${format(new Date(toDate), 'dd/MM/yyyy', { locale: es })}.`,
      });
      
      // Refresh the list to show the new request
      fetchRequests();
    } catch (error: any) {
      console.error("Error creating SAT request:", error);
      toast({
        title: "Error",
        description: error.message || "Error al solicitar la descarga",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to validate date range
  const isValidDateRange = (): boolean => {
    if (!fromDate || !toDate) return false;
    
    const start = new Date(fromDate);
    const end = new Date(toDate);
    
    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    
    // Check start date is before end date
    if (start > end) return false;
    
    // Check that range is not more than 2 years
    const twoYearsInMs = 2 * 365 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > twoYearsInMs) return false;
    
    return true;
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
  const handleDownloadPackages = async (request: SatRequest) => {
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
          description: `Se descargaron ${downloadResult.savedPaths.length} paquetes correctamente.`,
        });
      } else {
        toast({
          title: "Error en la descarga",
          description: downloadResult.message || "No se pudieron descargar los paquetes",
          variant: "destructive",
        });
      }

      // Refresh the list to show updated status
      fetchRequests();
    } catch (error: any) {
      console.error("Error downloading packages:", error);
      toast({
        title: "Error",
        description: error.message || "Error al descargar los paquetes",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Improved process packages function with better error handling
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
    try {
      // Use packageIds directly from the request
      const packageIds = request.packageIds;
      console.log(`🔍 Procesando ${packageIds.length} paquetes:`, packageIds);
      
      // Process each package individually
      const processResults = [];
      let hasErrors = false;
      
      for (const packageId of packageIds) {
        console.log(`📦 Procesando paquete: ${packageId}`);
        try {
          const result = await SatRequestService.processPackage(clientRfc, packageId);
          processResults.push(result);
          
          if (result.success) {
            console.log(`✅ Paquete ${packageId} procesado exitosamente: ${result.savedPaths?.length || 0} XMLs`);
          } else {
            console.error(`❌ Error al procesar paquete ${packageId}:`, result.message);
            hasErrors = true;
          }
        } catch (packageError) {
          console.error(`❌ Excepción al procesar paquete ${packageId}:`, packageError);
          processResults.push({ 
            success: false, 
            savedPaths: [], 
            message: packageError instanceof Error ? packageError.message : "Error inesperado" 
          });
          hasErrors = true;
        }
      }

      // Count successfully processed packages
      const successCount = processResults.filter(r => r.success).length;
      const failCount = processResults.length - successCount;

      // Only mark as processed if all packages were successfully processed
      if (successCount === packageIds.length) {
        // All packages were successfully processed
        await SatRequestService.updateRequestStatus(
          clientRfc,
          request.id,
          { 
            packagesProcessed: true,
            processedAt: new Date().toISOString(),
            processedCount: successCount
          }
        );
        
        toast({
          title: "Procesamiento completado",
          description: `Se procesaron ${successCount} paquetes correctamente.`,
        });
      } else if (successCount > 0) {
        // Some packages were processed, but some failed
        await SatRequestService.updateRequestStatus(
          clientRfc,
          request.id,
          { 
            // Mark as partially processed
            packagesProcessed: false, 
            processedAt: new Date().toISOString(),
            processedCount: successCount,
            error: `Fallaron ${failCount} de ${packageIds.length} paquetes`
          }
        );
        
        toast({
          title: "Procesamiento parcial",
          description: `Se procesaron ${successCount} de ${packageIds.length} paquetes. ${failCount} fallaron.`,
          variant: "destructive"
        });
      } else {
        // All packages failed
        await SatRequestService.updateRequestStatus(
          clientRfc,
          request.id,
          { 
            packagesProcessed: false,
            error: "Error procesando todos los paquetes"
          }
        );
        
        toast({
          title: "Error de procesamiento",
          description: "No se pudo procesar ningún paquete. Revise los logs para más detalles.",
          variant: "destructive"
        });
      }

      // Refresh the list to show updated status
      fetchRequests();
    } catch (error: any) {
      console.error("Error processing packages:", error);
      
      // Make sure we mark the request as failed in case of unexpected errors
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
      
      // Refresh to show the error status
      fetchRequests();
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifyRequest = async (request: SatRequest) => {
    setVerifyingId(request.id);
    try {
      await SatRequestService.verifyRequest(clientRfc, request.requestId, request.id);
      toast({
        title: "Verificación realizada",
        description: "Se ha verificado el estado de la solicitud"
      });
      
      // Refresh the list to show updated status
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al verificar la solicitud",
        variant: "destructive",
      });
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
            {/* Replace the simple dropdown with one that includes date selection */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="black" 
                  size="xs" 
                  disabled={isLoading}
                  className="flex items-center whitespace-nowrap"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 mr-1" />
                      Solicitar Descarga
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[340px]">
                <DropdownMenuLabel>Rango de fechas</DropdownMenuLabel>
                <div className="px-2 py-2 grid gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="from-date" className="text-xs text-gray-500 block mb-1">Fecha inicial:</label>
                      <input
                        id="from-date"
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full text-xs px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label htmlFor="to-date" className="text-xs text-gray-500 block mb-1">Fecha final:</label>
                      <input
                        id="to-date"
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-full text-xs px-2 py-1 border rounded"
                      />
                    </div>
                  </div>
                  {!isValidDateRange() && (
                    <p className="text-red-500 text-xs">
                      La fecha inicial debe ser anterior a la final, y el rango no debe exceder 2 años.
                    </p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Tipo de facturas</DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => handleSolicitarDescarga("issued")}
                  disabled={isLoading || !isValidDateRange()}
                  className="cursor-pointer"
                >
                  Facturas Emitidas ({formatDateRange(fromDate, toDate)})
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleSolicitarDescarga("received")}
                  disabled={isLoading || !isValidDateRange()}
                  className="cursor-pointer"
                >
                  Facturas Recibidas ({formatDateRange(fromDate, toDate)})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                          {request.packageIds && request.packageIds.length > 0 && (
                            <span className="text-purple-500 text-[10px]">
                              {request.packageIds.length} paquete{request.packageIds.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {request.packagesDownloaded && renderPackageDownloadButtons(request)}
                        </div>
                      </td>
                      <td className="px-2 py-1 align-middle h-[56px]">
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] ${
                            request.packagesProcessed ? 'bg-blue-50 text-blue-700 border-blue-300' :
                            request.packagesDownloaded ? 'bg-indigo-50 text-indigo-700 border-indigo-300' :
                            (request.completed || request.status === "3" || 
                             request.status === "Finished" || request.status === "finished") ? 
                               'bg-green-50 text-green-700 border-green-300' : 
                            request.status === 'requested' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                            request.error ? 'bg-red-50 text-red-700 border-red-300' : 
                            'bg-yellow-50 text-yellow-700 border-yellow-300'
                          }`}
                        >
                          {request.packagesProcessed ? 'Procesado' :
                           request.packagesDownloaded ? 'Descargado' :
                           (request.completed || request.status === "3" || 
                            request.status === "Finished" || request.status === "finished") ? 
                              'Listo para descargar' : 
                           request.error ? 'Error' : 
                           request.status || 'Pendiente'}
                        </Badge>
                      </td>
                      <td className="pr-7 px-2 py-1 align-middle h-[56px]">
                        <div className="flex justify-center space-x-2">
                          {!request.completed && !request.packagesDownloaded && !request.error && (
                            <button 
                              className={`text-xs ${verifyingId === request.id ? 'text-gray-500' : 'text-indigo-600 hover:text-indigo-900 hover:underline'}`}
                              onClick={() => handleVerifyRequest(request)}
                              disabled={verifyingId === request.id}
                            >
                              {verifyingId === request.id ? (
                                <span className="flex items-center">
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Verificando...
                                </span>
                              ) : (
                                "Verificar"
                              )}
                            </button>
                          )}
                          {isReadyForDownload(request) && (
                            <button 
                              className={`text-xs ${downloadingId === request.id ? 'text-gray-500' : 'text-green-600 hover:text-green-900 hover:underline'}`}
                              onClick={() => handleDownloadPackages(request)}
                              disabled={downloadingId === request.id}
                            >
                              {downloadingId === request.id ? (
                                <span className="flex items-center">
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Descargando...
                                </span>
                              ) : (
                                <span className="flex items-center">
                                  <FileArchive className="h-3 w-3 mr-1" />
                                  Descargar ({request.packageIds?.length})
                                </span>
                              )}
                            </button>
                          )}
                          {(request.packagesDownloaded || request.packagesProcessed) && (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SatRequests;
