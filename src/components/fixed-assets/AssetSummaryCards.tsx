import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FixedAsset } from "@/models/FixedAsset";
import { formatCurrency } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

interface AssetSummaryCardsProps {
  assets: FixedAsset[];
  selectedYear: number;
  annualDepreciation?: number;
}

export const AssetSummaryCards = ({ assets, selectedYear, annualDepreciation = 0 }: AssetSummaryCardsProps) => {
  const activeAssets = assets.filter(a => a.status === 'active');
  const fullyDepreciatedAssets = assets.filter(a => a.status === 'fullyDepreciated');
  
  // Calcular el valor total de los activos
  const totalAssetValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  
  // Calcular el valor original total
  const totalOriginalValue = assets.reduce((sum, asset) => sum + asset.cost, 0);
  
  // Calcular porcentaje de depreciación total
  const totalDepreciationPercentage = totalOriginalValue > 0 
    ? ((totalOriginalValue - totalAssetValue) / totalOriginalValue) * 100 
    : 0;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium">Total Activos</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[200px]">Número total de activos fijos registrados</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription className="text-xs">Todos los registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{assets.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {fullyDepreciatedAssets.length} depreciados totalmente
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium">Activos en uso</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[200px]">Activos que aún se están depreciando</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription className="text-xs">Estado: Activo</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{activeAssets.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {activeAssets.length > 0 ? 
              `${Math.round((activeAssets.length / assets.length) * 100)}% del total` : 
              "No hay activos en uso"}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium">Depreciación Anual</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[200px]">Monto total de depreciación para {selectedYear}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription className="text-xs">Año {selectedYear}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {annualDepreciation ? formatCurrency(annualDepreciation) : "Calculando..."}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Deducible fiscal
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium">Valor Actual</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[200px]">Valor contable actual de todos los activos</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription className="text-xs">Total en libros</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(totalAssetValue)}</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 dark:bg-gray-700">
            <div 
              className="bg-primary h-1.5 rounded-full" 
              style={{ width: `${100 - totalDepreciationPercentage}%` }}
              aria-label={`${Math.round(100 - totalDepreciationPercentage)}% del valor original`}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {Math.round(totalDepreciationPercentage)}% depreciado del original
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
