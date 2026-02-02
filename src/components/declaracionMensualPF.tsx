"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, FileText, Upload, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Declaracion } from '../models/declaracion';
import { formatCurrency } from "@/lib/utils";
import DeclaracionModal from './declaracion-modal';
import DeclaracionViewerModal from './declaracionViewer-modal';
import { useToast } from '@/components/ui/use-toast';
import { declaracionService } from '@/services/declaracion-service';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeclaracionMensualPFProps {
  declaraciones?: Declaracion[];
  clientId: string;
  selectedYear: number;
  onEdit?: (declaracion: Declaracion) => void;
  isLoading?: boolean;
}

type FileType = 'declaracion' | 'lineaCaptura';
type ModalType = 'edit' | 'view' | null;

// Helper functions
const formatDate = (date: Date | null) => {
  if (!date) return '-';
  return format(date, 'dd/MM/yyyy', { locale: es });
};

const getNombreMes = (mes: string) => {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return meses[parseInt(mes) - 1];
};

const DeclaracionMensualPF: React.FC<DeclaracionMensualPFProps> = ({ 
  clientId,
  selectedYear,
  onEdit,
  isLoading: externalLoading = false
}) => {
  // Consolidated state
  const [modal, setModal] = useState<{type: ModalType, declaracion: Declaracion | null}>({
    type: null,
    declaracion: null
  });
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [declaraciones, setDeclaraciones] = useState<Declaracion[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  
  // Dialog states - consolidated
  const [dialog, setDialog] = useState<{
    type: 'delete' | 'deleteFile' | null,
    declaracion: Declaracion | null,
    fileType?: FileType
  }>({
    type: null,
    declaracion: null
  });
  
  // File refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load declarations
  useEffect(() => {
    const fetchDeclaraciones = async () => {
      if (!clientId) return;
      
      try {
        setLoading(true);
        const data = await declaracionService.getDeclaraciones(clientId, selectedYear);
        setDeclaraciones(data);
      } catch (error) {
        console.error("Error fetching declarations:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las declaraciones",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDeclaraciones();
  }, [clientId, selectedYear, toast, refreshKey]);

  // Memoized calculations
  const totals = useMemo(() => declaraciones.reduce((acc, decl) => {
    const isr = decl.montoISR || 0;
    const iva = decl.montoIVA || 0;
    return {
      isr: acc.isr + isr,
      iva: acc.iva + iva,
      total: acc.total + isr + iva
    };
  }, { isr: 0, iva: 0, total: 0 }), [declaraciones]);

  // Action handlers
  const handleSaveDeclaracion = useCallback(async () => {
    try {
      setRefreshKey(prev => prev + 1);
      setModal({ type: null, declaracion: null });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la declaración",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleOpenModal = useCallback((type: ModalType, declaracion?: Declaracion) => {
    setModal({ type, declaracion: declaracion || null });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModal({ type: null, declaracion: null });
  }, []);

  // File operations
  const handleUploadFile = useCallback((declaracion: Declaracion, fileType: FileType) => {
    if (!fileInputRef.current) return;
    
    // Store context for file upload in the ref's dataset
    fileInputRef.current.dataset.declaracionId = declaracion.id || '';
    fileInputRef.current.dataset.fileType = fileType;
    fileInputRef.current.click();
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !fileInputRef.current?.dataset.declaracionId || !clientId) return;
    
    const declaracionId = fileInputRef.current.dataset.declaracionId;
    const fileType = fileInputRef.current.dataset.fileType as FileType;
    
    try {
      setUploadLoading(true);
      await declaracionService.uploadDeclaracionFile(clientId, declaracionId, file, fileType);
      toast({ title: "Archivo subido con éxito" });
      event.target.value = '';
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo subir el archivo",
        variant: "destructive",
      });
    } finally {
      setUploadLoading(false);
    }
  }, [clientId, toast]);

  // Delete operations - for declaración and files
  const confirmDelete = useCallback(async () => {
    if (!dialog.declaracion?.id || !clientId) return;
    
    try {
      if (dialog.type === 'delete') {
        await declaracionService.deleteDeclaracion(clientId, dialog.declaracion.id);
        toast({ title: "Declaración eliminada con éxito" });
      } else if (dialog.type === 'deleteFile' && dialog.fileType) {
        const fileName = dialog.fileType === 'declaracion' 
          ? dialog.declaracion.archivoDeclaracion
          : dialog.declaracion.archivoLineaCaptura;
          
        if (fileName) {
          await declaracionService.deleteDeclaracionFile(
            clientId, 
            dialog.declaracion.id, 
            fileName, 
            dialog.fileType
          );
          toast({ title: "Archivo eliminado con éxito" });
        }
      }
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar la operación",
        variant: "destructive",
      });
    } finally {
      setDialog({ type: null, declaracion: null });
    }
  }, [clientId, dialog, toast]);

  const isLoadingData = loading || externalLoading;

  // Render file badge component
  const FileItem = useCallback(({ declaracion, fileType }: { declaracion: Declaracion, fileType: FileType }) => {
    const fileUrl = fileType === 'declaracion' 
      ? declaracion.urlArchivoDeclaracion 
      : declaracion.urlArchivoLineaCaptura;
    
    const label = fileType === 'declaracion' ? 'Declaracion.pdf' : 'Linea Captura.pdf';
    const uploadLabel = fileType === 'declaracion' ? 'Subir declaración' : 'Subir línea de captura';
    
    return fileUrl ? (
      <div className="flex gap-1 items-center">
        <Badge 
          className="bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 cursor-pointer"
          onClick={() => window.open(fileUrl, '_blank')}
        >
          <FileText className="h-3 w-3 mr-1" />
          {label}
        </Badge>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-6 w-6 p-0 text-red-500 rounded-full hover:bg-red-50"
          onClick={() => setDialog({ 
            type: 'deleteFile', 
            declaracion, 
            fileType 
          })}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    ) : (
      <div className="flex items-center">
        <Button 
          variant="outline" 
          size="sm"
          className="h-6 text-[10px] border-dashed border-gray-300"
          onClick={() => handleUploadFile(declaracion, fileType)}
          disabled={uploadLoading}
        >
          <Upload className="h-3 w-3 mr-1" />
          {uploadLabel}
        </Button>
      </div>
    );
  }, [handleUploadFile, uploadLoading]);

  return (
    <div className="">
      {/* Hidden file input - single input with metadata */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,application/pdf"
        style={{ display: 'none' }}
      />
      
      <div className="bg-white dark:bg-gray-800 border rounded-md shadow-sm">
        {/* Header */}
        <div className="bg-gray-100 dark:bg-gray-800 px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-medium">
            Declaraciones Mensuales {selectedYear}
          </h2>
        
        </div>

        {/* Table */}
        <div className="relative">
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto">
            <table className="w-full text-xs relative">
              <thead className="sticky top-0 z-20">
                <tr className="after:absolute after:content-[''] after:h-[4px] after:left-0 after:right-0 after:bottom-0 after:shadow-sm">
                  <th className="pl-6 pr-2 py-2.5 font-medium bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-left">Período</th>
                  <th className="px-2 py-2.5 font-medium bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-center">Cliente pagó Imp.</th>
                  <th className="px-2 py-2.5 font-medium bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-right">Total</th>
                  <th className="px-2 py-2.5 font-medium bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-center">Linea Captura</th>
                  <th className="px-2 py-2.5 font-medium bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-center">Declaracion</th>
                  <th className="pr-6 pl-2 py-2.5 font-medium bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingData ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      Cargando declaraciones...
                    </td>
                  </tr>
                ) : declaraciones.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      No hay declaraciones registradas para {selectedYear}
                    </td>
                  </tr>
                ) : (
                  declaraciones.map((declaracion) => (
                    <tr 
                      key={declaracion.id || `${declaracion.mes}-${declaracion.anio}`} 
                      className={`border-t border-gray-100 dark:border-gray-800 ${declaracion.estatus === 'sustituida' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      {/* Período */}
                      <td className="pl-6 pr-2 py-2.5 align-middle">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${declaracion.estatus === 'sustituida' ? 'text-red-700' : ''}`}>{getNombreMes(declaracion.mes)} {declaracion.anio}</span>
                          </div>
                          <span className={`text-[10px] capitalize ${declaracion.estatus === 'sustituida' ? 'text-red-500' : 'text-gray-500'}`}>
                            {declaracion.tipoDeclaracion || 'ordinaria'} ({declaracion.estatus || 'vigente'})
                          </span>
                          <span className={`text-[10px] ${declaracion.estatus === 'sustituida' ? 'text-red-400' : 'text-gray-500'}`}>Presentada en {formatDate(declaracion.fechaPresentacion)}</span>
                        </div>
                      </td>

                        {/* Estado Pago Impuestos */}
                        <td className="px-2 py-2.5 align-middle text-center">
                          <Badge 
                          variant={declaracion.clientePagoImpuestos ? "secondary" : "default"}
                          className={`text-[10px] ${
                          declaracion.clientePagoImpuestos 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }`}
                          >
                          {declaracion.clientePagoImpuestos ? 'Pagado' : 'Pendiente'}
                          </Badge>
                        </td>

                       


                      {/* Importes */}
                      <td className="px-2 py-2.5 align-middle">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-end">
                            <span className="text-[10px] text-gray-500 mr-2">ISR:</span>
                            <span>{formatCurrency(declaracion.montoISR)}</span>
                          </div>
                          <div className="flex items-center justify-end">
                            <span className="text-[10px] text-gray-500 mr-2">IVA:</span>
                            <span>{formatCurrency(declaracion.montoIVA)}</span>
                          </div>
                          <div className="flex items-center justify-end border-gray-100 ">
                            <span className="text-[10px] text-gray-500 mr-2">Total:</span>
                            <span className="font-medium">
                              {formatCurrency((declaracion.montoISR || 0) + (declaracion.montoIVA || 0))}
                            </span>
                          </div>
                        </div>
                      </td>
                        {/* Línea de Captura */}
                        <td className="px-2 py-2.5 align-middle">
                          <div className="flex justify-center items-center">
                          <FileItem declaracion={declaracion} fileType="lineaCaptura" />
                          </div>
                        </td>

                        {/* Declaración */}
                        <td className="px-2 py-2.5 align-middle">
                          <div className="flex justify-center items-center">
                          <FileItem declaracion={declaracion} fileType="declaracion" />
                          </div>
                        </td>
                      
                      {/* Acciones */}
                      <td className="pr-6 pl-2 py-2.5 align-middle text-center">
                        <div className="flex gap-1 justify-center">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 px-3 text-[11px]"
                            onClick={() => handleOpenModal('view', declaracion)}
                          >
                            Ver
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-7 w-7 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => setDialog({ type: 'delete', declaracion })}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
      
      {/* Modals - consolidated */}
      {modal.type === 'edit' && (
        <DeclaracionModal
          open={true}
          onClose={handleCloseModal}
          onSave={handleSaveDeclaracion}
          year={selectedYear}
          clientId={clientId}
          declaracion={modal.declaracion}
        />
      )}

      {modal.type === 'view' && modal.declaracion && (
        <DeclaracionViewerModal
          open={true}
          onClose={handleCloseModal}
          declaracion={modal.declaracion}
        />
      )}

      {/* Dialogs - consolidated */}
      <AlertDialog 
        open={dialog.type === 'delete'} 
        onOpenChange={(open) => !open && setDialog({ type: null, declaracion: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar declaración?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la declaración
              {dialog.declaracion && ` de ${getNombreMes(dialog.declaracion.mes)} ${dialog.declaracion.anio}`}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog 
        open={dialog.type === 'deleteFile'} 
        onOpenChange={(open) => !open && setDialog({ type: null, declaracion: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el archivo
              {dialog.fileType && ` ${dialog.fileType === 'declaracion' ? 'de declaración' : 'de línea de captura'}`}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default React.memo(DeclaracionMensualPF);
