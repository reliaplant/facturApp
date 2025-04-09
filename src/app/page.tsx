"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-4xl px-4 space-y-10 text-center">
        <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl md:text-7xl">
          Factur<span className="text-blue-600 dark:text-blue-400">App</span>
        </h1>
        
        <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
          Simplifica tu contabilidad y gestión fiscal con nuestra plataforma intuitiva.
          Administra facturas, declaraciones y expedientes fiscales en un solo lugar.
        </p>
        
        <div className="space-y-4">
          <Link href="/dashboard">
            <Button className="h-12 px-8 text-lg" size="lg">
              Ir al Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          
          <div className="text-sm text-gray-500 dark:text-gray-400 pt-4">
            Sistema de gestión fiscal y contable
          </div>
        </div>
      </div>
      
      <footer className="w-full mt-auto py-6 border-t border-gray-200 dark:border-gray-800">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © 2023 FacturApp. Todos los derechos reservados.
          </p>
          
          <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
            <Link href="#" className="hover:underline">Términos</Link>
            <Link href="#" className="hover:underline">Privacidad</Link>
            <Link href="#" className="hover:underline">Contacto</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
