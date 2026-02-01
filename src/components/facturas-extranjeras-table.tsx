import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FacturaExtranjera } from "@/models/facturaManual";
import { facturasExtranjerasService } from "@/services/facturas-extranjeras-service";
import { FacturasExtranjerasModal } from "./facturas-extranjeras-modal";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { categoryService } from "@/services/category-service";
import { Category } from "@/models/Category";
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
    } catch (error) {
      console.error('Error loading foreign invoices:', error);
    } finally {
      setLoading(false);
    }
  };
  
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
        
        // Add to monthly total only if deducible
        if (factura.esDeducible !== false) {
          monthTotals[month] += factura.totalMXN;
        }
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

  // Toggle deducible status
  const toggleDeducible = async (e: React.MouseEvent, factura: FacturaExtranjera) => {
    e.stopPropagation(); // Prevent row click
    if (factura.locked) return; // Don't allow changes if locked
    try {
      const newDeducibleStatus = factura.esDeducible === false ? true : false;
      await facturasExtranjerasService.toggleDeducibleFacturaExtranjera(clientId, factura.id, newDeducibleStatus);
      loadFacturas();
    } catch (error) {
      console.error('Error toggling deducible status:', error);
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
          <h2 className="text-sm font-medium whitespace-nowrap">
            Facturas Extranjeras {year}
          </h2>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleAddNew} 
              size="xs" 
              className="text-xs bg-black hover:bg-gray-800 text-white"
            >
              <Plus className="h-3 w-3 mr-1" /> Agregar
            </Button>
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
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Emisor / País</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Categoría</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center">Deducible</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Moneda / TC</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Monto MXN</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">IVA</th>
                  <th className="pr-7 px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Total MXN</th>
                  
                </tr>
              </thead>
              <tbody className="mt-1">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-2 py-4 text-center text-gray-500 text-xs">
                      Cargando facturas extranjeras...
                    </td>
                  </tr>
                ) : sortedMonths.length > 0 ? (
                  sortedMonths.map((month) => (
                    <React.Fragment key={month}>
                      {/* Month Header */}
                      <tr className="bg-gray-200 dark:bg-gray-700">
                        <td colSpan={10} className="pl-7 px-2 py-1.5 font-medium text-xs">
                          {getMonthName(month)}
                        </td>
                      </tr>
                      
                      {/* Invoices for this month */}
                      {facturasByMonth[month].map((factura) => (
                        <tr
                          key={factura.id}
                          className={`border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${factura.locked ? 'opacity-80' : ''}`}
                          onClick={() => handleEdit(factura)}
                        >
                          {/* Lock Button */}
                          <td className="pl-7 px-2 py-1 align-middle text-center h-[64px]">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-5 w-5 ${!factura.locked ? 'bg-red-50 hover:bg-red-100' : ''}`}
                              onClick={(e) => { e.stopPropagation(); toggleLock(factura); }}
                            >
                              {factura.locked ? 
                                <Lock className="h-3 w-3 text-gray-400" /> : 
                                <Unlock className="h-3 w-3 text-red-500" />}
                            </Button>
                          </td>
                          
                          {/* Fecha */}
                          <td className="px-2 py-1 align-middle">
                            <span className="text-xs">{formatDate(factura.fecha)}</span>
                          </td>
                          
                          {/* Emisor + País */}
                          <td className="px-2 py-1 align-middle">
                            <div className="flex flex-col">
                              <span className="truncate max-w-[25ch] text-xs">{factura.emisor}</span>
                              <span className="text-[10px] text-purple-500">{factura.pais}</span>
                            </div>
                          </td>
                          
                          {/* Categoría */}
                          <td className="px-2 py-1 align-middle">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              {getCategoryName(factura.categoria)}
                            </span>
                          </td>
                          
                          {/* Deducible */}
                          <td className="px-2 py-1 align-middle text-center">
                            <Badge 
                              variant="outline" 
                              className={`cursor-pointer hover:opacity-80 transition-opacity ${
                                factura.esDeducible !== false
                                  ? 'bg-green-50 text-green-700 border-green-300' 
                                  : 'bg-red-50 text-red-700 border-red-300'
                              } ${factura.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                              onClick={(e) => toggleDeducible(e, factura)}
                            >
                              {factura.esDeducible !== false ? 'Sí' : 'No'}
                            </Badge>
                          </td>
                          
                          {/* Moneda + Tipo Cambio */}
                          <td className="px-2 py-1 align-middle">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium">{factura.moneda}</span>
                              <span className="text-[10px] text-purple-500">TC: {factura.tipoCambio.toFixed(2)}</span>
                            </div>
                          </td>
                          
                          {/* Monto */}
                          <td className="px-2 py-1 align-middle text-right">
                            <span className="text-xs">
                              ${factura.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          
                          {/* IVA */}
                          <td className="px-2 py-1 align-middle text-right">
                            <span className="text-xs text-gray-500">
                              ${factura.iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          
                          {/* Total MXN */}
                          <td className="pr-7 px-2 py-1 align-middle text-right">
                            <span className="text-xs font-medium">
                              ${factura.totalMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      ))}
                      
                      {/* Monthly total row */}
                      <tr className="bg-gray-100 dark:bg-gray-800 font-medium border-t border-gray-300 dark:border-gray-600">
                        <td colSpan={6} className="px-7 py-1.5 text-right text-gray-500 text-xs">Total del mes:</td>
                        <td colSpan={3} className="pr-7 px-2 py-1.5 text-right font-medium text-xs">
                          ${monthlyTotals[month].toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-2 py-4 text-center text-gray-500 text-xs">
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
        onDelete={(id) => {
          setFacturaToDelete(id);
          setDeleteDialogOpen(true);
        }}
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
