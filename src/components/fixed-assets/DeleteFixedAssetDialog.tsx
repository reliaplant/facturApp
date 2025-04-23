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
    try {
      setIsLoading(true);
      await fixedAssetService.deleteFixedAsset(asset.clientId, asset.id);
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
      <Button variant="danger" size="xs" onClick={() => setIsOpen(true)}>
        <Trash2 className="h-4 w-4" />
      </Button>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Eliminar Activo Fijo</DialogTitle>
          <DialogDescription>
            ¿Está seguro que desea eliminar el activo "{asset.name}"?
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
