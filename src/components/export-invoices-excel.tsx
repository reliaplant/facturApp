"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check } from "lucide-react";
import { CFDI } from "@/models/CFDI";
import { FixedAsset } from "@/models/FixedAsset";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from 'xlsx';
import { parseLocalDate } from "@/lib/utils";

interface ExportInvoicesExcelProps {
  invoices?: CFDI[];
  emittedInvoices?: CFDI[];
  receivedInvoices?: CFDI[];
  fixedAssets?: FixedAsset[];
  year: number;
  buttonLabel?: string;
  fileName?: string;
}

export function ExportInvoicesExcel({ 
  invoices,
  emittedInvoices, 
  receivedInvoices,
  fixedAssets,
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
    const sortInvoices = (invoicesToSort: CFDI[]) => 
      [...invoicesToSort].sort((a, b) => parseLocalDate(a.fecha).getTime() - parseLocalDate(b.fecha).getTime());
      
    const createEmittedData = (items: CFDI[]) => sortInvoices(items).map(invoice => {
      const tipoCambio = invoice.tipoCambio || 1;
      return {
        "Fecha": format(parseLocalDate(invoice.fecha), 'dd/MM/yyyy'),
        "UUID": invoice.uuid,
        "Receptor": invoice.nombreReceptor,
        "Régimen Fiscal Receptor": invoice.regimenFiscalReceptor || "",
        "Uso CFDI": invoice.usoCFDI,
        "Tipo Comprobante": invoice.tipoDeComprobante || "",
        "Forma Pago": invoice.formaPago,
        "Método Pago": invoice.metodoPago,
        "Categoría": invoice.categoria || "",
        "Subtotal": invoice.subTotal,
        "+IVA": invoice.impuestoTrasladado || 0,
        "-IVA Ret": invoice.ivaRetenido || 0,
        "-ISR Ret": invoice.isrRetenido || 0,
        "Total": invoice.total,
        "Moneda": invoice.moneda || "MXN",
        "Tipo Cambio": tipoCambio,
        "Mes Cobro": invoice.mesDeduccion ? getMonthName(invoice.mesDeduccion) : "",
        "¿Es Ingreso?": invoice.esDeducible ? "Sí" : "No",
        "Gravado ISR": invoice.gravadoISR || 0,
        "Gravado IVA": invoice.gravadoIVA || 0,
        "IVA Retenido MXN": (invoice.ivaRetenido || 0) * tipoCambio,
      };
    });
    
    const createReceivedData = (items: CFDI[]) => sortInvoices(items).map(invoice => ({
      "Fecha": format(parseLocalDate(invoice.fecha), 'dd/MM/yyyy'),
      "UUID": invoice.uuid,
      "Emisor": invoice.nombreEmisor,
      "Régimen Fiscal": invoice.regimenFiscal || "",
      "Uso CFDI": invoice.usoCFDI,
      "Tipo Comprobante": invoice.tipoDeComprobante || "",
      "Forma Pago": invoice.formaPago,
      "Método Pago": invoice.metodoPago,
      "Categoría": invoice.categoria || "",
      "Subtotal": invoice.subTotal,
      "+IVA": invoice.impuestoTrasladado || 0,
      "+IEPS": invoice.iepsTrasladado || 0,
      "-IVA Ret": invoice.ivaRetenido || 0,
      "-ISR Ret": invoice.isrRetenido || 0,
      "Total": invoice.total,
      "Moneda": invoice.moneda || "MXN",
      "Tipo Cambio": invoice.tipoCambio || 1,
      "Mes Pago": invoice.mesDeduccion ? getMonthName(invoice.mesDeduccion) : "",
      "¿Es Deducible?": invoice.esDeducible ? (invoice.anual ? "Sí | Anual" : "Sí") : "No",
      "Gravado ISR": invoice.gravadoISR || 0,
      "Gravado IVA": invoice.gravadoIVA || 0,
      "Exento": invoice.total - (invoice.gravadoIVA || 0) - (invoice.gravadoISR || 0),
    }));

    const createFixedAssetsData = (items: FixedAsset[]) => 
      [...items]
        .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
        .map(asset => {
          const depreciableAmount = asset.cost - asset.residualValue;
          const monthlyDep = asset.usefulLifeMonths > 0 ? depreciableAmount / asset.usefulLifeMonths : 0;
          return {
            "Nombre": asset.name,
            "Tipo": asset.type,
            "Estado": asset.status === 'active' ? 'Activo' : asset.status === 'fullyDepreciated' ? 'Totalmente Depreciado' : asset.status === 'disposed' ? 'Dado de Baja' : asset.status === 'sold' ? 'Vendido' : asset.status,
            "Fecha Compra": asset.purchaseDate ? format(parseLocalDate(asset.purchaseDate), 'dd/MM/yyyy') : "",
            "Inicio Depreciación": asset.depreciationStartDate ? format(parseLocalDate(asset.depreciationStartDate), 'dd/MM/yyyy') : "",
            "Valor Compra": asset.cost,
            "Valor Deducible": asset.deductibleValue ?? asset.cost,
            "Vida Útil (meses)": asset.usefulLifeMonths,
            "% Dep. Anual": asset.usefulLifeMonths > 0 ? Number(((12 / asset.usefulLifeMonths) * 100).toFixed(2)) : 0,
            "Dep. Mensual": Number(monthlyDep.toFixed(2)),
            "Dep. Acumulada": asset.accumulatedDepreciation,
            "Valor Actual": asset.currentValue,
            "Valor Residual": asset.residualValue,
            "N° Factura": asset.invoiceNumber || "",
            "Notas": asset.notes || "",
          };
        });

    return { createEmittedData, createReceivedData, createFixedAssetsData };
  }, [getMonthName]);

  // Copy JSON feedback state
  const [copied, setCopied] = useState(false);

  // Build the JSON data object
  const buildJsonData = () => {
    const data: Record<string, unknown> = {};

    if (emittedInvoices || receivedInvoices) {
      if (emittedInvoices && emittedInvoices.length > 0) {
        data.facturasEmitidas = processInvoices.createEmittedData(emittedInvoices);
      }
      if (receivedInvoices && receivedInvoices.length > 0) {
        data.facturasRecibidas = processInvoices.createReceivedData(receivedInvoices);
      }
    } else if (invoices && invoices.length > 0) {
      const emittedOnes = invoices.filter(inv => inv.esIngreso);
      const receivedOnes = invoices.filter(inv => inv.esEgreso);
      if (emittedOnes.length > 0) data.facturasEmitidas = processInvoices.createEmittedData(emittedOnes);
      if (receivedOnes.length > 0) data.facturasRecibidas = processInvoices.createReceivedData(receivedOnes);
    }

    if (fixedAssets && fixedAssets.length > 0) {
      data.activosFijos = processInvoices.createFixedAssetsData(fixedAssets);
    }

    return data;
  };

  const handleCopyJson = async () => {
    try {
      const data = buildJsonData();
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying JSON:", error);
    }
  };

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
        const emittedOnes = invoices.filter(inv => inv.esIngreso);
        const receivedOnes = invoices.filter(inv => inv.esEgreso);
        
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

      // Add fixed assets sheet if available
      if (fixedAssets && fixedAssets.length > 0) {
        const fixedAssetsData = processInvoices.createFixedAssetsData(fixedAssets);
        const fixedAssetsWorksheet = XLSX.utils.json_to_sheet(fixedAssetsData);
        XLSX.utils.book_append_sheet(workbook, fixedAssetsWorksheet, `Activos Fijos ${year}`);
      }

      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error("Error exporting Excel:", error);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="xs"
        onClick={handleExport}
      >
        <Download className="h-3 w-3 mr-1" />
        <span>{buttonLabel}</span>
      </Button>
      <Button
        variant="outline"
        size="xs"
        onClick={handleCopyJson}
      >
        {copied ? <Check className="h-3 w-3 mr-1 text-green-500" /> : <Copy className="h-3 w-3 mr-1" />}
        <span>{copied ? "Copiado" : "JSON"}</span>
      </Button>
    </>
  );
}
