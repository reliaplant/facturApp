"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  Trash2,
  Search,
  Calendar,
} from "lucide-react";
import {
  SatRequestLog,
  logTypeLabels,
  logLevelColors,
  SatLogLevel,
  SatLogType,
} from "@/models/SatRequestLog";
import {
  getRecentLogs,
  getLogsByClient,
  getLogsByLevel,
  deleteLog,
} from "@/services/sat-log-service";
import { useAuth } from "@/contexts/AuthContext";
import { clientService } from "@/services/client-service";
import { Client } from "@/models/Client";

const levelIcons: Record<SatLogLevel, React.ReactNode> = {
  info: <Info className="h-4 w-4" />,
  success: <CheckCircle2 className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  error: <XCircle className="h-4 w-4" />,
};

function formatDate(timestamp: { toDate: () => Date } | Date | undefined | null): string {
  if (!timestamp) return "Fecha no disponible";
  
  try {
    const date = "toDate" in timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Fecha inválida";
  }
}

interface LogItemProps {
  log: SatRequestLog;
  onDelete?: (id: string) => void;
  canDelete: boolean;
}

function LogItem({ log, onDelete, canDelete }: LogItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = log.details && Object.keys(log.details).length > 0;

  const level = log.level || "info";
  const type = log.type || "info";

  return (
    <div
      className={`border rounded-lg p-3 mb-2 ${
        logLevelColors[level] || "text-gray-600 bg-gray-50"
      } border-current/20`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <span className="mt-0.5">{levelIcons[level] || <Info className="h-4 w-4" />}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {logTypeLabels[type] || type}
              </Badge>
              {log.clientName && (
                <span className="text-xs font-medium text-gray-700">
                  {log.clientName}
                </span>
              )}
              {log.requestId && (
                <span className="text-xs text-gray-400 font-mono">
                  {log.requestId.substring(0, 8)}...
                </span>
              )}
            </div>
            <p className="text-sm mt-1 break-words">{log.message || "Sin mensaje"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(log.createdAt)} •{" "}
              {log.createdBy === "system" ? "Sistema" : log.createdBy || "Manual"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {hasDetails && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          {canDelete && onDelete && log.id && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              onClick={() => onDelete(log.id!)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      {expanded && hasDetails && (
        <div className="mt-2 pt-2 border-t border-current/20">
          <pre className="text-xs bg-black/5 rounded p-2 overflow-x-auto">
            {JSON.stringify(log.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function SatLogs() {
  const { isSuperAdmin, isAdmin } = useAuth();
  const [logs, setLogs] = useState<SatRequestLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | SatLogLevel>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [clients, setClients] = useState<Client[]>([]);

  const canDelete = isSuperAdmin || isAdmin;

  // Load clients for filter
  useEffect(() => {
    const loadClients = async () => {
      try {
        const allClients = await clientService.getAllClients();
        setClients(allClients);
      } catch (error) {
        console.error("Error loading clients:", error);
      }
    };
    loadClients();
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let fetchedLogs: SatRequestLog[];
      
      if (selectedClient !== "all") {
        fetchedLogs = await getLogsByClient(selectedClient, 500);
      } else {
        fetchedLogs = await getRecentLogs(500);
      }
      
      setLogs(fetchedLogs);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleDelete = async (logId: string) => {
    try {
      await deleteLog(logId);
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    } catch (error) {
      console.error("Error deleting log:", error);
    }
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    // Filter by level tab
    if (activeTab !== "all" && log.level !== activeTab) return false;
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesMessage = log.message?.toLowerCase().includes(searchLower);
      const matchesClient = log.clientName?.toLowerCase().includes(searchLower);
      const matchesClientId = log.clientId?.toLowerCase().includes(searchLower);
      const matchesRequestId = log.requestId?.toLowerCase().includes(searchLower);
      
      if (!matchesMessage && !matchesClient && !matchesClientId && !matchesRequestId) {
        return false;
      }
    }
    
    return true;
  });

  const counts = {
    all: logs.length,
    success: logs.filter((l) => l.level === "success").length,
    error: logs.filter((l) => l.level === "error").length,
    warning: logs.filter((l) => l.level === "warning").length,
    info: logs.filter((l) => l.level === "info").length,
  };

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
        {/* Header */}
        <div className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Logs SAT</h2>
            <p className="text-sm text-gray-500">
              Historial de operaciones con el SAT
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b bg-gray-50 flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar en logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Client filter */}
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Todos los clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.rfc} value={client.rfc}>
                  {client.nombres || client.name || client.rfc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stats */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">
              {filteredLogs.length} de {logs.length} logs
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        >
          <div className="px-6 py-2 border-b">
            <TabsList className="grid w-full max-w-lg grid-cols-5">
              <TabsTrigger value="all" className="text-xs">
                Todos ({counts.all})
              </TabsTrigger>
              <TabsTrigger
                value="success"
                className="text-xs data-[state=active]:text-green-600"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {counts.success}
              </TabsTrigger>
              <TabsTrigger
                value="error"
                className="text-xs data-[state=active]:text-red-600"
              >
                <XCircle className="h-3 w-3 mr-1" />
                {counts.error}
              </TabsTrigger>
              <TabsTrigger
                value="warning"
                className="text-xs data-[state=active]:text-yellow-600"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {counts.warning}
              </TabsTrigger>
              <TabsTrigger
                value="info"
                className="text-xs data-[state=active]:text-blue-600"
              >
                <Info className="h-3 w-3 mr-1" />
                {counts.info}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            <div className="p-6 max-h-[calc(100vh-350px)] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Info className="h-8 w-8 mb-2" />
                  <p>No hay logs para mostrar</p>
                  <p className="text-xs mt-1">
                    {searchTerm ? "Intenta con otro término de búsqueda" : "Los logs aparecerán aquí cuando haya actividad"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log) => (
                    <LogItem
                      key={log.id}
                      log={log}
                      onDelete={handleDelete}
                      canDelete={canDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
