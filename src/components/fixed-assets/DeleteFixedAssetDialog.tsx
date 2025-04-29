import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { FixedAsset } from "@/models/FixedAsset";
import { FixedAssetService } from "@/services/fixed-asset-service";
import { formatDate } from "./utils";

interface DeleteFixedAssetDialogProps {
  asset: FixedAsset;
  onAssetDeleted: () => void;
}

const fixedAssetService = new FixedAssetService();

export function DeleteFixedAssetDialog({ asset, onAssetDeleted }: DeleteFixedAssetDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      await fixedAssetService.deleteFixedAsset(asset.clientId, asset.id);
      setIsOpen(false);
      onAssetDeleted();
    } catch (err) {
      console.error("Error deleting asset:", err);
      setError("No se pudo eliminar el activo. Intente nuevamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Eliminar Activo Fijo</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. El activo será eliminado permanentemente.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-2">¿Está seguro que desea eliminar el siguiente activo?</p>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="font-semibold">{asset.name}</p>
            <p className="text-sm text-gray-500">
              {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)} • 
              Adquirido el {formatDate(asset.purchaseDate)} • 
              ${asset.cost.toLocaleString('es-MX')}
            </p>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isDeleting}
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
