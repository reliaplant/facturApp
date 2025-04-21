"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar as CalendarIcon, FileText, Eye, Download, MoreHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Invoice } from "@/models/Invoice";
import { InvoicePreviewModal } from "@/components/invoice-preview-modal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface IncomesTableProps {
  year: number;
  invoices: Invoice[];
}

export function IncomesTable({ year, invoices = [] }: IncomesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoicesToUpdate, setInvoicesToUpdate] = useState<Invoice[]>([]);
  const [showMetodoPagoDetails, setShowMetodoPagoDetails] = useState(false);
  const [showRegimeFiscalDetails, setShowRegimeFiscalDetails] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      // Validar si realmente tenemos facturas tipo I
      const realIncomes = invoices.filter(inv => inv.cfdiType === 'I');
      
      console.log(`IncomesTable - Recibimos ${invoices.length} facturas totales`);
      console.log(`IncomesTable - De las cuales ${realIncomes.length} son tipo I (recibidos)`);
      
      if (realIncomes.length > 0 && realIncomes.length !== invoices.length) {
        console.warn("ADVERTENCIA: Se recibieron facturas que no son recibidos en la tabla de recibidos");
      }
      
      if (invoices.length > 0) {
        const firstInvoice = invoices[0];
        console.log("Muestra de la primera factura:", {
          uuid: firstInvoice.uuid,
          cfdiType: firstInvoice.cfdiType,
          issuerRfc: firstInvoice.issuerRfc,
          receiverRfc: firstInvoice.receiverRfc,
          total: firstInvoice.total
        });
      }
    } catch (error) {
      console.error("Error al analizar facturas en IncomesTable:", error);
    }
  }, [invoices]);
  
  // Debugging para ver qué facturas están llegando
  useEffect(() => {
    console.log(`IncomesTable - Recibidas ${invoices.length} facturas CFDI recibidas`);
    if (invoices.length > 0) {
      console.log("Muestra de la primera factura:", {
        uuid: invoices[0].uuid,
        date: invoices[0].date,
        type: invoices[0].cfdiType,
        total: invoices[0].total
      });
    }
  }, [invoices]);
  
  // Filtrar facturas por año, búsqueda y rango de fechas
  const filteredInvoices = invoices.filter(invoice => {
    try {
      const invoiceYear = new Date(invoice.date).getFullYear();
      const matchesYear = invoiceYear === year;
      
      const matchesSearch = searchTerm === "" || 
        invoice.uuid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.issuerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.issuerRfc.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDateRange = true;
      if (dateFrom) {
        matchesDateRange = matchesDateRange && new Date(invoice.date) >= dateFrom;
      }
      if (dateTo) {
        matchesDateRange = matchesDateRange && new Date(invoice.date) <= dateTo;
      }
      
      return matchesYear && matchesSearch && matchesDateRange && !invoice.isCancelled;
    } catch (error) {
      console.error("Error al filtrar factura:", error, invoice);
      return false;
    }
  });
  
  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);

  // Función para obtener el mes de la factura (1-12)
  const getMonth = (dateString: string): number => {
    return new Date(dateString).getMonth() + 1;
  };
  
  // Nombre del mes para mostrar en la fila de separación
  const getMonthName = (month: number): string => {
    const date = new Date(year, month - 1, 1);
    return format(date, 'MMMM', { locale: es });
  };

  // Agrupar facturas por mes
  const invoicesByMonth = filteredInvoices.reduce((acc: { [key: number]: Invoice[] }, invoice) => {
    const month = getMonth(invoice.date);
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(invoice);
    return acc;
  }, {});
  
  // Ordenar los meses numéricamente
  const sortedMonths = Object.keys(invoicesByMonth)
    .map(Number)
    .sort((a, b) => a - b);

  // Handle row click to open the invoice modal
  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };

  // Function to update invoice with new deductibility info
  const handleUpdateInvoice = (updatedInvoice: Invoice) => {
    // In a real app, this would call an API to update the invoice
    setInvoicesToUpdate(prev => [...prev, updatedInvoice]);
    
    // Update the selected invoice with new info
    if (selectedInvoice && selectedInvoice.id === updatedInvoice.id) {
      setSelectedInvoice(updatedInvoice);
    }
    
    toast({
      title: "Factura actualizada",
      description: "La información ha sido actualizada correctamente.",
    });
  };
  
  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex justify-between items-center">
              <span>Facturas CFDI Recibidas {year}</span>
              <Badge variant="outline" className="text-sm py-1">
                Total: ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Badge>
            </CardTitle>
            
            <div className="flex flex-col md:flex-row gap-3 pt-2">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por UUID, emisor o RFC..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {dateFrom && dateTo ? (
                        <span>
                          {format(dateFrom, "dd/MM/yyyy")} - {format(dateTo, "dd/MM/yyyy")}
                        </span>
                      ) : (
                        <span>Rango de fechas</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="flex flex-col sm:flex-row gap-2 p-3">
                      <div>
                        <div className="mb-2 text-sm font-medium">Desde</div>
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          locale={es}
                          className="border rounded-md"
                        />
                      </div>
                      <div>
                        <div className="mb-2 text-sm font-medium">Hasta</div>
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          locale={es}
                          className="border rounded-md"
                        />
                      </div>
                    </div>
                    <div className="border-t p-3 flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setDateFrom(undefined);
                        setDateTo(undefined);
                      }}>
                        Limpiar
                      </Button>
                      <Button size="sm">Aplicar</Button>
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                  <span className="sr-only md:not-sr-only md:ml-2">Exportar</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800 text-left">
                      {/* Eliminadas columnas redundantes "Mes" y "No." */}
                      <th className="px-2 py-1.5 font-medium">TipoDocumento</th>
                      <th className="px-2 py-1.5 font-medium">RFC Receptor</th>
                      <th className="px-2 py-1.5 font-medium">Receptor</th>
                      <th className="px-2 py-1.5 font-medium">DomicilioFiscalReceptor</th>
                      <th className="px-2 py-1.5 font-medium">RegimenFiscalReceptor</th>
                      <th className="px-2 py-1.5 font-medium">UsoCFDI</th>
                      <th className="px-2 py-1.5 font-medium">RFC Emisor</th>
                      <th className="px-2 py-1.5 font-medium">Emisor</th>
                      <th className="px-2 py-1.5 font-medium cursor-pointer" onClick={() => setShowRegimeFiscalDetails(!showRegimeFiscalDetails)}>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">RegFiscal</TooltipTrigger>
                            <TooltipContent>
                              <p>RegimenFiscal</p>
                            </TooltipContent>
                          </Tooltip>
                          {showRegimeFiscalDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </div>
                      </th>
                      {showRegimeFiscalDetails && (
                        <>
                          <th className="px-2 py-1.5 font-medium">
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">LugarExp</TooltipTrigger>
                              <TooltipContent>
                                <p>LugarExpedicion</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="px-2 py-1.5 font-medium">Serie</th>
                          <th className="px-2 py-1.5 font-medium">Folio</th>
                          <th className="px-2 py-1.5 font-medium">UUID</th>
                        </>
                      )}
                      <th className="px-2 py-1.5 font-medium cursor-pointer" onClick={() => setShowMetodoPagoDetails(!showMetodoPagoDetails)}>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">MetPago</TooltipTrigger>
                            <TooltipContent>
                              <p>MetodoPago</p>
                            </TooltipContent>
                          </Tooltip>
                          {showMetodoPagoDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </div>
                      </th>
                      {showMetodoPagoDetails && (
                        <>
                          <th className="px-2 py-1.5 font-medium">NumCtaPago</th>
                          <th className="px-2 py-1.5 font-medium">FormaCtaPago</th>
                          <th className="px-2 py-1.5 font-medium">
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">FormPago</TooltipTrigger>
                              <TooltipContent>
                                <p>FormaPago</p>
                              </TooltipContent>
                            </Tooltip>
                          </th>
                          <th className="px-2 py-1.5 font-medium">Moneda</th>
                          <th className="px-2 py-1.5 font-medium">TipoCambio</th>
                        </>
                      )}
                      <th className="px-2 py-1.5 font-medium text-right">SubTotal</th>
                      <th className="px-2 py-1.5 font-medium text-right">ImpTrasladados</th>
                      <th className="px-2 py-1.5 font-medium text-right">IvaTrasladado</th>
                      <th className="px-2 py-1.5 font-medium text-right">IepsTrasladado</th>
                      <th className="px-2 py-1.5 font-medium text-right">ImpRetenidos</th>
                      <th className="px-2 py-1.5 font-medium text-right">IvaRetenido</th>
                      <th className="px-2 py-1.5 font-medium text-right">IsrRetenido</th>
                      <th className="px-2 py-1.5 font-medium text-right">Descuento</th>
                      <th className="px-2 py-1.5 font-medium text-right">Total</th>
                      <th className="px-2 py-1.5 font-medium text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMonths.length > 0 ? (
                      sortedMonths.map((month) => (
                        <React.Fragment key={month}>
                          <tr className="bg-gray-200 dark:bg-gray-700">
                            <td colSpan={30} className="px-2 py-1.5 font-medium">
                              {getMonthName(month)}
                            </td>
                          </tr>
                          {invoicesByMonth[month].map((invoice, index) => (
                            <tr 
                              key={invoice.id}
                              onClick={() => handleInvoiceClick(invoice)}
                              className={`border-t border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                index % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900'
                              }`}
                            >
                              <td className="px-2 py-1 align-middle">{invoice.cfdiType}</td>
                              <td className="px-2 py-1 align-middle">{invoice.receiverRfc}</td>
                              <td className="px-2 py-1 align-middle whitespace-nowrap">{invoice.receiverName}</td>
                              <td className="px-2 py-1 align-middle">{invoice.domicilioFiscalReceptor || invoice.receiverZipCode || 'N/A'}</td>
                              <td className="px-2 py-1 align-middle">{invoice.regimenFiscalReceptor || invoice.receiverFiscalRegime || 'N/A'}</td>
                              <td className="px-2 py-1 align-middle">{invoice.cfdiUsage}</td>
                              <td className="px-2 py-1 align-middle">{invoice.issuerRfc}</td>
                              <td className="px-2 py-1 align-middle whitespace-nowrap">
                                <Tooltip>
                                  <TooltipTrigger className="cursor-help max-w-[150px] truncate overflow-hidden inline-block text-left">
                                    {invoice.issuerName}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{invoice.issuerName}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                              <td className="px-2 py-1 align-middle">{invoice.fiscalRegime}</td>
                              {showRegimeFiscalDetails && (
                                <>
                                  <td className="px-2 py-1 align-middle">{invoice.lugarExpedicion || invoice.issuerZipCode || 'N/A'}</td>
                                  <td className="px-2 py-1 align-middle">{invoice.series || 'N/A'}</td>
                                  <td className="px-2 py-1 align-middle">{invoice.folio || 'N/A'}</td>
                                  <td className="px-2 py-1 align-middle">
                                    <span className="font-mono text-xxs">{invoice.uuid.substring(0, 8)}...</span>
                                  </td>
                                </>
                              )}
                              <td className="px-2 py-1 align-middle">{invoice.paymentMethod}</td>
                              {showMetodoPagoDetails && (
                                <>
                                  <td className="px-2 py-1 align-middle">{invoice.paymentAccountNumber || 'N/A'}</td>
                                  <td className="px-2 py-1 align-middle">{invoice.paymentAccountForm || 'N/A'}</td>
                                  <td className="px-2 py-1 align-middle">{invoice.paymentForm}</td>
                                  <td className="px-2 py-1 align-middle">{invoice.currency || 'MXN'}</td>
                                  <td className="px-2 py-1 align-middle">{invoice.exchangeRate || '1.00'}</td>
                                </>
                              )}
                              <td className="px-2 py-1 align-middle text-right">
                                ${invoice.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-2 py-1 align-middle text-right">
                                ${(invoice.transferredTaxes || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-2 py-1 align-middle text-right">
                                ${(invoice.tax || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-2 py-1 align-middle text-right">
                                ${(invoice.iepsTax || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-2 py-1 align-middle text-right">
                                ${(invoice.retainedTaxes || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-2 py-1 align-middle text-right">
                                ${(invoice.retainedVat || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-2 py-1 align-middle text-right">
                                ${(invoice.retainedIsr || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-2 py-1 align-middle text-right">
                                ${(invoice.discount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-2 py-1 align-middle text-right font-medium">
                                ${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-2 py-1 align-middle text-center">
                                <div className="flex justify-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-5 w-5" title="Ver detalle">
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-5 w-5" title="Descargar XML">
                                    <FileText className="h-3 w-3" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="icon" className="h-5 w-5">
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="text-xs">
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedInvoice(invoice);
                                        setIsModalOpen(true);
                                      }}>
                                        Ver detalle
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={30} className="px-2 py-4 text-center text-gray-500 text-xs">
                          No se encontraron facturas CFDI recibidas para el año {year} con los filtros actuales
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add the invoice preview modal */}
        <InvoicePreviewModal 
          invoice={selectedInvoice}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUpdate={handleUpdateInvoice}
        />
      </div>
    </TooltipProvider>
  );
}
