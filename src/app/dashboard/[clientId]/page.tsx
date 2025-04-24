"use client";
import React, { useState, useEffect, useRef } from "react"; // Add React import and useRef
import Link from "next/link";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncomesTable } from "@/components/incomes-table";
import { ExpensesTable } from "@/components/expenses-table";
import { FiscalSummary } from "@/components/fiscal-summary";
import { YearSelector } from "@/components/year-selector";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, RefreshCw, FileUp } from "lucide-react";
import { Invoice } from "@/models/Invoice";
import { processCFDIFiles } from "@/services/cfdi-parser";
import { v4 as uuidv4 } from "uuid";
import { Client } from "@/models/Client";
import { clientService } from "@/services/client-service";
import InfoClientePF from "./components/infoClientePF";
import DeclaracionMensualPF from "@/components/declaracionMensualPF";
import { FixedAssetsTable } from "@/components/fixed-assets-table";
import { Download } from "lucide-react"; // Add this import
import { ExportInvoicesExcel } from "@/components/export-invoices-excel"; // Make sure this is imported
import { invoiceService } from "@/services/invoice-service"; // Add this import

export default function ClientDashboard() {
  const params = useParams();
  const clientId = params.clientId as string;
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState<string>("fiscal");
  const { toast } = useToast();
  
  // Fix the ref - use imported useRef hook directly
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add a mock logged-in user state
  const [loggedInUser] = useState({ name: "Ana Rodríguez", email: "ana@example.com" });

  // Add a state for tracking saving process
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load client data and invoices on component mount
  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const clientData = await clientService.getClientById(clientId);
        
        if (clientData) {
          setClient(clientData);
          
          // Also fetch the client's invoices - now using invoiceService
          const clientInvoices = await invoiceService.getInvoices(clientId);
          setInvoices(clientInvoices);
        } else {
          // If we can't find the client in Firestore, try using mock data for development
          const mockClients = clientService.getMockClients();
          const mockClient = mockClients.find(c => c.id === clientId);
          if (mockClient) {
            setClient(mockClient);
          } else {
            toast({
              title: "Error",
              description: "No se encontró el cliente solicitado.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        // Fallback to mock client data if there's an error
        const mockClients = clientService.getMockClients();
        const mockClient = mockClients.find(c => c.id === clientId);
        if (mockClient) {
          setClient(mockClient);
        }

        toast({
          title: "Error de conexión",
          description: "Se está usando información de ejemplo mientras se restablece la conexión.",
          variant: "destructive",
        });
      }
    };

    fetchClientData();
  }, [clientId, toast]);

  // Updated file upload handler to better handle duplicate detection
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!client || !event.target.files || event.target.files.length === 0) return;

    const files = Array.from(event.target.files);
    setIsLoading(true);
    
    try {
      // Step 1: Process CFDI files
      console.log("Processing CFDI files...");
      const processedInvoices = await processCFDIFiles(files, clientId, client.rfc);
      console.log(`Successfully processed ${processedInvoices.length} invoices`);

      if (processedInvoices.length > 0) {
        // Step 2: Save to Firestore - now using invoiceService
        setIsSaving(true);
        
        try {
          console.log("Saving invoices to Firestore...");
          const result = await invoiceService.saveInvoices(clientId, processedInvoices);
          
          // The saveClientInvoices now returns an object with counts
          const { savedIds, existingIds, errors } = result;
          
          // Prepare detailed status message
          let statusDetails = [];
          if (savedIds && savedIds.length > 0) {
            statusDetails.push(`${savedIds.length} nueva(s)`);
          }
          if (existingIds && existingIds.length > 0) {
            statusDetails.push(`${existingIds.length} ya existente(s)`);
          }
          if (errors && errors > 0) {
            statusDetails.push(`${errors} con error(es)`);
          }
          
          // Step 3: Refresh invoices list - now using invoiceService
          try {
            console.log("Refreshing invoices list...");
            const updatedInvoices = await invoiceService.getInvoices(clientId);
            setInvoices(updatedInvoices);
            console.log(`Loaded ${updatedInvoices.length} invoices from Firestore`);
            
            if (savedIds && savedIds.length > 0) {
              toast({
                title: "Facturas procesadas",
                description: `Resultado: ${statusDetails.join(", ")}.`,
                variant: savedIds.length > 0 ? "default" : "default"
              });
            } else if (existingIds && existingIds.length > 0 && (savedIds?.length === 0 || !savedIds)) {
              toast({
                title: "Aviso",
                description: "No se guardaron nuevas facturas. Todas las facturas ya existían en el sistema.",
                variant: "default",
              });
            } else {
              toast({
                title: "Aviso",
                description: "No se pudieron guardar las facturas. Verifique los logs para más detalles.",
                variant: "destructive",
              });
            }
          } catch (refreshError) {
            console.error("Error refreshing invoices:", refreshError);
            // Even if refresh fails, show save results
            toast({
              title: "Facturas procesadas",
              description: `Resultado: ${statusDetails.join(", ")}. No se pudieron cargar las actualizaciones.`,
              variant: "default",
            });
          }
        } catch (saveError) {
          console.error("Error saving invoices:", saveError);
          toast({
            title: "Error al guardar",
            description: "Se procesaron los archivos pero no se pudieron guardar en la base de datos.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Aviso",
          description: "No se pudieron procesar facturas válidas de los archivos seleccionados.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error processing files:", error);
      toast({
        title: "Error al procesar archivos",
        description: "Ocurrió un error al leer o procesar los archivos XML.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsSaving(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Function to trigger file dialog
  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Update the refresh function to also reload invoices from Firestore
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch invoices from Firestore using invoiceService
      const clientInvoices = await invoiceService.getInvoices(clientId);
      setInvoices(clientInvoices);

      toast({
        title: "Datos actualizados",
        description: "La información fiscal ha sido actualizada correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error al actualizar",
        description: "No se pudieron actualizar los datos fiscales.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get filtered income and expense invoices for the selected year
  const getYearFilteredInvoices = () => {
    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear, 11, 31);
    
    return invoices.filter(inv => {
      const invDate = new Date(inv.fecha);
      return invDate >= yearStart && invDate <= yearEnd;
    });
  };
  
  const yearInvoices = getYearFilteredInvoices();
  const emittedInvoices = yearInvoices.filter(inv => !inv.recibida);
  const receivedInvoices = yearInvoices.filter(inv => inv.recibida);

  if (!client) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Primera barra */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="w-full px-3 pr-7 py-1">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-3">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Volver
                </Button>
              </Link>
              <h1 className=" font-bold text-gray-900 dark:text-white">
                {client.name} <span className="font-normal">({client.rfc})</span>
              </h1>
            </div>
            
            {/* Add user info with avatar */}
            <div className="flex items-center gap-3">

              
              <div className="flex items-center gap-2  pl-3 border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                  {loggedInUser.name}
                </div>
                <div className="h-7 w-7 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-medium">
                  {loggedInUser.name.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Segunda barra - Tabs y botones */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-t border-b-2 border-gray-200 dark:border-gray-700">
        <div className="w-full px-3 pr-7 py-0">
          <div className="flex justify-between items-center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Use simplified TabsList with bottom border-only styling */}
              <TabsList size="sm" className="overflow-x-auto bg-transparent">
                <TabsTrigger size="sm" value="fiscal">Cédula Fiscal</TabsTrigger>
                <TabsTrigger size="sm" value="incomes">Facturas Emitidas</TabsTrigger>
                <TabsTrigger size="sm" value="expenses">Facturas Recibidas</TabsTrigger>
                <TabsTrigger size="sm" value="declaraciones">Declaraciones</TabsTrigger>
                <TabsTrigger size="sm" value="info">Info</TabsTrigger>
                <TabsTrigger size="sm" value="activos">Activos</TabsTrigger>
                <TabsTrigger size="sm" value="checklist">Checklist</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1.5">


            <Button
                variant="gray800"
                size="sm"
                onClick={handleRefreshData}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
                Recuperar_CFDIs
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openFileDialog}
                disabled={isLoading || isSaving}
                className="flex items-center whitespace-nowrap"
              >
                <FileUp className="h-3.5 w-3.5 mr-1" />
                {isLoading ? "Procesando..." : isSaving ? "Guardando..." : "Subir"}
              </Button>
              
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xml"
                multiple
                className="hidden"
              />

              {/* Add Export Excel Button */}
              <ExportInvoicesExcel
                emittedInvoices={emittedInvoices}
                receivedInvoices={receivedInvoices}
                year={selectedYear}
                fileName={`${client?.name || 'Cliente'}_Facturas_${selectedYear}.xlsx`}
                buttonLabel="Exportar"
              />

   {/* Explicitly add size="sm" to YearSelector */}
   <YearSelector 
                selectedYear={selectedYear} 
                onYearChange={setSelectedYear} 
                size="sm"
              />

              
           
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full">
        {/* Contenido de las tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="fiscal">
            <FiscalSummary 
              clientId={Array.isArray(params.clientId) ? params.clientId[0] : params.clientId}
              year={selectedYear}
              invoices={invoices}
            />
          </TabsContent>

          <TabsContent value="incomes">
            <IncomesTable
              year={selectedYear}
              invoices={invoices.filter(inv => !inv.recibida)}
              disableExport={true} // Add this prop to hide the export button
              clientId={clientId} // Add clientId prop
            />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesTable
              year={selectedYear}
              invoices={invoices.filter(inv => inv.recibida)}
              disableExport={true} // Add this prop to hide the export button
              clientId={clientId} // Add clientId prop
            />
          </TabsContent>

          <TabsContent value="declaraciones">
            <DeclaracionMensualPF 
              clientId={clientId}
              selectedYear={selectedYear}
              declaraciones={[]} 
              onEdit={() => {}}
            />
          </TabsContent>

          <TabsContent value="activos">
            {/* Replace Card with simpler structure */}
            <div className="bg-white dark:bg-gray-800">
              <FixedAssetsTable clientId={clientId} selectedYear={selectedYear} />
            </div>
          </TabsContent>

          <TabsContent value="info">
            <InfoClientePF 
              initialClient={client} 
              clientId={params.clientId} 
            />
          </TabsContent>

          <TabsContent value="checklist">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-md shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Checklist del Cliente</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Contenido del checklist en construcción. Aquí se mostrarán las tareas pendientes y completadas.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
