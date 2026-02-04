"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  Trash2,
} from "lucide-react";
import {
  SatRequestLog,
  logTypeLabels,
  logLevelColors,
  SatLogLevel,
} from "@/models/SatRequestLog";
import {
  getLogsByClient,
  getRecentLogs,
  deleteLog,
} from "@/services/sat-log-service";
import { useAuth } from "@/contexts/AuthContext";

interface SatLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
}

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

  // Safely get level with fallback
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
                <span className="text-xs text-muted-foreground">
                  {log.clientName}
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

export function SatLogsModal({
  isOpen,
  onClose,
  clientId,
  clientName,
}: SatLogsModalProps) {
  const { isSuperAdmin, isAdmin } = useAuth();
  const [logs, setLogs] = useState<SatRequestLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | SatLogLevel>("all");

  const canDelete = isSuperAdmin || isAdmin;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedLogs = clientId
        ? await getLogsByClient(clientId, 200)
        : await getRecentLogs(200);
      setLogs(fetchedLogs);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, loadLogs]);

  const handleDelete = async (logId: string) => {
    try {
      await deleteLog(logId);
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    } catch (error) {
      console.error("Error deleting log:", error);
    }
  };

  const filteredLogs =
    activeTab === "all" ? logs : logs.filter((log) => log.level === activeTab);

  const counts = {
    all: logs.length,
    success: logs.filter((l) => l.level === "success").length,
    error: logs.filter((l) => l.level === "error").length,
    warning: logs.filter((l) => l.level === "warning").length,
    info: logs.filter((l) => l.level === "info").length,
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              Logs SAT {clientName ? `- ${clientName}` : "- Todos los clientes"}
            </span>
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
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="text-xs">
              Todos ({counts.all})
            </TabsTrigger>
            <TabsTrigger
              value="success"
              className="text-xs text-green-600 data-[state=active]:text-green-600"
            >
              Éxito ({counts.success})
            </TabsTrigger>
            <TabsTrigger
              value="error"
              className="text-xs text-red-600 data-[state=active]:text-red-600"
            >
              Error ({counts.error})
            </TabsTrigger>
            <TabsTrigger
              value="warning"
              className="text-xs text-yellow-600 data-[state=active]:text-yellow-600"
            >
              Aviso ({counts.warning})
            </TabsTrigger>
            <TabsTrigger
              value="info"
              className="text-xs text-blue-600 data-[state=active]:text-blue-600"
            >
              Info ({counts.info})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="h-[50vh] overflow-y-auto pr-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Info className="h-8 w-8 mb-2" />
                  <p>No hay logs para mostrar</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <LogItem
                    key={log.id}
                    log={log}
                    onDelete={handleDelete}
                    canDelete={canDelete}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
