import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, X, AlertTriangle, Loader2 } from "lucide-react";
import { CFDI } from "@/models/CFDI";

interface CFDIVerificationDialogProps {
  invoice: CFDI | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CFDIVerificationDialog({ invoice, isOpen, onClose }: CFDIVerificationDialogProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Llama al backend en vez del servicio directo
  const verifyWithSAT = async () => {
    if (!invoice) return;
    try {
      setIsVerifying(true);
      setError(null);
      setVerificationResult(null);
      // Llama al endpoint backend
      const response = await fetch("/api/verify-cfdi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uuid: invoice.uuid,
          rfcEmisor: invoice.rfcEmisor,
          rfcReceptor: invoice.rfcReceptor,
          total: invoice.total,
        }),
      });
      if (!response.ok) {
        throw new Error("Error verificando CFDI");
      }
      const result = await response.json();
      setVerificationResult(result);
    } catch (err) {
      setError("Ocurrió un error al verificar el CFDI con el SAT");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Verificar CFDI con SAT</DialogTitle>
        </DialogHeader>
        
        {!invoice ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              No se ha seleccionado una factura para verificar.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-medium">Folio Fiscal:</div>
              <div>{invoice.uuid}</div>
              
              <div className="font-medium">RFC Emisor:</div>
              <div>{invoice.rfcEmisor}</div>
              
              <div className="font-medium">RFC Receptor:</div>
              <div>{invoice.rfcReceptor}</div>
              
              <div className="font-medium">Total:</div>
              <div>${invoice.total.toFixed(2)}</div>
            </div>
            
            {!verificationResult && !isVerifying && (
              <Button onClick={verifyWithSAT} className="w-full">
                Verificar con SAT
              </Button>
            )}
            
            {isVerifying && (
              <div className="flex flex-col items-center justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="mt-2">Verificando con el SAT...</p>
              </div>
            )}
            
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {verificationResult && (
              <div className="space-y-4">
                <Alert variant={
                  verificationResult.valid ? "default" :
                  verificationResult.status === "Cancelado" ? "default" : "destructive"
                }>
                  {verificationResult.valid ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <AlertTitle>CFDI Vigente</AlertTitle>
                      <AlertDescription>
                        El CFDI ha sido verificado correctamente y está vigente en el SAT.
                      </AlertDescription>
                    </>
                  ) : verificationResult.status === "Cancelado" ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertTitle>CFDI Cancelado</AlertTitle>
                      <AlertDescription>
                        <p>Este CFDI ha sido cancelado en el SAT.</p>
                        {verificationResult.cancellationDate && (
                          <p className="mt-1">Fecha de cancelación: {verificationResult.cancellationDate}</p>
                        )}
                        {verificationResult.cancellationReason && (
                          <p>Motivo: {verificationResult.cancellationReason}</p>
                        )}
                      </AlertDescription>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-red-600" />
                      <AlertTitle>CFDI No Encontrado</AlertTitle>
                      <AlertDescription>
                        El CFDI no pudo ser verificado o no existe en el SAT.
                        {verificationResult.errorMessage && (
                          <p className="mt-1 text-red-500">{verificationResult.errorMessage}</p>
                        )}
                      </AlertDescription>
                    </>
                  )}
                </Alert>
                
                <Button onClick={verifyWithSAT} variant="outline" size="sm">
                  Verificar de nuevo
                </Button>
              </div>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
