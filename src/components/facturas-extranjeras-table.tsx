import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FacturaExtranjera } from "@/models/facturaManual";
import { facturasExtranjerasService } from "@/services/facturas-extranjeras-service";
import { FacturasExtranjerasModal } from "./facturas-extranjeras-modal";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { categoryService } from "@/services/category-service";
import { Category } from "@/models/Category";
import { fiscalDataService } from '@/services/fiscal-data-service';
import { YearTaxData } from '@/models/fiscalData';
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

interface FacturasExtranjerasTableProps {
  clientId: string;
  year: number;
}

export function FacturasExtranjerasTable({ clientId, year }: FacturasExtranjerasTableProps) {
  // Estado para manejar los datos
  const [facturas, setFacturas] = useState<FacturaExtranjera[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estado para el modal de agregar/editar factura
  const [modalOpen, setModalOpen] = useState(false);
  const [currentFactura, setCurrentFactura] = useState<FacturaExtranjera | undefined>(undefined);
  
  // Estado para el diálogo de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [facturaToDelete, setFacturaToDelete] = useState<string | null>(null);

  // Cargar facturas
  const loadFacturas = async () => {
    setLoading(true);
    try {
      const data = await facturasExtranjerasService.getFacturasExtranjeras(clientId, year);
      setFacturas(data);
      setTotalAmount(facturasExtranjerasService.calculateTotal(data));
      
      // Update fiscal data when facturas are loaded
      updateFiscalData(data);
    } catch (error) {
      console.error('Error loading foreign invoices:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to get deduction month from date
  const getDeductionMonthFromDate = (dateString: string): number => {
    try {
      return new Date(dateString).getMonth() + 1;
    } catch (error) {
      return 0; // Default to 0 if invalid date
    }
  };
  
  // Function to update fiscal data with manual deductions
  const updateFiscalData = async (invoiceData: FacturaExtranjera[] = facturas) => {
    if (!clientId || !year) return;
    
    // Create a record to store monthly deduction totals for all 12 months
    const monthlyDeductions: Record<string, number> = {};
    
    // Initialize all months with zero values (1-12)
    for (let month = 1; month <= 12; month++) {
      monthlyDeductions[month.toString()] = 0;
    }
    
    // Process each invoice and calculate totals per month
    invoiceData.forEach(factura => {
      try {
        // Get deduction month from date
        const month = new Date(factura.fecha).getMonth() + 1;
        
        if (month >= 1 && month <= 12) {
          // Add the invoice amount to the month's total
          const monthKey = month.toString();
          monthlyDeductions[monthKey] += factura.totalMXN;
        }
      } catch (e) { 
        console.error('Invalid date in invoice:', e); 
      }
    });
    
    // Debounce the update to avoid too many writes
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(async () => {
      try {
        // Update fiscal summary document with manual deduction data
        await fiscalDataService.updateFiscalSummaryFields(clientId, year, (existingData) => {
          // Create base data if none exists
          const baseData: YearTaxData = existingData || {
            clientId,
            year,
            months: {}
          };
          
          // Ensure months object exists
          if (!baseData.months) baseData.months = {};
          
          // Update EVERY month (1-12) with its calculated totals
          Object.entries(monthlyDeductions).forEach(([month, deduction]) => {
            // Create month object if it doesn't exist
            if (!baseData.months[month]) {
              baseData.months[month] = {};
            }
            
            // Update ONLY the deduccionFacturasManual field, preserving all other fields
            baseData.months[month] = {
              ...baseData.months[month],
              deduccionFacturasManual: deduction
            };
          });
          
          // Set lastUpdated timestamp
          baseData.lastUpdated = new Date().toISOString();
          
          return baseData;
        });
        
        console.log("Updated fiscal data with manual deductions for all months", monthlyDeductions);
      } catch (error) {
        console.error("Error updating fiscal data with manual deductions:", error);
      }
    }, 1000); // 1 second debounce
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);
  
  // Update fiscal data when facturas change
  useEffect(() => {
    if (facturas.length > 0) {
      updateFiscalData();
    }
  }, [facturas, clientId, year]);

  // Cargar datos al inicio y cuando cambie el año o cliente
  useEffect(() => {
    loadFacturas();
    
    // Cargar categorías
    async function loadCategories() {
      try {
        const fetchedCategories = await categoryService.getAllCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    }
    
    loadCategories();
  }, [clientId, year]);

  // Function to get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };
  
  // Group invoices by month
  const { facturasByMonth, sortedMonths, monthlyTotals } = useMemo(() => {
    // Group by month
    const byMonth: Record<number, FacturaExtranjera[]> = {};
    const monthTotals: Record<number, number> = {};
    
    // Sort facturas by date
    const sortedFacturas = [...facturas].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );
    
    // Group by month
    sortedFacturas.forEach(factura => {
      try {
        const month = new Date(factura.fecha).getMonth() + 1;
        if (!byMonth[month]) {
          byMonth[month] = [];
          monthTotals[month] = 0;
        }
        byMonth[month].push(factura);
        
        // Add to monthly total (all invoices are now deductible)
        monthTotals[month] += factura.totalMXN;
      } catch (e) { /* Skip invalid dates */ }
    });
    
    // Get sorted month numbers
    const months = Object.keys(byMonth).map(Number).sort((a, b) => a - b);
    
    return { facturasByMonth: byMonth, sortedMonths: months, monthlyTotals: monthTotals };
  }, [facturas]);

  // Abrir modal para agregar nueva factura
  const handleAddNew = () => {
    setCurrentFactura(undefined);
    setModalOpen(true);
  };

  // Abrir modal para editar factura existente
  const handleEdit = (factura: FacturaExtranjera) => {
    setCurrentFactura(factura);
    setModalOpen(true);
  };

  // Eliminar factura
  const handleDelete = async () => {
    if (!facturaToDelete) return;
    
    try {
      await facturasExtranjerasService.deleteFacturaExtranjera(clientId, facturaToDelete);
      loadFacturas(); // This will also trigger fiscal data update
    } catch (error) {
      console.error('Error deleting invoice:', error);
    } finally {
      setFacturaToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  // Confirmar eliminación
  const confirmDelete = (id: string) => {
    setFacturaToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Toggle lock status
  const toggleLock = async (factura: FacturaExtranjera) => {
    try {
      const newLockedStatus = !factura.locked;
      await facturasExtranjerasService.toggleLockFacturaExtranjera(clientId, factura.id, newLockedStatus);
      loadFacturas(); // This will also trigger fiscal data update
    } catch (error) {
      console.error('Error toggling lock status:', error);
    }
  };

  // Formatear la fecha
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: es });
    } catch (error) {
      return 'Fecha inválida';
    }
  };
  
  // Obtener el nombre del mes
  const getMonthName = (month: number) => {
    try {
      return format(new Date(year, month - 1, 1), 'MMMM', { locale: es });
    } catch (error) {
      return 'Mes inválido';
    }
  };

  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 border-b">
        {/* Header */}
        <div className="bg-gray-100 px-7 py-2 border-b border-gray-300 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium whitespace-nowrap">
            Facturas Extranjeras {year}
          </h2>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleAddNew} 
              variant="ghost" 
              size="sm" 
              className="text-xs"
            >
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
            <Badge variant="outline" className="text-sm py-0.5 whitespace-nowrap">
              Total: ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
            </Badge>
          </div>
        </div>

        {/* Table */}
        <div className="relative">
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto">
            <table className="w-full text-xs relative">
              <thead className="sticky top-0 z-20">
                <tr className="after:absolute after:content-[''] after:h-[4px] after:left-0 after:right-0 after:bottom-0 after:shadow-[0_4px_8px_rgba(0,0,0,0.15)]">
                  <th className="pl-7 px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center w-12">Lock</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Fecha</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Emisor</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Categoría</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">País</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Moneda</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-right">Tipo Cambio</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Monto</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">IVA</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Total MXN</th>
                  {/* Removed "Mes Deducción" column */}
                  <th className="pr-7 px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="mt-1">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-2 py-4 text-center text-gray-500 text-xs">
                      Cargando facturas extranjeras...
                    </td>
                  </tr>
                ) : sortedMonths.length > 0 ? (
                  sortedMonths.map((month) => (
                    <React.Fragment key={month}>
                      {/* Month Header */}
                      <tr className="bg-gray-200 dark:bg-gray-700">
                        <td colSpan={11} className="pl-7 px-2 py-1.5 font-medium">
                          {getMonthName(month)}
                        </td>
                      </tr>
                      
                      {/* Invoices for this month */}
                      {facturasByMonth[month].map((factura) => (
                        <tr
                          key={factura.id}
                          className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="pl-7 px-2 py-1 align-middle text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${!factura.locked ? 'bg-red-50 hover:bg-red-100' : ''}`}
                              onClick={() => toggleLock(factura)}
                            >
                              {factura.locked ? 
                                <Lock className="h-4 w-4 text-gray-400" /> : 
                                <Unlock className="h-4 w-4 text-red-500" />}
                            </Button>
                          </td>
                          <td className="px-2 py-1 align-middle">{formatDate(factura.fecha)}</td>
                          <td className="px-2 py-1 align-middle">{factura.emisor}</td>
                          <td className="px-2 py-1 align-middle">{getCategoryName(factura.categoria)}</td>
                          <td className="px-2 py-1 align-middle">{factura.pais}</td>
                          <td className="px-2 py-1 align-middle">{factura.moneda}</td>
                          <td className="px-2 py-1 align-middle text-right">{factura.tipoCambio.toFixed(2)}</td>
                          <td className="px-2 py-1 align-middle text-right">
                            ${factura.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-2 py-1 align-middle text-right">
                            ${factura.iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-2 py-1 align-middle text-right">
                            ${factura.totalMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="pr-7 px-2 py-1 align-middle text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEdit(factura)}
                                disabled={factura.locked}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-700"
                                onClick={() => confirmDelete(factura.id)}
                                disabled={factura.locked}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      
                      {/* Monthly total row - simplified as all invoices are now deductible */}
                      <tr className="bg-gray-100 dark:bg-gray-800 font-medium border-t border-gray-300 dark:border-gray-600">
                        <td colSpan={9} className="px-7 py-1.5 text-right text-gray-500">Total del mes:</td>
                        <td className="px-2 py-1.5 text-right font-medium">
                          ${monthlyTotals[month].toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="px-2 py-4 text-center text-gray-500 text-xs">
                      No se encontraron facturas extranjeras para el año {year}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Modal for adding/editing invoices */}
      <FacturasExtranjerasModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadFacturas}
        clientId={clientId}
        factura={currentFactura}
      />
      
      {/* Confirmation dialog for deletion */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente esta factura extranjera.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 text-white hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
