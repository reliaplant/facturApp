import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddClient: (client: { name: string; rfc: string; email?: string; tipoPersona: 'fisica' | 'moral' }) => void;
}

export function AddClientDialog({ open, onOpenChange, onAddClient }: AddClientDialogProps) {
  const [name, setName] = useState("");
  const [rfc, setRfc] = useState("");
  const [email, setEmail] = useState("");
  const [tipoPersona, setTipoPersona] = useState<'fisica' | 'moral'>('fisica');
  const [error, setError] = useState<string | null>(null);

  const validateRFC = (rfc: string, tipo: 'fisica' | 'moral') => {
    // Formato RFC básico: 4 letras + 6 dígitos (persona física) o 3 letras + 6 dígitos (persona moral) + homoclave 3 caracteres
    const rfcRegexPersonaFisica = /^[A-Z]{4}[0-9]{6}[A-Z0-9]{3}$/;
    const rfcRegexPersonaMoral = /^[A-Z]{3}[0-9]{6}[A-Z0-9]{3}$/;
    
    if (tipo === 'fisica') {
      return rfcRegexPersonaFisica.test(rfc);
    } else {
      return rfcRegexPersonaMoral.test(rfc);
    }
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
    if (!validateRFC(rfc.toUpperCase(), tipoPersona)) {
      const expectedFormat = tipoPersona === 'fisica' 
        ? 'AAAA######XXX (4 letras, 6 números, 3 caracteres)'
        : 'AAA######XXX (3 letras, 6 números, 3 caracteres)';
      setError(`El formato del RFC no es válido para persona ${tipoPersona === 'fisica' ? 'física' : 'moral'}. Formato esperado: ${expectedFormat}`);
      return;
    }

    // Todo correcto, añadir cliente
    onAddClient({ 
      name: name.trim(), 
      rfc: rfc.toUpperCase().trim(),
      email: email.trim() || undefined,
      tipoPersona
    });

    // Resetear el formulario
    setName("");
    setRfc("");
    setEmail("");
    setTipoPersona('fisica');
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
            <Label htmlFor="tipoPersona">Tipo de Persona</Label>
            <Select value={tipoPersona} onValueChange={(value: 'fisica' | 'moral') => setTipoPersona(value)}>
              <SelectTrigger id="tipoPersona">
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fisica">Persona Física</SelectItem>
                <SelectItem value="moral">Persona Moral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="name">{tipoPersona === 'fisica' ? 'Nombre Completo' : 'Razón Social'}</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value.toUpperCase())}
              placeholder={tipoPersona === 'fisica' ? 'Nombre completo' : 'Razón social'}
              className="uppercase"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="rfc">RFC con Homoclave</Label>
            <Input 
              id="rfc" 
              value={rfc} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRfc(e.target.value.toUpperCase())}
              placeholder={tipoPersona === 'fisica' ? 'Ej. PEGJ800101ABC' : 'Ej. ABC123456XXX'}
              maxLength={13}
            />
            <p className="text-xs text-muted-foreground">
              {tipoPersona === 'fisica' 
                ? '13 caracteres: 4 letras, 6 números, 3 caracteres'
                : '12 caracteres: 3 letras, 6 números, 3 caracteres'}
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="email">Email (opcional)</Label>
            <Input 
              id="email" 
              type="email"
              value={email} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setName("");
            setRfc("");
            setEmail("");
            setTipoPersona('fisica');
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
