import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Info } from "lucide-react";
import { FixedAsset } from "@/models/FixedAsset";
import { MonthlyDepreciation } from "@/models/MonthlyDepreciation";
import { formatCurrency } from "@/lib/utils";
import { calculateTotalDepreciation } from "./utils";

export const DepreciationHistoryDialog = ({ asset }: { asset: FixedAsset }) => {
  const [depreciations, setDepreciations] = useState<MonthlyDepreciation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Actualizado para generar el historial cuando se abre el diálogo
  useEffect(() => {
    if (isOpen) {
      generateDepreciationHistory();
    }
  }, [isOpen]);

  const generateDepreciationHistory = () => {
    setIsLoading(true);
    try {
      // Fecha de compra
      const purchaseDate = new Date(asset.purchaseDate);
      // Fecha actual
      const currentDate = new Date();
      
      // Lista para almacenar los registros de depreciación
      const history: MonthlyDepreciation[] = [];
      
      // Variables para seguimiento de valores acumulados
      let accumulatedDepreciation = 0;
      let currentValue = asset.cost;
      
      // Para cada mes desde la compra hasta la fecha actual
      let currentMonth = new Date(purchaseDate);
      
      // Función para obtener la depreciación mensual según el método
      const getMonthlyDepreciation = (monthCount: number): number => {
        switch (asset.depreciationMethod) {
          case 'straightLine':
            // Línea recta: (costo - valor residual) / vida útil
            return (asset.cost - asset.residualValue) / asset.usefulLifeMonths;
          
          case 'doubleDecline':
            // Doble declinación: tasa anual = 2 * (1 / años de vida útil)
            const annualRate = 2 * (1 / (asset.usefulLifeMonths / 12));
            // Depreciación mensual = valor actual * tasa anual / 12
            return currentValue * annualRate / 12;
          
          case 'sumOfYears':
            // Suma de años dígitos
            const usefulLifeYears = asset.usefulLifeMonths / 12;
            const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
            // Determinar en qué año estamos
            const currentYear = Math.ceil(monthCount / 12);
            const yearsRemaining = usefulLifeYears - currentYear + 1;
            // Calcular la depreciación anual y convertirla a mensual
            return ((asset.cost - asset.residualValue) * yearsRemaining) / (sumOfYears * 12);
          
          case 'units':
            // Método de unidades: Este método requeriría datos adicionales sobre el uso del activo
            // Por defecto, usamos línea recta
            return (asset.cost - asset.residualValue) / asset.usefulLifeMonths;
            
          default:
            return (asset.cost - asset.residualValue) / asset.usefulLifeMonths;
        }
      };
      
      // Contador de meses desde la compra
      let monthCount = 1;
      
      // Generar depreciación para cada mes hasta el actual o hasta el fin de vida útil
      while (
        currentMonth <= currentDate && 
        monthCount <= asset.usefulLifeMonths && 
        currentValue > asset.residualValue
      ) {
        // Calcular depreciación para este mes
        let monthlyDepreciation = getMonthlyDepreciation(monthCount);
        
        // Asegurar que no deprecie por debajo del valor residual
        if (currentValue - monthlyDepreciation < asset.residualValue) {
          monthlyDepreciation = currentValue - asset.residualValue;
        }
        
        // Actualizar valores acumulados
        const assetValueBefore = currentValue;
        const accumulatedBefore = accumulatedDepreciation;
        
        accumulatedDepreciation += monthlyDepreciation;
        currentValue -= monthlyDepreciation;
        
        // Crear registro de depreciación
        history.push({
          id: `${asset.id}_${currentMonth.getFullYear()}_${currentMonth.getMonth() + 1}`,
          assetId: asset.id,
          clientId: asset.clientId,
          year: currentMonth.getFullYear(),
          month: currentMonth.getMonth() + 1,
          deprecationAmount: monthlyDepreciation,
          accumulatedBefore,
          accumulatedAfter: accumulatedDepreciation,
          assetValueBefore,
          assetValueAfter: currentValue,
          taxDeductible: true,
          calculationMethod: asset.depreciationMethod,
          generatedAt: new Date().toISOString()
        });
        
        // Avanzar al siguiente mes
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        monthCount++;
      }
      
      setDepreciations(history);
    } catch (error) {
      console.error("Error generating depreciation history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className="whitespace-nowrap"
      >
        <Info className="mr-2 h-4 w-4" />
        Historial
      </Button>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Historial de Depreciación - {asset.name}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Acumulado</TableHead>
                <TableHead>Valor Antes</TableHead>
                <TableHead>Valor Después</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Cargando historial...</TableCell>
                </TableRow>
              ) : depreciations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No hay registros de depreciación</TableCell>
                </TableRow>
              ) : (
                depreciations.map((dep) => (
                  <TableRow key={dep.id}>
                    <TableCell>{dep.month}/{dep.year}</TableCell>
                    <TableCell>{formatCurrency(dep.deprecationAmount)}</TableCell>
                    <TableCell>{formatCurrency(dep.accumulatedAfter)}</TableCell>
                    <TableCell>{formatCurrency(dep.assetValueBefore)}</TableCell>
                    <TableCell>{formatCurrency(dep.assetValueAfter)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-muted-foreground">
            Método: {asset.depreciationMethod === 'straightLine' ? 'Línea Recta' : 
                    asset.depreciationMethod === 'doubleDecline' ? 'Doble Declinación' : 
                    asset.depreciationMethod === 'sumOfYears' ? 'Sum of Years' : 'Unidades'}
          </p>
          <p className="text-sm font-medium">
            Total depreciación: {formatCurrency(calculateTotalDepreciation(depreciations))}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};