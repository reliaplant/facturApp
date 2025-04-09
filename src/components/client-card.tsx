import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

interface ClientCardProps {
  client: {
    id: string;
    name: string;
    rfc: string;
    lastAccess: string;
  };
  onSelect: () => void;
}

export function ClientCard({ client, onSelect }: ClientCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold flex items-center">
          <User className="h-5 w-5 mr-2 text-gray-500" />
          {client.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">RFC: {client.rfc}</p>
        <p className="text-xs text-gray-500 mt-1">
          Último acceso: {new Date(client.lastAccess).toLocaleDateString('es-MX')}
        </p>
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          variant="default" 
          onClick={onSelect}
          className="w-full"
        >
          Seleccionar
        </Button>
      </CardFooter>
    </Card>
  );
}
