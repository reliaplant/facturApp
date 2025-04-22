"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { FixedAssetService } from "@/services/fixed-asset-service";
import { FixedAsset } from "@/models/FixedAsset";
import { formatCurrency } from "@/lib/utils";

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

  // Cargar activos inicialmente
  useEffect(() => {
    loadAssets();
  }, [clientId, selectedYear]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="">Activos Fijos</h2>
        <div className="flex space-x-2">
          <FixedAssetDialog clientId={clientId} onSuccess={loadAssets} />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="">
          <div className="w-full overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="">Fecha Compra</th>
                  <th className="">Nombre</th>
                  <th className="">Tipo</th>
                  <th className="">Valor de compra</th>
                  <th className="">Valor deducible</th>
                  <th className="">Meses (Total/Actual)</th>
                  <th className="">Dep. Acumulada</th>
                  <th className="">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-gray-500">Cargando activos...</td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-gray-500">Este cliente no tiene activos registrados</td>
                  </tr>
                ) : (
                  assets.map((asset) => {
                    // Calcular los meses totales de depreciación
                    let totalMonths = asset.usefulLifeMonths || 60; // Valor predeterminado 60 meses (5 años)
                    const elapsedMonths = calculateElapsedMonths(
                      asset.purchaseDate, 
                      asset.disposalDate
                    );
                    
                    // Usar el valor deducible real si está disponible
                    const deductibleValue = asset.deductibleValue !== undefined ? 
                      asset.deductibleValue : asset.currentValue;
                    
                    return (
                      <tr key={asset.id} className="">
                        <td className="">{formatDate(asset.purchaseDate)}</td>
                        <td className="">{asset.name}</td>
                        <td className="">
                            <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                            {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)}
                            </span>
                        </td>
                        <td className="">{formatCurrency(asset.cost)}</td>
                        <td className="">{formatCurrency(deductibleValue)}</td>
                        <td className="">{totalMonths} / {elapsedMonths}</td>
                        <td className="">{formatCurrency(asset.accumulatedDepreciation)}</td>
                        <td className="">
                          <div className="flex space-x-2">
                            <FixedAssetDialog asset={asset} clientId={clientId} onSuccess={loadAssets} />
                            <DeleteFixedAssetDialog asset={asset} onAssetDeleted={loadAssets} />
                            {asset.hasInvoiceFile && (
                              <Button variant="ghost" size="sm">
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
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}