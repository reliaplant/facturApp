import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Invoice } from "@/models/Invoice";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
