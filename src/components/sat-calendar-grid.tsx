import React, { useMemo, useState } from "react";
import { SatRequest } from "@/models/SatRequest";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SatCalendarGridProps {
  requests: SatRequest[];
  year: number;
  onYearChange?: (year: number) => void;
}

type DayStatus = "processed" | "ready" | "pending" | "error" | "no-invoices" | "none";

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const DAYS_IN_MONTH: Record<number, number> = {
  1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30,
  7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31,
};

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(month: number, year: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return DAYS_IN_MONTH[month];
}

/**
 * Extrae la fecha YYYY-MM-DD del campo `from` que tiene formato "YYYY-MM-DD HH:MM:SS"
 */
function extractDate(fromOrTo: string): string {
  if (fromOrTo.includes(" ")) return fromOrTo.split(" ")[0];
  return fromOrTo;
}

/**
 * Determina el estado de un día basándose en las solicitudes SAT
 */
function getDayStatus(request: SatRequest | undefined): DayStatus {
  if (!request) return "none";

  if (request.packagesProcessed && !request.processedWithErrors && !request.error) {
    return "processed";
  }
  if (request.processedWithErrors || request.error || request.verifyError || request.downloadError) {
    return "error";
  }
  if (request.completed && request.packageIds?.length === 0) {
    return "no-invoices";
  }
  if (
    request.completed ||
    request.status === "3" ||
    request.status === "Finished" ||
    request.status === "finished" ||
    request.packagesDownloaded
  ) {
    return "ready";
  }
  // pending / in_progress / requested
  return "pending";
}

const STATUS_COLORS: Record<DayStatus, string> = {
  processed: "bg-green-500/70",
  ready: "bg-blue-400/70",
  pending: "bg-amber-400/70",
  error: "bg-red-400/70",
  "no-invoices": "bg-green-200/70",
  none: "",
};

const STATUS_LABELS: Record<DayStatus, string> = {
  processed: "Procesado",
  ready: "Listo para importar",
  pending: "Pendiente / En proceso",
  error: "Error",
  "no-invoices": "Sin facturas",
  none: "No solicitado",
};

