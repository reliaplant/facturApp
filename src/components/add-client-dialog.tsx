import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddClient: (client: { name: string; rfc: string }) => void;
}

export function AddClientDialog({ open, onOpenChange, onAddClient }: AddClientDialogProps) {
  const [name, setName] = useState("");
  const [rfc, setRfc] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validateRFC = (rfc: string) => {
    // Formato RFC básico: 4 letras + 6 dígitos (persona física) o 3 letras + 6 dígitos (persona moral) + homoclave 3 caracteres
    const rfcRegexPersonaFisica = /^[A-Z]{4}[0-9]{6}[A-Z0-9]{3}$/;
    const rfcRegexPersonaMoral = /^[A-Z]{3}[0-9]{6}[A-Z0-9]{3}$/;
    return rfcRegexPersonaFisica.test(rfc) || rfcRegexPersonaMoral.test(rfc);
  };

  const handleSubmit = () => {
    // Validaciones
    if (!name.trim()) {
      setError("El nombre del cliente es obligatorio");
      return;
    }

    if (!rfc.trim()) {
      setError("El RFC es obligatorio");
      return;
    }

    // Validación del formato del RFC
    if (!validateRFC(rfc.toUpperCase())) {
      setError("El formato del RFC no es válido");
      return;
    }

    // Todo correcto, añadir cliente
    onAddClient({ 
      name: name.trim(), 
      rfc: rfc.toUpperCase().trim() 
    });

    // Resetear el formulario
    setName("");
    setRfc("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar nuevo cliente</DialogTitle>
          <DialogDescription>
            Ingresa los datos del contribuyente para registrarlo en el sistema.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre o Razón Social</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="Nombre completo o razón social"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="rfc">RFC con Homoclave</Label>
            <Input 
              id="rfc" 
              value={rfc} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRfc(e.target.value.toUpperCase())}
              placeholder="Ej. PEGJ800101ABC"
              maxLength={13}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setName("");
            setRfc("");
            setError(null);
            onOpenChange(false);
          }}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
