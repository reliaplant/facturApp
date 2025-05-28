import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Invoice } from "@/models/Invoice";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Loader2, XCircle, AlertTriangle } from "lucide-react";

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (invoice: Invoice) => void;
}

export function InvoicePreviewModal({ invoice, isOpen, onClose, onUpdate }: InvoicePreviewModalProps) {
  if (!invoice) return null;
  
  // State for tab selection
  const [activeTab, setActiveTab] = useState<string>("invoice");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Helper function to render values with proper formatting
  const renderValue = (value: any) => {
    if (value === undefined) {
      return <span className="text-red-600 font-semibold">undefined</span>;
    }
    
    if (value === null) {
      return <span className="text-orange-600">null</span>;
    }
    
    if (typeof value === 'object' && value !== null) {
      return (
        <pre className="bg-gray-100 p-2 rounded text-xs">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    
    return <span className="font-mono">{String(value)}</span>;
  };
  
  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationError(null);
    setVerificationResult(null);
    try {
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
      if (!response.ok) throw new Error("Error verificando CFDI");
      const result = await response.json();
      setVerificationResult(result);
    } catch (err) {
      setVerificationError("Ocurrió un error al verificar el CFDI con el SAT");
    } finally {
      setIsVerifying(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Factura: {invoice.uuid}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invoice">Vista Normal</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>
          
          <TabsContent value="invoice">
            {/* Normal invoice view */}
            {/* ...existing invoice view content... */}
          </TabsContent>
          
          <TabsContent value="debug">
            <div className="border p-4 rounded-md bg-gray-50">
              <h3 className="text-lg font-medium mb-4">Debug - All Invoice Fields</h3>
              
              <div className="grid grid-cols-1 gap-1 text-sm">
                {Object.entries(invoice).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-2 gap-4 border-b py-2">
                    <div className="font-medium">{key}:</div>
                    <div className="overflow-auto max-h-36">
                      {renderValue(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleVerify}
            className="gap-2"
            disabled={isVerifying}
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Verificar con SAT
          </Button>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
        
        {/* Resultado de verificación simple */}
        {verificationResult && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            {verificationResult.valid ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-700 font-semibold">CFDI vigente en SAT</span>
              </>
            ) : verificationResult.status === "Cancelado" ? (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-700 font-semibold">CFDI cancelado en SAT</span>
                {verificationResult.cancellationDate && (
                  <span className="ml-2 text-xs text-gray-500">Fecha: {verificationResult.cancellationDate}</span>
                )}
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-700 font-semibold">No vigente o no encontrado</span>
              </>
            )}
          </div>
        )}
        {verificationError && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-700">
            <XCircle className="h-5 w-5 text-red-600" />
            {verificationError}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
