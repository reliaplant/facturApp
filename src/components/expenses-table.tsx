"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar as CalendarIcon, FileText, Eye, Download, Check, MoreHorizontal, X, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Invoice } from "@/models/Invoice";
import { InvoicePreviewModal } from "@/components/invoice-preview-modal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";

// Categorías de egresos
const expenseCategories = [
  "Todas",
  "Gastos generales",
  "Compra de materiales",
  "Servicios profesionales",
  "Arrendamiento",
  "Otros"
];

interface ExpensesTableProps {
  year: number;
  invoices: Invoice[];
}

export function ExpensesTable({ year, invoices = [] }: ExpensesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoicesToUpdate, setInvoicesToUpdate] = useState<Invoice[]>([]);
  const [showMetodoPagoDetails, setShowMetodoPagoDetails] = useState(false);
  const [showRegimeFiscalDetails, setShowRegimeFiscalDetails] = useState(false);
  const [category, setCategory] = useState("Todas");
  const [showDeductibilityEditor, setShowDeductibilityEditor] = useState(false);
  const [updatedInvoices, setUpdatedInvoices] = useState<Record<string, Invoice>>({});
  
  // Cargar facturas actualizadas desde localStorage al montar el componente
  useEffect(() => {
    try {
      const savedInvoices = localStorage.getItem(`updatedInvoices_${year}`);
      if (savedInvoices) {
        const parsed = JSON.parse(savedInvoices);
        setUpdatedInvoices(parsed);
      }
    } catch (error) {
      console.error("Error al cargar facturas actualizadas del localStorage:", error);
    }
  }, [year]);
  
  // Guardar facturas actualizadas en localStorage cuando cambian
  useEffect(() => {
    try {
      if (Object.keys(updatedInvoices).length > 0) {
        localStorage.setItem(`updatedInvoices_${year}`, JSON.stringify(updatedInvoices));
      }
    } catch (error) {
      console.error("Error al guardar facturas actualizadas en localStorage:", error);
    }
  }, [updatedInvoices, year]);
  
  // Combinar las facturas originales con las actualizadas para mantener los cambios
  const mergedInvoices = invoices.map(invoice => {
    return updatedInvoices[invoice.id] || invoice;
  });
  
  // Debugging para ver qué facturas están llegando
  useEffect(() => {
    try {
      // Validar si realmente tenemos facturas tipo E
      const realExpenses = mergedInvoices.filter(inv => inv.cfdiType === 'E');
      
      console.log(`ExpensesTable - Recibimos ${mergedInvoices.length} facturas totales`);
      console.log(`ExpensesTable - De las cuales ${realExpenses.length} son tipo E (emitidos)`);
      
      if (realExpenses.length > 0 && realExpenses.length !== mergedInvoices.length) {
        console.warn("ADVERTENCIA: Se recibieron facturas que no son emitidos en la tabla de emitidos");
      }
      
      if (mergedInvoices.length > 0) {
        const firstInvoice = mergedInvoices[0];
        console.log("Muestra de la primera factura:", {
          uuid: firstInvoice.uuid,
          cfdiType: firstInvoice.cfdiType,
          issuerRfc: firstInvoice.issuerRfc,
          receiverRfc: firstInvoice.receiverRfc,
          total: firstInvoice.total
        });
      }
    } catch (error) {
      console.error("Error al analizar facturas en ExpensesTable:", error);
    }
  }, [mergedInvoices]);
  
  // Filtrar facturas por año, búsqueda, rango de fechas y categoría
  const filteredInvoices = mergedInvoices.filter(invoice => {
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
    
    const matchesCategory = category === "Todas" || invoice.expenseType === category;
    
    return matchesYear && matchesSearch && matchesDateRange && matchesCategory && !invoice.isCancelled;
  });
  
  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  
  // Función para obtener el mes de la factura (1-12)
  const getMonth = (dateString: string): number => {
    return new Date(dateString).getMonth() + 1;
  };
  
  // Función para obtener las abreviaturas de meses en español
  const getMonthAbbreviation = (month: number): string => {
    // Valor especial para deducción anual
    if (month === 13) return 'ANUAL';
    
    const monthAbbreviations = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return monthAbbreviations[month - 1] || '';
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
    setSelectedInvoice(updatedInvoices[invoice.id] || invoice);
    setIsModalOpen(true);
  };

  // Function to update invoice with new deductibility info
  const handleUpdateInvoice = (updatedInvoice: Invoice) => {
    // Calcular los valores de deducibilidad adicionales
    const calculatedInvoice = calculateDeductibilityValues(updatedInvoice);
    
    // Almacenar la factura actualizada en el estado local
    setUpdatedInvoices(prev => ({
      ...prev,
      [calculatedInvoice.id]: calculatedInvoice
    }));
    
    // Actualizar la factura seleccionada si es la misma que se está modificando
    if (selectedInvoice && selectedInvoice.id === calculatedInvoice.id) {
      setSelectedInvoice(calculatedInvoice);
    }
    
    // Asegurar que los cambios se guarden inmediatamente en localStorage
    try {
      const currentSaved = localStorage.getItem(`updatedInvoices_${year}`) || "{}";
      const parsed = JSON.parse(currentSaved);
      parsed[calculatedInvoice.id] = calculatedInvoice;
      localStorage.setItem(`updatedInvoices_${year}`, JSON.stringify(parsed));
    } catch (error) {
      console.error("Error al guardar factura individual en localStorage:", error);
    }
  };
  
  // Calcula los valores adicionales de deducibilidad
  const calculateDeductibilityValues = (invoice: Invoice): Invoice => {
    if (!invoice.isDeductible) {
      return invoice;
    }
    
    // Por defecto, usar el mes de emisión como mes de deducción
    const deductionMonth = invoice.deductionMonth || getMonth(invoice.date);
    
    // Calcular montos deducibles según el tipo de deducibilidad
    let deductibleTaxedAmount = 0;   // Monto gravado
    let deductibleVAT = 0;           // IVA deducible
    let deductibleExempt = 0;        // Monto exento
    
    if (invoice.deductibilityType === 'full') {
      // Deducción completa
      deductibleTaxedAmount = invoice.subtotal;
      deductibleVAT = invoice.tax || 0;
      // Si hay conceptos con tasa 0% o exentos, establecer esos valores
      // Como no tenemos esa información por el momento, lo dejamos en 0
    } else if (invoice.deductibilityType === 'partial' && invoice.deductiblePercentage) {
      // Deducción parcial (porcentaje)
      const factor = invoice.deductiblePercentage / 100;
      deductibleTaxedAmount = invoice.subtotal * factor;
      deductibleVAT = (invoice.tax || 0) * factor;
    } else if (invoice.deductibilityType === 'fixed' && invoice.deductibleAmount) {
      // Monto fijo - asumimos que este es el total deducible
      // Proporcionalmente distribuimos entre gravado e IVA
      if (invoice.total > 0) {
        const factor = invoice.deductibleAmount / invoice.total;
        deductibleTaxedAmount = invoice.subtotal * factor;
        deductibleVAT = (invoice.tax || 0) * factor;
      }
    }
    
    // Total deducible es la suma de los componentes
    const deductibleTotal = deductibleTaxedAmount + deductibleVAT + deductibleExempt;
    
    // Diferencia entre el total deducible y el total de la factura
    const deductibleDifference = deductibleTotal - invoice.total;
    
    return {
      ...invoice,
      deductionMonth,
      deductibleTaxedAmount,
      deductibleVAT,
      deductibleExempt,
      deductibleTotal,
      deductibleDifference
    };
  };

  // Handle checkbox click without triggering row click
  const handleCheckboxClick = (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    const isDeductible = !invoice.isDeductible;
    const updatedInvoice = {
      ...invoice,
      isDeductible,
      deductibilityType: isDeductible ? 'full' : 'none' as 'none' | 'full' | 'partial' | 'fixed'
    };
    handleUpdateInvoice(updatedInvoice);
  };

  // Helper function to display deductibility information nicely
  const getDeductibilityDisplay = (invoice: Invoice) => {
    if (!invoice.isDeductible) return null;
    
    if (invoice.deductibilityType === 'fixed' && invoice.deductibleAmount) {
      return `${formatCurrency(invoice.deductibleAmount)}`;
    } else if (invoice.deductibilityType === 'partial' && invoice.deductiblePercentage) {
      return `${invoice.deductiblePercentage}%`;
    }
    return null;
  };

  // Function to open modal with deductibility editor open
  const openDeductibilityEditor = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDeductibilityEditor(true);
    setIsModalOpen(true);
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex justify-between items-center">
            <span>Facturas CFDI Emitidas {year}</span>
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
            
            <div className="flex gap-2 flex-wrap">
              <Select 
                value={category} 
                onValueChange={setCategory}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
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
                    {/* Ocultado: TipoDocumento */}
                    {/* Ocultado: RFC Receptor */}
                    {/* Ocultado: Receptor */}
                    {/* Ocultado: DomicilioFiscalReceptor */}
                    {/* Ocultado: RegimenFiscalReceptor */}
                    <th className="px-2 py-1.5 font-medium">UsoCFDI</th>
                    <th className="px-2 py-1.5 font-medium">RFC Emisor</th>
                    <th className="px-2 py-1.5 font-medium">Emisor</th>
                    <th className="px-2 py-1.5 font-medium cursor-pointer" onClick={() => setShowRegimeFiscalDetails(!showRegimeFiscalDetails)}>
                      <div className="flex items-center gap-1">
                        <span>RegimenFiscal</span>
                        {showRegimeFiscalDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </div>
                    </th>
                    {showRegimeFiscalDetails && (
                      <>
                        <th className="px-2 py-1.5 font-medium">
                          <span>LugarExp</span>
                        </th>
                        <th className="px-2 py-1.5 font-medium">Serie</th>
                        <th className="px-2 py-1.5 font-medium">Folio</th>
                        <th className="px-2 py-1.5 font-medium">UUID</th>
                      </>
                    )}
                    <th className="px-2 py-1.5 font-medium cursor-pointer" onClick={() => setShowMetodoPagoDetails(!showMetodoPagoDetails)}>
                      <div className="flex items-center gap-1">
                        <span>MetPago</span>
                        {showMetodoPagoDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </div>
                    </th>
                    {showMetodoPagoDetails && (
                      <>
                        <th className="px-2 py-1.5 font-medium">NumCtaPago</th>
                        <th className="px-2 py-1.5 font-medium">FormaCtaPago</th>
                        <th className="px-2 py-1.5 font-medium">FormaPago</th>
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
                    <th className="px-2 py-1.5 font-medium">Deducible</th>
                    
                    {/* Columnas de deducibilidad reducidas */}
                    <th className="px-2 py-1.5 font-medium text-center">Mes Ded.</th>
                    <th className="px-2 py-1.5 font-medium text-right">Gravado</th>
                    <th className="px-2 py-1.5 font-medium text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMonths.length > 0 ? (
                    sortedMonths.map(month => (
                      <React.Fragment key={month}>
                        <tr className="bg-gray-200 dark:bg-gray-700">
                          <td colSpan={showRegimeFiscalDetails && showMetodoPagoDetails ? 23 : 
                                      showRegimeFiscalDetails ? 21 : 
                                      showMetodoPagoDetails ? 20 : 18} 
                              className="px-2 py-1 font-medium">
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
                            {/* Eliminadas columnas "Mes" y "No." */}
                            {/* Ocultado: TipoDocumento */}
                            {/* Ocultado: RFC Receptor */}
                            {/* Ocultado: Receptor */}
                            {/* Ocultado: DomicilioFiscalReceptor */}
                            {/* Ocultado: RegimenFiscalReceptor */}
                            <td className="px-2 py-1 align-middle">{invoice.cfdiUsage}</td>
                            <td className="px-2 py-1 align-middle">{invoice.issuerRfc}</td>
                            <td className="px-2 py-1 align-middle whitespace-nowrap overflow-hidden max-w-[150px]">
                              <div className="overflow-hidden text-ellipsis" title={invoice.issuerName}>
                                {invoice.issuerName}
                              </div>
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
                            <td className="px-2 py-1 align-middle">
                              <div className="flex items-center gap-1">
                                <Checkbox
                                  className="h-3 w-3"
                                  checked={invoice.isDeductible}
                                  onClick={(e) => handleCheckboxClick(e as React.MouseEvent, invoice)}
                                  onCheckedChange={(checked: boolean) => {
                                    const updatedInvoice = {
                                      ...invoice,
                                      isDeductible: checked,
                                      deductibilityType: 'full' as 'full' | 'partial' | 'fixed' | 'none'
                                    };
                                    handleUpdateInvoice(updatedInvoice);
                                  }}
                                />
                                
                                {invoice.isDeductible && getDeductibilityDisplay(invoice) && (
                                  <span className="text-xxs text-gray-600">{getDeductibilityDisplay(invoice)}</span>
                                )}
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                                      <MoreHorizontal className="h-2 w-2" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="text-xs">
                                    <DropdownMenuLabel className="text-xs">Configuración de deducibilidad</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      openDeductibilityEditor(invoice);
                                    }}>
                                      <Pencil className="h-3 w-3 mr-1" /> Configuración avanzada
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      const updatedInvoice = {
                                        ...invoice,
                                        isDeductible: true,
                                        deductibilityType: 'full' as 'none' | 'full' | 'partial' | 'fixed'
                                      };
                                      handleUpdateInvoice(updatedInvoice);
                                    }}>
                                      <Check className="h-3 w-3 mr-1" /> Deducible (100%)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      const updatedInvoice = {
                                        ...invoice,
                                        isDeductible: false,
                                        deductibilityType: 'none' as 'none' | 'full' | 'partial' | 'fixed'
                                      };
                                      handleUpdateInvoice(updatedInvoice);
                                    }}>
                                      <X className="h-3 w-3 mr-1" /> No deducible
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                            
                            {/* Solo mostrar Mes Ded. y Gravado como solicitado */}
                            <td className="px-2 py-1 align-middle text-center">
                              {invoice.isDeductible ? (
                                <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                  <Select
                                    value={invoice.deductionMonth ? getMonthAbbreviation(invoice.deductionMonth) : getMonthAbbreviation(getMonth(invoice.date))}
                                    onValueChange={(value) => {
                                      const monthIndex = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC', 'ANUAL'].indexOf(value) + 1;
                                      const updatedInvoice = {
                                        ...invoice,
                                        deductionMonth: monthIndex
                                      };
                                      handleUpdateInvoice(updatedInvoice);
                                    }}
                                  >
                                    <SelectTrigger className="w-[60px] h-[20px] text-xs">
                                      <SelectValue placeholder="Mes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC', 'ANUAL'].map((monthAbbr, index) => (
                                        <SelectItem key={index} value={monthAbbr} className="text-xs">
                                          {monthAbbr}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-2 py-1 align-middle text-right">
                              {invoice.isDeductible ? (
                                `$${(invoice.deductibleTaxedAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                              ) : '-'}
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
                      <td colSpan={showRegimeFiscalDetails && showMetodoPagoDetails ? 23 : 
                                  showRegimeFiscalDetails ? 21 : 
                                  showMetodoPagoDetails ? 20 : 18} 
                          className="px-2 py-4 text-center text-gray-500 text-xs">
                        No se encontraron facturas CFDI emitidas para el año {year} con los filtros actuales
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
        showDeductibilityEditor={showDeductibilityEditor}
        onDeductibilityEditorClose={() => setShowDeductibilityEditor(false)}
      />
    </div>
  );
}