const SatCalendarGrid: React.FC<SatCalendarGridProps> = ({
  requests,
  year,
  onYearChange,
}) => {
  const [viewType, setViewType] = useState<"issued" | "received" | "both">("both");

  /**
   * Construye un mapa: "YYYY-MM-DD" -> { issued: SatRequest, received: SatRequest }
   * Solo toma en cuenta solicitudes de 1 día (from y to del mismo día)
   */
  const dayMap = useMemo(() => {
    const map: Record<string, { issued?: SatRequest; received?: SatRequest }> = {};

    for (const req of requests) {
      if (!req.from || !req.to) continue;
      const fromDate = extractDate(req.from);
      const toDate = extractDate(req.to);

      // Solo solicitudes de 1 día
      if (fromDate !== toDate) {
        // Para solicitudes de rango largo, marcar todos los días dentro del rango
        const [fy, fm, fd] = fromDate.split("-").map(Number);
        const [ty, tm, td] = toDate.split("-").map(Number);
        const start = new Date(fy, fm - 1, fd, 12, 0, 0);
        const end = new Date(ty, tm - 1, td, 12, 0, 0);
        const current = new Date(start);
        while (current <= end) {
          const y = current.getFullYear();
          const m = String(current.getMonth() + 1).padStart(2, "0");
          const d = String(current.getDate()).padStart(2, "0");
          const key = `${y}-${m}-${d}`;
          if (!map[key]) map[key] = {};
          const type = req.downloadType || "received";
          // Solo sobreescribir si no hay uno con mejor estado
          if (!map[key][type]) {
            map[key][type] = req;
          }
          current.setDate(current.getDate() + 1);
        }
        continue;
      }

      const key = fromDate;
      if (!map[key]) map[key] = {};
      const type = req.downloadType || "received";

      // Si ya hay uno para este día y tipo, quedarse con el de mejor estado
      const existing = map[key][type];
      if (existing) {
        const existingStatus = getDayStatus(existing);
        const newStatus = getDayStatus(req);
        const priority: DayStatus[] = ["processed", "no-invoices", "ready", "pending", "error", "none"];
        if (priority.indexOf(newStatus) < priority.indexOf(existingStatus)) {
          map[key][type] = req;
        }
      } else {
        map[key][type] = req;
      }
    }
    return map;
  }, [requests]);

  /**
   * Determina el estado combinado de un día para la vista "both"
   */
  function getCombinedStatus(dayKey: string): DayStatus {
    const entry = dayMap[dayKey];
    if (!entry) return "none";

    if (viewType === "issued") return getDayStatus(entry.issued);
    if (viewType === "received") return getDayStatus(entry.received);

    // "both" - combinar: el peor estado de los dos
    const issuedStatus = getDayStatus(entry.issued);
    const receivedStatus = getDayStatus(entry.received);

    // Si ninguno tiene datos, none
    if (issuedStatus === "none" && receivedStatus === "none") return "none";
    // Si solo uno tiene datos, mostrar ese
    if (issuedStatus === "none") return receivedStatus;
    if (receivedStatus === "none") return "none"; // Falta uno de los dos

    // Ambos tienen datos: mostrar el peor
    const priority: DayStatus[] = ["error", "pending", "ready", "no-invoices", "processed"];
    for (const status of priority) {
      if (issuedStatus === status || receivedStatus === status) return status;
    }
    return "processed";
  }

  /**
   * Para la vista "both", determina si hay dos semáforos (split cell)
   */
  function getSplitStatus(dayKey: string): { issued: DayStatus; received: DayStatus } | null {
    if (viewType !== "both") return null;
    const entry = dayMap[dayKey];
    if (!entry) return null;

    const issuedStatus = getDayStatus(entry.issued);
    const receivedStatus = getDayStatus(entry.received);

    // Solo split si al menos uno tiene datos
    if (issuedStatus === "none" && receivedStatus === "none") return null;
    return { issued: issuedStatus, received: receivedStatus };
  }

  // Determinar si la fecha ya pasó (para no mostrar los días futuros como "faltantes")
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Estadísticas
  const stats = useMemo(() => {
    let total = 0;
    let synced = 0; // processed + no-invoices
    let pending = 0;
    let errors = 0;
    let missing = 0;

    for (let month = 1; month <= 12; month++) {
      const daysInMonth = getDaysInMonth(month, year);
      for (let day = 1; day <= daysInMonth; day++) {
        const dayKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (dayKey >= todayStr) continue; // Ignorar días futuros
        total++;

        if (viewType === "both") {
          const split = getSplitStatus(dayKey);
          if (!split) {
            missing++;
            continue;
          }
          const worst = getCombinedStatus(dayKey);
          if (worst === "processed" || worst === "no-invoices") synced++;
          else if (worst === "error") errors++;
          else if (worst === "pending" || worst === "ready") pending++;
          else missing++;
        } else {
          const status = getCombinedStatus(dayKey);
          if (status === "processed" || status === "no-invoices") synced++;
          else if (status === "error") errors++;
          else if (status === "pending" || status === "ready") pending++;
          else missing++;
        }
      }
    }
    return { total, synced, pending, errors, missing };
  }, [dayMap, year, viewType, todayStr]);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-100 dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium">Calendario de Sincronización</h3>
          
          {/* Year selector */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onYearChange?.(year - 1)}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold min-w-[3rem] text-center">{year}</span>
            <button
              onClick={() => onYearChange?.(year + 1)}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              disabled={year >= today.getFullYear()}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View type selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 p-0.5">
            {(["both", "issued", "received"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                  viewType === type
                    ? "bg-blue-500 text-white"
                    : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {type === "both" ? "Ambas" : type === "issued" ? "Emitidas" : "Recibidas"}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />
              {stats.synced}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" />
              {stats.pending}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />
              {stats.errors}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-gray-200 inline-block border border-gray-300" />
              {stats.missing}
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left font-medium text-gray-500 bg-gray-50 dark:bg-gray-900 sticky left-0 z-10 border-r border-gray-200 dark:border-gray-700 w-10">
                Mes
              </th>
              {Array.from({ length: 31 }, (_, i) => (
                <th
                  key={i + 1}
                  className="px-0 py-1 text-center font-medium text-gray-400 bg-gray-50 dark:bg-gray-900 min-w-[24px]"
                >
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 12 }, (_, monthIdx) => {
              const month = monthIdx + 1;
              const daysInMonth = getDaysInMonth(month, year);

              return (
                <tr key={month} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-2 py-0.5 font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 sticky left-0 z-10 border-r border-gray-200 dark:border-gray-700">
                    {MONTH_NAMES[monthIdx]}
                  </td>
                  {Array.from({ length: 31 }, (_, dayIdx) => {
                    const day = dayIdx + 1;

                    // Día no existe en este mes (imposible)
                    if (day > daysInMonth) {
                      return (
                        <td
                          key={day}
                          className="bg-gray-400 dark:bg-gray-600 border border-gray-300 dark:border-gray-500"
                        />
                      );
                    }

                    const dayKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isFuture = dayKey >= todayStr;

                    if (isFuture) {
                      return (
                        <td key={day} className="border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />
                      );
                    }

                    const split = getSplitStatus(dayKey);

                    if (split && viewType === "both") {
                      return (
                        <td key={day} className="border border-gray-100 dark:border-gray-700 p-0 h-6 relative overflow-hidden cursor-pointer">
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-full h-full relative">
                                  <div
                                    className={`absolute inset-0 ${STATUS_COLORS[split.issued]}`}
                                    style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
                                  />
                                  <div
                                    className={`absolute inset-0 ${STATUS_COLORS[split.received]}`}
                                    style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-[10px] p-2">
                                <p className="font-semibold mb-1">{day} {MONTH_NAMES[monthIdx]} {year}</p>
                                <p>▲ Emitidas: {STATUS_LABELS[split.issued]}</p>
                                <p>▼ Recibidas: {STATUS_LABELS[split.received]}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      );
                    }

                    // Single color cell
                    const status = getCombinedStatus(dayKey);
                    return (
                      <td
                        key={day}
                        className={`border border-gray-100 dark:border-gray-700 h-6 cursor-pointer ${STATUS_COLORS[status]}`}
                      >
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-full h-full" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px] p-2">
                              <p className="font-semibold">{day} {MONTH_NAMES[monthIdx]} {year}</p>
                              <p>{STATUS_LABELS[status]}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />
          Procesado
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-200 inline-block border border-green-300" />
          Sin facturas
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" />
          Listo
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
          Pendiente
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />
          Error
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-white border border-gray-300 inline-block" />
          No solicitado
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-gray-400 inline-block" />
          N/A
        </span>
        {viewType === "both" && (
          <span className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-300">
            <span className="inline-block w-3 h-3 rounded-sm overflow-hidden relative border border-gray-300">
              <span className="absolute top-0 left-0 w-full h-full bg-green-500" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
              <span className="absolute top-0 left-0 w-full h-full bg-amber-400" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
            </span>
            ▲ Emitida / ▼ Recibida
          </span>
        )}
      </div>

      {/* Explicación del proceso */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 space-y-1.5">
        <p className="font-semibold text-gray-600 dark:text-gray-300 text-xs">¿Cómo funciona?</p>
        <ol className="list-decimal list-inside space-y-1 leading-relaxed">
          <li className="flex items-start gap-1.5">
            <span className="shrink-0 mt-0.5">1.</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shrink-0 inline-block" />
              <span><span className="font-medium text-gray-600 dark:text-gray-300">Solicitud automática</span> — Cada día a las 4:00 AM se solicitan al SAT los XMLs del día anterior (emitidas y recibidas). Queda en <span className="font-medium">ámbar</span> mientras el SAT procesa.</span>
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="shrink-0 mt-0.5">2.</span>
            <span className="inline-flex items-start gap-1.5">
              <span className="flex shrink-0 gap-0.5 mt-0.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" />
                <span className="w-2.5 h-2.5 rounded-sm bg-green-200 border border-green-300 inline-block" />
              </span>
              <span><span className="font-medium text-gray-600 dark:text-gray-300">Verificación</span> — Cada 2 horas se verifica si el SAT preparó los paquetes. Si hay facturas queda en <span className="font-medium">azul</span> (listo); si no hubo facturas ese día queda en <span className="font-medium">verde claro</span>.</span>
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="shrink-0 mt-0.5">3.</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500 shrink-0 inline-block" />
              <span><span className="font-medium text-gray-600 dark:text-gray-300">Importación</span> — Se descargan los ZIPs, se extraen los XMLs y se guardan como CFDIs en el sistema. Queda en <span className="font-medium">verde</span>.</span>
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="shrink-0 mt-0.5">4.</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-400 shrink-0 inline-block" />
              <span><span className="font-medium text-gray-600 dark:text-gray-300">Error</span> — Si algo falla en cualquier paso, se marca en <span className="font-medium">rojo</span>.</span>
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
};

export default SatCalendarGrid;
