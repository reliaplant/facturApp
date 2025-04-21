import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Trash2 } from "lucide-react";
import { FixedAsset } from "@/models/FixedAsset";
import { FixedAssetService } from "@/services/fixed-asset-service";
import { formatCurrency } from "@/lib/utils";

const fixedAssetService = new FixedAssetService();

interface DeleteFixedAssetDialogProps {
  asset: FixedAsset;
  onAssetDeleted: () => void;
}

export const DeleteFixedAssetDialog = ({ asset, onAssetDeleted }: DeleteFixedAssetDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await fixedAssetService.deleteFixedAsset(asset.id);
      toast({
        title: "Activo eliminado",
        description: `Se ha eliminado "${asset.name}" correctamente.`,
      });
      setIsOpen(false);
      onAssetDeleted();
    } catch (error) {
      console.error("Error al eliminar activo:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el activo. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-100" onClick={() => setIsOpen(true)}>
        <Trash2 className="h-4 w-4" />
      </Button>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar Activo Fijo</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. ¿Está seguro que desea eliminar este activo?
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Nombre:</span>
              <span>{asset.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Valor original:</span>
              <span>{formatCurrency(asset.cost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Valor actual:</span>
              <span>{formatCurrency(asset.currentValue)}</span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? "Eliminando..." : "Eliminar activo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
