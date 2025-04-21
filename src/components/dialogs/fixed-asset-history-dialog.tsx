import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FixedAsset } from "@/models/FixedAsset";
import { MonthlyDepreciation } from "@/models/MonthlyDepreciation";
import { FixedAssetService } from "@/services/fixed-asset-service";
import { formatCurrency } from "@/utils/formatCurrency";

interface FixedAssetHistoryDialogProps {
  asset: FixedAsset | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FixedAssetHistoryDialog({ 
  asset, 
  isOpen, 
  onClose 
}: FixedAssetHistoryDialogProps) {
  const [depreciations, setDepreciations] = useState<MonthlyDepreciation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fixedAssetService = new FixedAssetService();
  
  useEffect(() => {
    const loadDepreciations = async () => {
      if (!asset?.id || !isOpen) return;
      
      setIsLoading(true);
      try {
        // Obtener depreciaciones históricas del activo desde Firestore
        const history = await fixedAssetService.getDepreciationHistoryForAsset(asset.id);
        
        // Si no hay depreciaciones registradas, generar simuladas
        if (history.length === 0) {
          const simulatedHistory = generateSimulatedDepreciationHistory(asset);
          setDepreciations(simulatedHistory);
        } else {
          setDepreciations(history);
        }
        
      } catch (error) {
        console.error("Error al cargar el historial de depreciación:", error);
        
        // En caso de error, mostrar depreciaciones simuladas
        const simulatedHistory = generateSimulatedDepreciationHistory(asset);
        setDepreciations(simulatedHistory);
        
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isOpen) {
      loadDepreciations();
    }
  }, [isOpen, asset?.id]);

  // Función para generar un historial de depreciación simulado
  const generateSimulatedDepreciationHistory = (asset: FixedAsset): MonthlyDepreciation[] => {
    if (!asset) return [];
    
    // Usar el servicio centralizado para generar el historial de depreciación
    const generatedHistory = fixedAssetService.generateDepreciationHistory(asset);
    
    // Convertir el resultado al formato MonthlyDepreciation
    return generatedHistory.map(item => ({
      id: `sim-${asset.id}-${item.year}-${item.month}`,
      assetId: asset.id,
      clientId: asset.clientId,
      year: item.year,
      month: item.month,
      deprecationAmount: item.deprecationAmount,
      accumulatedBefore: item.accumulatedBefore,
      accumulatedAfter: item.accumulatedAfter,
      assetValueBefore: item.assetValueBefore,
      assetValueAfter: item.assetValueAfter,
      taxDeductible: true,
      calculationMethod: asset.depreciationMethod,
      generatedAt: new Date().toISOString()
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historial de Depreciación</DialogTitle>
          <DialogDescription>
            {asset?.name} - {asset?.type}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Período</TableHead>
                <TableHead className="w-[100px]">Monto</TableHead>
                <TableHead className="w-[100px]">Acumulado</TableHead>
                <TableHead className="w-[100px]">Valor Antes</TableHead>
                <TableHead className="w-[100px]">Valor Después</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Cargando...</TableCell>
                </TableRow>
              ) : (
                depreciations.map(depreciation => (
                  <TableRow key={depreciation.id}>
                    <TableCell>
                      {`${depreciation.month}/${depreciation.year}`}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(depreciation.deprecationAmount)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(depreciation.accumulatedAfter)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(depreciation.assetValueBefore)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(depreciation.assetValueAfter)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}