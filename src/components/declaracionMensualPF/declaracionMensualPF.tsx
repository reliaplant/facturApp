"use client";
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Declaracion } from '../../models/declaracion';
import { formatCurrency } from "@/lib/utils";

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="">Declaraciones Mensuales</h2>
        <div className="flex space-x-2">
          {/* Aquí puedes agregar botones de acción como en fixed-assets-table */}
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit({} as Declaracion)}>
              Agregar Declaración
            </Button>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="">
          <div className="w-full overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="">Mes</th>
                  <th className="">Cliente Pagó Impuestos</th>
                  <th className="">Cliente Pagó Servicio</th>
                  <th className="">Fecha Presentación</th>
                  <th className="">Fecha Límite Pago</th>
                  <th className="">Monto ISR</th>
                  <th className="">Monto IVA</th>
                  <th className="">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-gray-500">Cargando declaraciones...</td>
                  </tr>
                ) : declaraciones.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-gray-500">Este cliente no tiene declaraciones registradas</td>
                  </tr>
                ) : (
                  declaraciones.map((declaracion) => (
                    <tr key={declaracion.id || `${declaracion.mes}-${declaracion.anio}`} className="border-b">
                      <td className="p-4">{getNombreMes(declaracion.mes)} {declaracion.anio}</td>
                      <td className="p-4">
                        <input 
                          type="checkbox" 
                          checked={declaracion.clientePagoImpuestos} 
                          disabled 
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="p-4">
                        <input 
                          type="checkbox" 
                          checked={declaracion.clientePagoServicio} 
                          disabled 
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="p-4">{formatDate(declaracion.fechaPresentacion)}</td>
                      <td className="p-4">{formatDate(declaracion.fechaLimitePago)}</td>
                      <td className="p-4">{formatCurrency(declaracion.montoISR)}</td>
                      <td className="p-4">{formatCurrency(declaracion.montoIVA)}</td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          {onEdit && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => onEdit(declaracion)}
                            >
                              Editar
                            </Button>
                          )}
                          {declaracion.urlArchivoLineaCaptura && (
                            <Button 
                              variant="ghost" 
                              size="sm"
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
    </div>
  );
};

export default DeclaracionMensualPF;
