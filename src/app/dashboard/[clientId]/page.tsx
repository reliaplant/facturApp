"use client";
import React, { useState, useEffect, useRef, useCallback } from "react"; // Add React import and useRef
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
import SatRequests from "@/components/sat-requests";
import Proveedores from "@/components/proveedores"; // Add this import

export default function ClientDashboard() {
  const params = useParams();
  const clientId = params?.clientId as string || '';
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

  // Add state to track when supplier changes are made
  const [supplierChangeCounter, setSupplierChangeCounter] = useState(0);
  const [lastInvoiceRefresh, setLastInvoiceRefresh] = useState(Date.now());

  // Add a visible status message to make it clear when data is clean
  const [uploadStatus, setUploadStatus] = useState("");

  // Load client data and invoices on component mount
  useEffect(() => {
    // DON'T clear ALL localStorage - just prevent auto-evaluation during initial load
    // This was too aggressive and prevented editing
    console.log("Dashboard initialized - editing should be preserved");

    console.log("🧹 Dashboard: Cleared ALL localStorage data to prevent auto-evaluation");

    const fetchClientData = async () => {
      try {
        const clientData = await clientService.getClientById(clientId);

        if (clientData) {
          setClient(clientData);

          // Also fetch the client's invoices - now using invoiceService
          const clientInvoices = await invoiceService.getInvoices(clientId);
          setInvoices(clientInvoices);
        } else {
          toast({
            title: "Error",
            description: "No se encontró el cliente solicitado.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error de conexión",
          description: "No se pudo cargar la información del cliente.",
          variant: "destructive",
        });
      }
    };

    fetchClientData();
  }, [clientId, toast]);

  // Add a callback function to handle supplier updates
  const handleSupplierUpdated = useCallback(() => {
    console.log("🔄 Supplier update detected, triggering data refresh");
    setSupplierChangeCounter(prev => prev + 1);
    // We'll use this counter to trigger a refresh of invoice data
  }, []);

  // Modify the useEffect to also respond to supplier changes
  useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId) return;
      
      setIsRefreshing(true);
      try {
        // Fetch client data as before
        const clientData = await clientService.getClientById(clientId);
        if (clientData) {
          setClient(clientData);
          
          console.log("📊 Fetching invoice data after supplier change");
          const clientInvoices = await invoiceService.getInvoices(clientId);
          setInvoices(clientInvoices);
          setLastInvoiceRefresh(Date.now());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error de conexión",
          description: "No se pudo actualizar la información después del cambio de proveedor.",
          variant: "destructive",
        });
      } finally {
        setIsRefreshing(false);
      }
    };

    fetchClientData();
  }, [clientId, supplierChangeCounter, toast]); // Add supplierChangeCounter to dependencies

  // Modified file upload handler with MUCH stronger prevention of auto-evaluation
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!client || !event.target.files || event.target.files.length === 0) return;

    const files = Array.from(event.target.files);
    setIsLoading(true);
    setUploadStatus("Procesando archivos XML...");

    try {
      // Process CFDI files - additional logging to verify no auto-evaluation
      console.log("🔍 Processing CFDI files - NO auto-evaluation will be applied");
      const processedInvoices = await processCFDIFiles(files, clientId, client.rfc);
      
      // Log first invoice to confirm no deductibility values are set
      if (processedInvoices.length > 0) {
        // Verify and log multiple invoices to confirm no deductibility values
        processedInvoices.slice(0, Math.min(3, processedInvoices.length)).forEach((inv, i) => {
          console.log(`Invoice ${i+1}/${processedInvoices.length} deductibility check:`, {
            uuid: inv.uuid.substring(0, 8),
            rfcEmisor: inv.rfcEmisor,
            esDeducible: inv.esDeducible === undefined ? 'UNDEFINED ✓' : `SET! (${inv.esDeducible})`,
            mesDeduccion: inv.mesDeduccion === undefined ? 'UNDEFINED ✓' : `SET! (${inv.mesDeduccion})`,
          });
          
          // If any values are set, make them undefined to ensure they're not auto-evaluated
          if (inv.esDeducible !== undefined || inv.mesDeduccion !== undefined) {
            console.warn(`⚠️ Resetting deductibility for invoice ${inv.uuid.substring(0, 8)}`);
            inv.esDeducible = undefined;
            inv.mesDeduccion = undefined;
            inv.gravadoISR = undefined;
            inv.gravadoIVA = undefined;
          }
        });
      }
      
      setUploadStatus("Guardando facturas sin evaluación automática...");
      
      if (processedInvoices.length > 0) {
        // Save to Firestore - explicitly prevent auto-evaluation
        setIsSaving(true);

        try {
          console.log("💾 Saving invoices to Firestore WITHOUT deductibility values");
          const result = await invoiceService.saveInvoices(clientId, processedInvoices);

          // Prepare status message
          let statusDetails = [];
          if (result.savedIds && result.savedIds.length > 0) {
            statusDetails.push(`${result.savedIds.length} nueva(s)`);
          }
          if (result.existingIds && result.existingIds.length > 0) {
            statusDetails.push(`${result.existingIds.length} ya existente(s)`);
          }
          if (result.errors && result.errors > 0) {
            statusDetails.push(`${result.errors} con error(es)`);
          }

          setUploadStatus("Actualizando interfaz...");
          
          // Always reload the full page after adding new invoices
          // This ensures we get completely fresh data without any stale values
          console.log("🔄 Forcing full page refresh to ensure clean data");
          window.location.reload();
          
        } catch (saveError) {
          console.error("Error saving invoices:", saveError);
          setUploadStatus("");
          toast({
            title: "Error al guardar",
            description: "Se procesaron los archivos pero no se pudieron guardar en la base de datos.",
            variant: "destructive",
          });
        }
      } else {
        setUploadStatus("");
        toast({
          title: "Aviso",
          description: "No se pudieron procesar facturas válidas de los archivos seleccionados.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error processing files:", error);
      setUploadStatus("");
      toast({
        title: "Error al procesar archivos",
        description: "Ocurrió un error al leer o procesar los archivos XML.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsSaving(false);
      setUploadStatus("");
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
              <h1 className="font-bold text-gray-900 dark:text-white">
                {client.name} <span className="font-normal">({client.rfc})</span>
              </h1>
            </div>

            {/* Add user info with avatar */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 pl-3 border-gray-200 dark:border-gray-700">
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

      {/* Add status message when uploading */}
      {uploadStatus && (
        <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white text-center py-2 z-50">
          {uploadStatus}
        </div>
      )}

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
                <TabsTrigger size="sm" value="proveedores">Proveedores</TabsTrigger>
                <TabsTrigger size="sm" value="declaraciones">Declaraciones</TabsTrigger>
                <TabsTrigger size="sm" value="info">Info</TabsTrigger>
                <TabsTrigger size="sm" value="activos">Activos</TabsTrigger>
                <TabsTrigger size="sm" value="checklist">Checklist</TabsTrigger>
                <TabsTrigger size="sm" value="sat">SAT test</TabsTrigger>

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
              clientId={clientId}
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
              key={`expenses-${lastInvoiceRefresh}`} // Use lastInvoiceRefresh instead of Date.now() to prevent continuous remounting
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
              onEdit={() => { }}
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
              clientId={clientId}
            />
          </TabsContent>

          <TabsContent value="checklist">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-md shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Checklist del Cliente</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Contenido del checklist en construcción. Aquí se mostrarán las tareas pendientes y completadas.
              </p>
              {/* Pass the clientRfc prop */}
            </div>
          </TabsContent>

          {/* Add a missing tab content for the "sat" tab */}
          <TabsContent value="sat">
            <div className="">

              <SatRequests clientRfc={client.rfc} />

            </div>
          </TabsContent>

          {/* Add the Proveedores tab content */}
          <TabsContent value="proveedores">
            <Proveedores 
              clientId={clientId} 
              onSupplierUpdated={handleSupplierUpdated} // Pass this callback to Proveedores
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
