"use client";
import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Declaracion } from '../../models/declaracion';
import { formatCurrency } from "@/lib/utils";
import DeclaracionModal from './declaracion-modal';

interface DeclaracionMensualPFProps {
  declaraciones: Declaracion[];
  clientId: string;
  selectedYear: number;
  onEdit?: (declaracion: Declaracion) => void;
  isLoading?: boolean;
}

const DeclaracionMensualPF: React.FC<DeclaracionMensualPFProps> = ({ 
  declaraciones, 
  clientId,
  selectedYear,
  onEdit,
  isLoading = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return format(date, 'dd/MM/yyyy', { locale: es });
  };

  const getNombreMes = (mes: string) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const mesNum = parseInt(mes);
    return meses[mesNum - 1];
  };

  // Calculate totals for ISR and IVA
  const totals = declaraciones.reduce((acc, decl) => {
    return {
      isr: acc.isr + (decl.montoISR || 0),
      iva: acc.iva + (decl.montoIVA || 0)
    };
  }, { isr: 0, iva: 0 });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveDeclaracion = (declaracion: Declaracion) => {
    if (onEdit) {
      onEdit(declaracion);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 border-b">
        {/* Header styled like incomes-table */}
        <div className="bg-gray-100 px-7 py-2 border-b border-gray-300 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium whitespace-nowrap">
            Declaraciones Mensuales {selectedYear}
          </h2>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm py-0.5 whitespace-nowrap">
              Total ISR: {formatCurrency(totals.isr)}
            </Badge>
            <Badge variant="outline" className="text-sm py-0.5 whitespace-nowrap">
              Total IVA: {formatCurrency(totals.iva)}
            </Badge>
            
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleOpenModal}
                className="text-xs ml-2"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Agregar
              </Button>
            )}
          </div>
        </div>

        {/* Table with consistent styling */}
        <div className="relative">
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto">
            <table className="w-full text-xs relative">
              <thead className="sticky top-0 z-20">
                <tr className="after:absolute after:content-[''] after:h-[4px] after:left-0 after:right-0 after:bottom-0 after:shadow-[0_4px_8px_rgba(0,0,0,0.15)]">
                  <th className="pl-7 px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Mes</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center">Tipo</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center">Cliente Pagó Impuestos</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center">Cliente Pagó Servicio</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center">Fecha Presentación</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center">Fecha Límite Pago</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-right">Monto ISR</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-right">Monto IVA</th>
                  <th className="pr-7 px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="mt-1">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-2 py-4 text-center text-gray-500">Cargando declaraciones...</td>
                  </tr>
                ) : declaraciones.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-2 py-4 text-center text-gray-500">Este cliente no tiene declaraciones registradas para el año {selectedYear}</td>
                  </tr>
                ) : (
                  declaraciones.map((declaracion) => (
                    <tr 
                      key={declaracion.id || `${declaracion.mes}-${declaracion.anio}`} 
                      className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="pl-7 px-2 py-1 align-middle">
                        <span>{getNombreMes(declaracion.mes)} {declaracion.anio}</span>
                      </td>
                      <td className="px-2 py-1 align-middle text-center">
                        <span className="capitalize">{declaracion.tipoDeclaracion || 'ordinaria'}</span>
                      </td>
                      <td className="px-2 py-1 align-middle text-center">
                        <div className="flex justify-center">
                          <input 
                            type="checkbox" 
                            checked={declaracion.clientePagoImpuestos} 
                            disabled 
                            className="h-4 w-4"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1 align-middle text-center">
                        <div className="flex justify-center">
                          <input 
                            type="checkbox" 
                            checked={declaracion.clientePagoServicio} 
                            disabled 
                            className="h-4 w-4"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1 align-middle text-center">{formatDate(declaracion.fechaPresentacion)}</td>
                      <td className="px-2 py-1 align-middle text-center">{formatDate(declaracion.fechaLimitePago)}</td>
                      <td className="px-2 py-1 align-middle text-right font-medium">{formatCurrency(declaracion.montoISR)}</td>
                      <td className="px-2 py-1 align-middle text-right font-medium">{formatCurrency(declaracion.montoIVA)}</td>
                      <td className="pr-7 px-2 py-1 align-middle text-center">
                        <div className="flex space-x-1 justify-center">
                          {onEdit && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => onEdit(declaracion)}
                            >
                              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                                <path d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1465 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89155L2.04044 12.303C1.9599 12.491 2.00189 12.709 2.14646 12.8536C2.29103 12.9981 2.50905 13.0401 2.69697 12.9596L6.10847 11.4975C6.2254 11.4474 6.3317 11.3754 6.42166 11.2855L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM4.42166 9.28547L11.5 2.20711L12.7929 3.5L5.71455 10.5784L4.21924 11.2192L3.78081 10.7808L4.42166 9.28547Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                              </svg>
                            </Button>
                          )}
                          {declaracion.urlArchivoLineaCaptura && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => window.open(declaracion.urlArchivoLineaCaptura, '_blank')}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
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
      
      {/* Use the extracted modal component */}
      <DeclaracionModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveDeclaracion}
        year={selectedYear}
      />
    </div>
  );
};

export default DeclaracionMensualPF;
