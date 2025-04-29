"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { FixedAssetService } from "@/services/fixed-asset-service";
import { FixedAsset } from "@/models/FixedAsset";
import { Badge } from "@/components/ui/badge";

// Import components
import { FixedAssetDialog } from "./fixed-assets/FixedAssetDialog";
import { DeleteFixedAssetDialog } from "./fixed-assets/DeleteFixedAssetDialog";
import { formatDate } from "./fixed-assets/utils";

const fixedAssetService = new FixedAssetService();

export function FixedAssetsTable({ clientId, selectedYear }: { clientId: string, selectedYear: number }) {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cargar activos fijos
  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const clientAssets = await fixedAssetService.getFixedAssetsByClient(clientId);
      setAssets(clientAssets);
    } catch (error) {
      console.error("Error loading fixed assets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular meses transcurridos considerando la fecha de inicio de depreciación si existe
  const calculateElapsedMonths = (purchaseDate: string, depreciationStartDate?: string, disposalDate?: string): number => {
    // Usar la fecha de inicio de depreciación si está definida, sino usar la fecha de compra
    const startDate = depreciationStartDate ? new Date(depreciationStartDate) : new Date(purchaseDate);
    const end = disposalDate ? new Date(disposalDate) : new Date();
    
    const yearDiff = end.getFullYear() - startDate.getFullYear();
    const monthDiff = end.getMonth() - startDate.getMonth();
    
    let elapsedMonths = (yearDiff * 12) + monthDiff;
    if (end.getDate() < startDate.getDate()) {
      elapsedMonths -= 1;
    }
    
    return Math.max(0, elapsedMonths);
  };

  // Calcular totales para el header
  const totalCost = assets.reduce((sum, asset) => sum + asset.cost, 0);
  const totalDeductible = assets.reduce((sum, asset) => {
    const deductibleValue = asset.deductibleValue !== undefined ? asset.deductibleValue : asset.currentValue;
    return sum + deductibleValue;
  }, 0);

  // Cargar activos inicialmente
  useEffect(() => {
    loadAssets();
  }, [clientId, selectedYear]);

  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 border-b">
        {/* Header - styled like incomes-table */}
        <div className="bg-gray-100 px-7 py-2 border-b border-gray-300 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium whitespace-nowrap">
            Activos Fijos {selectedYear}
          </h2>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm py-0.5 whitespace-nowrap">
              Total: ${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </Badge>
            
            <FixedAssetDialog clientId={clientId} onSuccess={loadAssets} />
          </div>
        </div>

        {/* Table - styled like incomes-table */}
        <div className="relative">
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto">
            <table className="w-full text-xs relative">
              <thead className="sticky top-0 z-20">
                <tr className="after:absolute after:content-[''] after:h-[4px] after:left-0 after:right-0 after:bottom-0 after:shadow-[0_4px_8px_rgba(0,0,0,0.15)]">
                  <th className="pl-7 px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Fecha Compra</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Nombre</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Tipo</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Valor de compra</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Valor deducible</th>
                  <th className="px-2 py-1.5 font-medium text-center bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Meses (Total/Actual)</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Dep. Mensual</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Dep. Acumulada</th>
                  <th className="pr-7 px-2 py-1.5 font-medium text-center bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="mt-1">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-2 py-4 text-center text-gray-500 text-xs">
                      Cargando activos fijos...
                    </td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-2 py-4 text-center text-gray-500 text-xs">
                      Este cliente no tiene activos fijos registrados
                    </td>
                  </tr>
                ) : (
                  assets.map((asset) => {
                    // Calcular los meses totales de depreciación
                    let totalMonths = asset.usefulLifeMonths || 60; // Valor predeterminado 60 meses (5 años)
                    const elapsedMonths = calculateElapsedMonths(
                      asset.purchaseDate, 
                      asset.depreciationStartDate,
                      asset.disposalDate
                    );
                    
                    // Usar el valor deducible real si está disponible
                    const deductibleValue = asset.deductibleValue !== undefined ? 
                      asset.deductibleValue : asset.currentValue;
                    
                    return (
                      <tr 
                        key={asset.id} 
                        className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="pl-7 px-2 py-1 align-middle">
                          {formatDate(asset.purchaseDate)}
                        </td>
                        <td className="px-2 py-1 align-middle">
                          <div className="flex flex-col">
                            <span>{asset.name}</span>
                            {asset.description && (
                              <span className="text-gray-500 text-xs">{asset.description}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1 align-middle">
                          <Badge 
                            variant="outline" 
                            className="bg-gray-50 text-gray-700 border-gray-300"
                          >
                            {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-2 py-1 align-middle text-right">
                          ${asset.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-1 align-middle text-right">
                          ${deductibleValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-1 align-middle text-center">
                          <span className="font-medium">{totalMonths}</span> / <span>{elapsedMonths}</span>
                        </td>
                        <td className="px-2 py-1 align-middle text-right font-medium">
                          ${(asset.monthlyDepreciation || fixedAssetService.calculateMonthlyDepreciation(asset)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-1 align-middle text-right font-medium">
                          ${asset.accumulatedDepreciation.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="pr-7 px-2 py-1 align-middle">
                          <div className="flex justify-center space-x-1">
                            <FixedAssetDialog asset={asset} clientId={clientId} onSuccess={loadAssets} />
                            <DeleteFixedAssetDialog asset={asset} onAssetDeleted={loadAssets} />
                            {asset.hasInvoiceFile && (
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-800 font-medium border-t border-gray-300 dark:border-gray-600">
                <tr>
                  <td colSpan={3} className="pl-7 px-2 py-1.5 text-left">Totales</td>
                  <td className="px-2 py-1.5 text-right">
                    ${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    ${totalDeductible.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-1.5 text-center"></td>
                  <td className="px-2 py-1.5 text-right">
                    ${assets.reduce((sum, asset) => sum + (asset.monthlyDepreciation || fixedAssetService.calculateMonthlyDepreciation(asset)), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    ${assets.reduce((sum, asset) => sum + asset.accumulatedDepreciation, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="pr-7 px-2 py-1.5"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}