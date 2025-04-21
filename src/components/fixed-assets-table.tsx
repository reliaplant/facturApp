"use client";
import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody,
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { FixedAssetService } from "@/services/fixed-asset-service";
import { FixedAsset } from "@/models/FixedAsset";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

// Import components from fixed-assets directory
import { AssetStatusBadge } from "./fixed-assets/AssetStatusBadge";
import { DepreciationHistoryDialog } from "./fixed-assets/DepreciationHistoryDialog";
import { AddFixedAssetDialog } from "./fixed-assets/AddFixedAssetDialog";
import { EditFixedAssetDialog } from "./fixed-assets/EditFixedAssetDialog";
import { DeleteFixedAssetDialog } from "./fixed-assets/DeleteFixedAssetDialog";
import { AssetSummaryCards } from "./fixed-assets/AssetSummaryCards";
import { formatDate } from "./fixed-assets/utils";

const fixedAssetService = new FixedAssetService();

// Componente principal
export function FixedAssetsTable({ clientId, selectedYear }: { clientId: string, selectedYear: number }) {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState<boolean>(false);
  const [annualDepreciation, setAnnualDepreciation] = useState<number>(0);

  // Cargar activos fijos al inicializar
  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const clientAssets = await fixedAssetService.getFixedAssetsByClient(clientId);
      setAssets(clientAssets);
      calculateAnnualDepreciationForYear(clientAssets, selectedYear);
    } catch (error) {
      console.error("Error loading fixed assets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular la depreciación anual para el año seleccionado
  const calculateAnnualDepreciationForYear = (assetsList: FixedAsset[], year: number) => {
    let totalDepreciation = 0;
    
    // Para cada activo, calcular su depreciación anual para el año seleccionado
    assetsList.forEach(asset => {
      // Solo considerar activos que están activos o que fueron dados de baja/vendidos en el año seleccionado
      const isActiveInSelectedYear = asset.status === 'active' || 
        (asset.disposalDate && new Date(asset.disposalDate).getFullYear() === year);
      
      if (isActiveInSelectedYear) {
        // Calcular depreciación mensual y multiplicar por los meses aplicables en el año
        const purchaseDate = new Date(asset.purchaseDate);
        const purchaseYear = purchaseDate.getFullYear();
        const purchaseMonth = purchaseDate.getMonth();
        
        let monthsToDepreciate = 12;
        
        // Si el activo fue comprado en el año seleccionado, ajustar los meses
        if (purchaseYear === year) {
          monthsToDepreciate = 12 - purchaseMonth;
        }
        
        // Si el activo fue dado de baja en el año seleccionado, ajustar los meses
        if (asset.disposalDate) {
          const disposalDate = new Date(asset.disposalDate);
          if (disposalDate.getFullYear() === year) {
            monthsToDepreciate = disposalDate.getMonth() + 1;
          }
        }
        
        // Usar el servicio para calcular la depreciación mensual
        const monthlyDepreciation = fixedAssetService.calculateMonthlyDepreciation(asset);
        totalDepreciation += monthlyDepreciation * monthsToDepreciate;
      }
    });
    
    setAnnualDepreciation(totalDepreciation);
  };

  // Actualizar valores de depreciación con la fecha actual
  const updateCurrentDepreciation = async () => {
    setIsUpdating(true);
    try {
      const now = new Date();
      setReferenceDate(now);
      
      // Actualizar los valores de depreciación para cada activo con la fecha actual
      const updatedAssets = assets.map(asset => {
        // Usar el servicio para calcular la depreciación actual
        const { currentValue, accumulatedDepreciation } = fixedAssetService.calculateCurrentDepreciation(asset, now);
        return {
          ...asset,
          currentValue,
          accumulatedDepreciation
        };
      });
      
      setAssets(updatedAssets);
      calculateAnnualDepreciationForYear(updatedAssets, selectedYear);
      
      toast({
        title: "Valores actualizados",
        description: `Depreciación calculada al ${now.toLocaleDateString('es-MX')}`,
      });
    } catch (error) {
      console.error("Error updating depreciation values:", error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los valores de depreciación",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Activar/desactivar actualizaciones automáticas
  const toggleAutoUpdate = () => {
    setAutoUpdateEnabled(prev => !prev);
    if (!autoUpdateEnabled) {
      toast({
        title: "Actualización automática activada",
        description: "Los valores se actualizarán cada minuto",
      });
    }
  };

  // Efecto para cargar activos inicialmente
  useEffect(() => {
    loadAssets();
  }, [clientId, selectedYear]);

  // Efecto para configurar actualización automática
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (autoUpdateEnabled && assets.length > 0) {
      // Configurar un intervalo para actualizar cada minuto
      intervalId = setInterval(() => {
        const now = new Date();
        setReferenceDate(now);
        
        // Actualizar valores sin mostrar toast para no interrumpir al usuario
        const updatedAssets = assets.map(asset => {
          // Usar el servicio para calcular la depreciación actual
          const { currentValue, accumulatedDepreciation } = fixedAssetService.calculateCurrentDepreciation(asset, now);
          return {
            ...asset,
            currentValue,
            accumulatedDepreciation
          };
        });
        
        setAssets(updatedAssets);
        calculateAnnualDepreciationForYear(updatedAssets, selectedYear);
      }, 60000); // Actualización cada 60 segundos
    }
    
    // Limpiar el intervalo cuando el componente se desmonte o cambie autoUpdateEnabled
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoUpdateEnabled, assets, selectedYear]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Activos Fijos</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={updateCurrentDepreciation} 
            disabled={isUpdating || isLoading}
          >
            {isUpdating ? "Actualizando..." : "Actualizar valores"}
          </Button>
          <Button 
            variant={autoUpdateEnabled ? "default" : "outline"}
            onClick={toggleAutoUpdate} 
            disabled={isLoading || assets.length === 0}
          >
            {autoUpdateEnabled ? "Desactivar auto" : "Activar auto"}
          </Button>
          <AddFixedAssetDialog clientId={clientId} onAssetAdded={loadAssets} />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Activos del Cliente</CardTitle>
          <CardDescription>
            Lista de activos fijos registrados para este cliente
            <span className="block text-sm mt-1">
              Valores calculados al: {referenceDate.toLocaleDateString('es-MX', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric'
              })}
              {autoUpdateEnabled && <span className="ml-2 text-green-500 font-medium">(Actualización automática activa)</span>}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor Original</TableHead>
                <TableHead>Valor Actual</TableHead>
                <TableHead>Dep. Acumulada</TableHead>
                <TableHead>Fecha Compra</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">Cargando activos...</TableCell>
                </TableRow>
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">Este cliente no tiene activos registrados</TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.type}</TableCell>
                    <TableCell>{formatCurrency(asset.cost)}</TableCell>
                    <TableCell>{formatCurrency(asset.currentValue)}</TableCell>
                    <TableCell>{formatCurrency(asset.accumulatedDepreciation)}</TableCell>
                    <TableCell>{formatDate(asset.purchaseDate)}</TableCell>
                    <TableCell><AssetStatusBadge status={asset.status} /></TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <DepreciationHistoryDialog asset={asset} />
                        <EditFixedAssetDialog asset={asset} onAssetUpdated={loadAssets} />
                        <DeleteFixedAssetDialog asset={asset} onAssetDeleted={loadAssets} />
                        {asset.hasInvoiceFile && (
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Resumen Anual {selectedYear}</CardTitle>
          <CardDescription>
            Depreciación total para el año seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssetSummaryCards 
            assets={assets} 
            selectedYear={selectedYear}
            annualDepreciation={annualDepreciation}
          />
        </CardContent>
      </Card>
    </div>
  );
}