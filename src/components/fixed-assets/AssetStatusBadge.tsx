import { Badge } from "@/components/ui/badge";
import { FixedAsset } from "@/models/FixedAsset";

export const AssetStatusBadge = ({ status }: { status: FixedAsset['status'] }) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500">Activo</Badge>;
    case 'fullyDepreciated':
      return <Badge className="bg-blue-500">Totalmente Depreciado</Badge>;
    case 'disposed':
      return <Badge className="bg-orange-500">Dado de Baja</Badge>;
    case 'sold':
      return <Badge variant="outline">Vendido</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};