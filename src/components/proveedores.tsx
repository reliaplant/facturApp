"use client";
import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, X, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { invoiceService } from '@/services/invoice-service';

// Simple supplier interface matching what's in the service
interface Supplier {
  id?: string;
  rfc: string;
  name: string;
  isDeductible: boolean;
  lastUpdated: string;
  invoiceCount?: number;
}

interface ProveedoresProps {
  clientId: string;
  onSupplierUpdated?: () => void; // Add callback prop
}

export function Proveedores({ clientId, onSupplierUpdated }: ProveedoresProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const [updatingRfc, setUpdatingRfc] = useState<string | null>(null);
  
  // Load suppliers on mount
  useEffect(() => {
    loadSuppliers();
  }, [clientId]);
  
  // Filter suppliers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSuppliers(suppliers);
    } else {
      const normalizedSearch = searchTerm.toLowerCase();
      setFilteredSuppliers(
        suppliers.filter(
          supplier => 
            supplier.name.toLowerCase().includes(normalizedSearch) ||
            supplier.rfc.toLowerCase().includes(normalizedSearch)
        )
      );
    }
  }, [suppliers, searchTerm]);
  
  // Load suppliers from Firestore
  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const loadedSuppliers = await invoiceService.getSuppliers(clientId);
      // Sort by creation date (newest first)
      // For suppliers, lastUpdated effectively represents when they were first added
      setSuppliers(loadedSuppliers.sort((a, b) => {
        // Safely handle cases where lastUpdated might be missing
        const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        return dateB - dateA; // Descending order (newest first)
      }));
    } catch (error) {
      console.error("Error loading suppliers:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los proveedores",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Sync suppliers from invoices
  const syncSuppliers = async () => {
    setIsSyncing(true);
    try {
      // Sync suppliers from invoices
      const result = await invoiceService.syncSuppliersFromInvoices(clientId);
      
      // Show results
      toast({
        title: "Sincronización completada",
        description: `Proveedores: ${result.added} nuevos, ${result.updated} actualizados, ${result.unchanged} sin cambios.`,
      });
      
      // Reload suppliers
      loadSuppliers();
    } catch (error) {
      console.error("Error syncing suppliers:", error);
      toast({
        title: "Error",
        description: "No se pudieron sincronizar los proveedores",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Toggle deductible status - modified to NOT trigger invoice evaluation
  const toggleDeductible = async (rfc: string, currentStatus: boolean) => {
    try {
      // Track which supplier is being updated
      setUpdatingRfc(rfc);
      
      // Optimistic update just for the UI
      setSuppliers(suppliers.map(supplier => 
        supplier.rfc === rfc 
          ? { ...supplier, isDeductible: !currentStatus } 
          : supplier
      ));
      
      // IMPORTANT: Use the new function that ONLY updates supplier status
      // and does NOT evaluate invoices
      await invoiceService.updateSupplierDeductibleOnly(clientId, rfc, !currentStatus);
      
      // Still notify parent that supplier data changed
      if (onSupplierUpdated) {
        console.log("🔔 Notifying parent of supplier update (without invoice evaluation)");
        onSupplierUpdated();
      }
      
      // Update toast message to clarify that invoices were NOT updated
      toast({
        title: "Proveedor actualizado",
        description: `Estado deducible cambiado a ${!currentStatus ? 'Deducible' : 'No Deducible'}. Pulse el botón "Evaluar Deducibilidad" para actualizar facturas.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error toggling deductible status:", error);
      
      // Revert optimistic update
      setSuppliers(suppliers.map(supplier => 
        supplier.rfc === rfc 
          ? { ...supplier, isDeductible: currentStatus } 
          : supplier
      ));
      
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado deducible del proveedor",
        variant: "destructive",
      });
    } finally {
      // Clear updating state
      setUpdatingRfc(null);
    }
  };
  
  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="bg-gray-100 px-7 py-2 border-b border-gray-300 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium whitespace-nowrap">
            Proveedores
          </h2>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="py-1 pl-8 pr-2 text-xs border rounded-md w-60 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Button 
              variant="black" 
              size="sm"
              onClick={syncSuppliers}
              disabled={isSyncing}
              className="flex items-center whitespace-nowrap"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Sincronizando..." : "Sincronizar Proveedores"}
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto">
            <table className="w-full text-xs relative">
              <thead className="sticky top-0 z-20">
                <tr className="after:absolute after:content-[''] after:h-[4px] after:left-0 after:right-0 after:bottom-0 after:shadow-[0_4px_8px_rgba(0,0,0,0.15)]">
                  <th className="pl-7 px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">RFC</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Nombre</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center">Facturas</th>
                  <th className="px-2 py-1.5 pr-7 font-medium text-center bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Deducible</th>
                </tr>
              </thead>
              <tbody className="mt-1">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-4 text-center text-gray-500 text-xs">
                      Cargando proveedores...
                    </td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-4 text-center text-gray-500 text-xs">
                      {suppliers.length === 0 
                        ? 'No hay proveedores registrados. Haga clic en "Sincronizar Proveedores" para extraerlos de sus facturas.'
                        : 'No se encontraron proveedores con ese término de búsqueda.'}
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr 
                      key={supplier.rfc} 
                      className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="pl-7 px-2 py-1.5 align-middle font-mono">
                        {supplier.rfc}
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        {supplier.name}
                      </td>
                      <td className="px-2 py-1.5 align-middle text-center">
                        {supplier.invoiceCount || 0}
                      </td>
                      <td className="px-2 py-1.5 pr-7 align-middle text-center">
                        <Badge 
                          variant="outline"
                          className={`cursor-pointer ${
                            supplier.isDeductible 
                              ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100' 
                              : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                          }`}
                          onClick={() => updatingRfc !== supplier.rfc && toggleDeductible(supplier.rfc, supplier.isDeductible)}
                          // Add a disabled style if it's currently updating
                          style={updatingRfc === supplier.rfc ? { opacity: 0.5, cursor: 'wait' } : undefined}
                        >
                          <span className="flex items-center">
                            {supplier.isDeductible ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Deducible
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3 mr-1" />
                                No Deducible
                              </>
                            )}
                          </span>
                        </Badge>
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
}

export default Proveedores;
