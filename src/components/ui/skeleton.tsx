"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200",
        className
      )}
    />
  );
}

// Skeleton para una fila de tabla
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// Skeleton para tabla completa
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Skeleton para cards de resumen (3 cards)
export function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border rounded-lg p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

// Skeleton para página de mi-contabilidad
export function MiContabilidadSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/logoKontia.png"
                alt="Kontia"
                width={80}
                height={28}
                priority
              />
              <span className="text-gray-300">|</span>
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* Content skeleton */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Título */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>

        {/* Cards de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Tabla de declaraciones */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-4 border-b">
            <Skeleton className="h-6 w-48" />
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Mes', 'Estado', 'ISR', 'IVA', 'Total', 'Acción'].map((_, i) => (
                  <th key={i} className="px-4 py-3 text-left">
                    <Skeleton className="h-4 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-4"><Skeleton className="h-5 w-20" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-5 w-20" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-5 w-20" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-5 w-24" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-8 w-20 rounded" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

// Skeleton para página de dashboard
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <header className="bg-white shadow-sm border-b-2 border-gray-200">
        <div className="px-7 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <Skeleton className="h-7 w-20" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-24" />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* Content skeleton - lista de clientes */}
      <main className="p-0">
        <div className="bg-white">
          {/* Search bar */}
          <div className="px-7 py-3 bg-gray-100 border-b flex items-center gap-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-7 w-64" />
            <div className="ml-auto">
              <Skeleton className="h-7 w-32" />
            </div>
          </div>
          
          {/* Table */}
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Cliente', 'RFC', 'Usuario', 'Estado', 'Última Decl.'].map((_, i) => (
                  <th key={i} className="px-4 py-3 text-left">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-3"><Skeleton className="h-5 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-16 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
