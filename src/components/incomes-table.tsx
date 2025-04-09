import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar as CalendarIcon, FileText, Eye, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Invoice } from "@/models/Invoice";

interface IncomesTableProps {
  year: number;
  invoices: Invoice[];
}

export function IncomesTable({ year, invoices = [] }: IncomesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

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
  
  return (
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 text-left">
                    <th className="px-4 py-3 font-medium">Mes</th>
                    <th className="px-4 py-3 font-medium">No.</th>
                    <th className="px-4 py-3 font-medium">TipoDocumento</th>
                    <th className="px-4 py-3 font-medium">RFC Receptor</th>
                    <th className="px-4 py-3 font-medium">Receptor</th>
                    <th className="px-4 py-3 font-medium">DomicilioFiscalReceptor</th>
                    <th className="px-4 py-3 font-medium">RegimenFiscalReceptor</th>
                    <th className="px-4 py-3 font-medium">UsoCFDI</th>
                    <th className="px-4 py-3 font-medium">RFC Emisor</th>
                    <th className="px-4 py-3 font-medium">Emisor</th>
                    <th className="px-4 py-3 font-medium">LugarExpedicion</th>
                    <th className="px-4 py-3 font-medium">RegimenFiscal</th>
                    <th className="px-4 py-3 font-medium">Serie</th>
                    <th className="px-4 py-3 font-medium">Folio</th>
                    <th className="px-4 py-3 font-medium">UUID</th>
                    <th className="px-4 py-3 font-medium">MetodoPago</th>
                    <th className="px-4 py-3 font-medium">NumCtaPago</th>
                    <th className="px-4 py-3 font-medium">FormaCtaPago</th>
                    <th className="px-4 py-3 font-medium">FormaPago</th>
                    <th className="px-4 py-3 font-medium">Moneda</th>
                    <th className="px-4 py-3 font-medium">TipoCambio</th>
                    <th className="px-4 py-3 font-medium text-right">SubTotal</th>
                    <th className="px-4 py-3 font-medium text-right">ImpTrasladados</th>
                    <th className="px-4 py-3 font-medium text-right">IvaTrasladado</th>
                    <th className="px-4 py-3 font-medium text-right">IepsTrasladado</th>
                    <th className="px-4 py-3 font-medium text-right">ImpRetenidos</th>
                    <th className="px-4 py-3 font-medium text-right">IvaRetenido</th>
                    <th className="px-4 py-3 font-medium text-right">IsrRetenido</th>
                    <th className="px-4 py-3 font-medium text-right">Descuento</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((invoice, index) => (
                      <tr 
                        key={invoice.id}
                        className={`border-t border-gray-200 dark:border-gray-800 ${
                          index % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900'
                        }`}
                      >
                        <td className="px-4 py-3 align-middle">{getMonth(invoice.date)}</td>
                        <td className="px-4 py-3 align-middle">{index + 1}</td>
                        <td className="px-4 py-3 align-middle">{invoice.cfdiType}</td>
                        <td className="px-4 py-3 align-middle">{invoice.receiverRfc}</td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">{invoice.receiverName}</td>
                        <td className="px-4 py-3 align-middle">{invoice.domicilioFiscalReceptor || invoice.receiverZipCode || 'N/A'}</td>
                        <td className="px-4 py-3 align-middle">{invoice.regimenFiscalReceptor || invoice.receiverFiscalRegime || 'N/A'}</td>
                        <td className="px-4 py-3 align-middle">{invoice.cfdiUsage}</td>
                        <td className="px-4 py-3 align-middle">{invoice.issuerRfc}</td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">{invoice.issuerName}</td>
                        <td className="px-4 py-3 align-middle">{invoice.lugarExpedicion || invoice.issuerZipCode || 'N/A'}</td>
                        <td className="px-4 py-3 align-middle">{invoice.fiscalRegime}</td>
                        <td className="px-4 py-3 align-middle">{invoice.series || 'N/A'}</td>
                        <td className="px-4 py-3 align-middle">{invoice.folio || 'N/A'}</td>
                        <td className="px-4 py-3 align-middle">
                          <span className="font-mono text-xs">{invoice.uuid.substring(0, 8)}...</span>
                        </td>
                        <td className="px-4 py-3 align-middle">{invoice.paymentMethod}</td>
                        <td className="px-4 py-3 align-middle">{invoice.paymentAccountNumber || 'N/A'}</td>
                        <td className="px-4 py-3 align-middle">{invoice.paymentAccountForm || 'N/A'}</td>
                        <td className="px-4 py-3 align-middle">{invoice.paymentForm}</td>
                        <td className="px-4 py-3 align-middle">{invoice.currency || 'MXN'}</td>
                        <td className="px-4 py-3 align-middle">{invoice.exchangeRate || '1.00'}</td>
                        <td className="px-4 py-3 align-middle text-right">
                          ${invoice.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          ${(invoice.transferredTaxes || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          ${(invoice.tax || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          ${(invoice.iepsTax || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          ${(invoice.retainedTaxes || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          ${(invoice.retainedVat || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          ${(invoice.retainedIsr || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          ${(invoice.discount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 align-middle text-right font-medium">
                          ${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 align-middle text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="icon" title="Ver detalle">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Descargar XML">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={31} className="px-4 py-8 text-center text-gray-500">
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
    </div>
  );
}
