"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Invoice } from "@/models/Invoice";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from 'xlsx';

interface ExportInvoicesExcelProps {
  invoices?: Invoice[];
  emittedInvoices?: Invoice[];
  receivedInvoices?: Invoice[];
  year: number;
  buttonLabel?: string;
  fileName?: string;
}

export function ExportInvoicesExcel({ 
  invoices,
  emittedInvoices, 
  receivedInvoices,
  year, 
  buttonLabel = "Exportar", 
  fileName = `Facturas_${year}.xlsx` 
}: ExportInvoicesExcelProps) {
  
  // Memoize month name function to prevent recreation on renders
  const getMonthName = useMemo(() => (month: number): string => {
    if (month === 13) return 'Anual';
    return format(new Date(year, month - 1, 1), 'MMMM', { locale: es });
  }, [year]);
  
  // Extract invoice processing logic to separate functions for cleaner code
  const processInvoices = useMemo(() => {
    const sortInvoices = (invoicesToSort: Invoice[]) => 
      [...invoicesToSort].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      
    const createEmittedData = (items: Invoice[]) => sortInvoices(items).map(invoice => ({
      "Fecha": format(new Date(invoice.fecha), 'dd/MM/yyyy'),
      "Tipo Comprobante": invoice.tipoDeComprobante || "",
      "RFC Receptor": invoice.rfcReceptor,
      "Nombre Receptor": invoice.nombreReceptor,
      "CP Receptor": invoice.domicilioFiscalReceptor || "",
      "Régimen Fiscal Receptor": invoice.regimenFiscalReceptor || "",
      "Uso CFDI": invoice.usoCFDI,
      "RFC Emisor": invoice.rfcEmisor,
      "Nombre Emisor": invoice.nombreEmisor,
      "Lugar Expedición": invoice.lugarExpedicion || "",
      "Régimen Fiscal": invoice.regimenFiscal || "",
      "Concepto": invoice.concepto || "",
      "Categoría": invoice.categoria || "",
      "Serie": invoice.serie || "",
      "Folio": invoice.folio || "",
      "UUID": invoice.uuid,
      "Método de Pago": invoice.metodoPago,
      "Forma de Pago": invoice.formaPago,
      "Moneda": invoice.moneda || "MXN",
      "Tipo de Cambio": invoice.tipoCambio || "1.00",
      "Subtotal": invoice.subTotal,
      "Impuestos Trasladados": invoice.impuestosTrasladados || 0,
      "IVA Trasladado": invoice.impuestoTrasladado || 0,
      "IEPS Trasladado": invoice.iepsTrasladado || 0,
      "Impuesto Retenido": invoice.impuestoRetenido || 0,
      "IVA Retenido": invoice.ivaRetenido || 0,
      "ISR Retenido": invoice.isrRetenido || 0,
      "Descuento": invoice.descuento || 0,
      "Total": invoice.total,
      "Cancelado": invoice.estaCancelado ? "Sí" : "No",
      "Cobrado": invoice.esDeducible ? "Sí" : "No",
      "Mes Cobro": invoice.mesDeduccion ? getMonthName(invoice.mesDeduccion) : "",
      "Deducción Anual": invoice.anual ? "Sí" : "No",
      "Gravado ISR": invoice.gravadoISR || 0,
      "Gravado IVA": invoice.gravadoIVA || 0,
      "Tasa 0%": invoice.Tasa0 || 0,
      "Tiene Complemento Pago": invoice.docsRelacionadoComplementoPago?.length > 0 ? "Sí" : "No",
      "UUIDs Complementos Pago": invoice.docsRelacionadoComplementoPago?.join(", ") || "",
      "Bloqueado": invoice.locked ? "Sí" : "No"
    }));
    
    const createReceivedData = (items: Invoice[]) => sortInvoices(items).map(invoice => ({
      "Fecha": format(new Date(invoice.fecha), 'dd/MM/yyyy'),
      "RFC Emisor": invoice.rfcEmisor,
      "Nombre Emisor": invoice.nombreEmisor,
      "RFC Receptor": invoice.rfcReceptor, 
      "Nombre Receptor": invoice.nombreReceptor,
      "UUID": invoice.uuid,
      "Tipo Comprobante": invoice.tipoDeComprobante || "",
      "Uso CFDI": invoice.usoCFDI,
      "Concepto": invoice.concepto || "",
      "Categoría": invoice.categoria || "",
      "Método de Pago": invoice.metodoPago,
      "Forma de Pago": invoice.formaPago,
      "Subtotal": invoice.subTotal,
      "IVA Trasladado": invoice.impuestoTrasladado || 0,
      "IVA Retenido": invoice.ivaRetenido || 0,
      "ISR Retenido": invoice.isrRetenido || 0,
      "Total": invoice.total,
      "Es Deducible": invoice.esDeducible ? "Sí" : "No",
      "Mes Deducción": invoice.mesDeduccion ? getMonthName(invoice.mesDeduccion) : "",
      "Deducción Anual": invoice.anual ? "Sí" : "No",
      "Gravado ISR": invoice.gravadoISR || 0,
      "Gravado IVA": invoice.gravadoIVA || 0,
      "Tasa 0%": invoice.Tasa0 || 0,
      "Exento": invoice.Exento || 0,
      "Cancelado": invoice.estaCancelado ? "Sí" : "No",
      "Tiene Complemento Pago": invoice.docsRelacionadoComplementoPago?.length > 0 ? "Sí" : "No",
      "UUIDs Complementos Pago": invoice.docsRelacionadoComplementoPago?.join(", ") || "",
      "Bloqueado": invoice.locked ? "Sí" : "No",
      "Notas de Deducibilidad": invoice.notasDeducibilidad || ""
    }));

    return { createEmittedData, createReceivedData };
  }, [getMonthName]);

  // Function to handle Excel export
  const handleExport = () => {
    try {
      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Check if we're using separate sheets or a single sheet
      if (emittedInvoices || receivedInvoices) {
        // Add emitted invoices sheet if available - with customized fields
        if (emittedInvoices && emittedInvoices.length > 0) {
          const emittedData = processInvoices.createEmittedData(emittedInvoices);
          const emittedWorksheet = XLSX.utils.json_to_sheet(emittedData);
          XLSX.utils.book_append_sheet(workbook, emittedWorksheet, `Facturas Emitidas ${year}`);
        }
        
        // Add received invoices sheet if available - with original fields
        if (receivedInvoices && receivedInvoices.length > 0) {
          const receivedData = processInvoices.createReceivedData(receivedInvoices);
          const receivedWorksheet = XLSX.utils.json_to_sheet(receivedData);
          XLSX.utils.book_append_sheet(workbook, receivedWorksheet, `Facturas Recibidas ${year}`);
        }
      } else if (invoices && invoices.length > 0) {
        // Fallback to single sheet for backwards compatibility
        // Split invoices into emitted and received
        const emittedOnes = invoices.filter(inv => !inv.recibida);
        const receivedOnes = invoices.filter(inv => inv.recibida);
        
        if (emittedOnes.length > 0) {
          const emittedData = processInvoices.createEmittedData(emittedOnes);
          const emittedWorksheet = XLSX.utils.json_to_sheet(emittedData);
          XLSX.utils.book_append_sheet(workbook, emittedWorksheet, `Facturas Emitidas ${year}`);
        }
        
        if (receivedOnes.length > 0) {
          const receivedData = processInvoices.createReceivedData(receivedOnes);
          const receivedWorksheet = XLSX.utils.json_to_sheet(receivedData);
          XLSX.utils.book_append_sheet(workbook, receivedWorksheet, `Facturas Recibidas ${year}`);
        }
      } else {
        // If no invoices at all, add an empty sheet
        const worksheet = XLSX.utils.aoa_to_sheet([["No hay facturas disponibles"]]);
        XLSX.utils.book_append_sheet(workbook, worksheet, `Facturas ${year}`);
      }

      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error("Error exporting Excel:", error);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
    >
      <Download className="h-4 w-4 mr-1" />
      <span>{buttonLabel}</span>
    </Button>
  );
}
