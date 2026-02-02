'use client';
import { useEffect, useState } from 'react';
import MobileDevicePF from './mobileDevPF';
import ScreenDeclaraciones from './mobileDevPFScreen/screenMensual';
import ScreenAnual from './mobileDevPFScreen/screenAnual';
import ScreenFacturas from './mobileDevPFScreen/screenFacturas';
import ScreenActivos from './mobileDevPFScreen/screenActivos';
import ScreenExtranjeras from './mobileDevPFScreen/screenExtranjeras';
import ScreenResumen from './mobileDevPFScreen/screenResumen';
import ScreenPortal from './mobileDevPFScreen/screenPortal';

export default function PersonaFisicaPage() {
  const [activeSection, setActiveSection] = useState('');

  const includedServices = [
    {
      title: "Declaraciones mensuales",
      description: "Cálculo y presentación de ISR e IVA cada mes",
      id: "declaraciones"
    },
    {
      title: "Declaración anual",
      description: "Preparación y presentación de tu anual",
      id: "anual"
    },
    {
      title: "Control de facturas",
      description: "Seguimiento de facturas emitidas y recibidas",
      id: "facturas"
    },
    {
      title: "Activos fijos",
      description: "Control de activos y depreciación fiscal",
      id: "activos"
    },
    {
      title: "Facturas extranjeras",
      description: "Registro de pagos a proveedores del exterior",
      id: "extranjeras"
    },
    {
      title: "Resumen fiscal",
      description: "Ingresos, gastos y utilidad en tiempo real",
      id: "resumen"
    },
    {
      title: "Portal Mi Contabilidad",
      description: "Acceso 24/7 a toda tu información fiscal",
      id: "portal"
    }
  ];

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const sections = document.querySelectorAll('section[id]');
    
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection((entry.target as HTMLElement).id);
        }
      });
    };

    const observerOptions = {
      threshold: 0.4, // Punto de activación cuando el 40% de la sección es visible
      rootMargin: '-25% 0px -25% 0px' // Ventana de observación centrada
    };

    sections.forEach(section => {
      const observer = new IntersectionObserver(observerCallback, observerOptions);
      observer.observe(section);
      observers.push(observer);
    });

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, []);

  // Get the appropriate screen component based on active section
  const getScreenComponent = () => {
    switch(activeSection) {
      case 'declaraciones':
        return <ScreenDeclaraciones />;
      case 'anual':
        return <ScreenAnual />;
      case 'facturas':
        return <ScreenFacturas />;
      case 'activos':
        return <ScreenActivos />;
      case 'extranjeras':
        return <ScreenExtranjeras />;
      case 'resumen':
        return <ScreenResumen />;
      case 'portal':
        return <ScreenPortal />;
      default:
        return <ScreenDeclaraciones />;
    }
  };

  return (
    <div className="mt-8 md:mt-16 py-8 md:py-16 max-w-7xl mx-auto px-4 md:px-6">
      <div className="mb-8 md:mb-16 flex flex-col items-center">
        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-sky-100 text-sky-800 mb-4">
          Servicio contable
        </span>
        <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 text-center">
          Contabilidad para Personas Físicas
        </h1>
        <p className="text-base md:text-xl text-gray-500 max-w-2xl text-center">
          Gestiona tus impuestos de manera eficiente y cumple con tus obligaciones ante el SAT.
        </p>
      </div>

      {/* Contenedor principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 relative">
        {/* Sidebar izquierdo - hidden on mobile */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="sticky top-48 max-h-[calc(100vh-6rem)]">
            <div className="pt-1 pb-6 pr-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Servicios incluidos
              </h2>
              <ul className="space-y-6">
                {includedServices.map((service) => (
                  <li 
                    key={service.id} 
                    className={`flex items-start transition-all duration-300 ${
                      activeSection === service.id ? 'scale-105 text-purple-500' : 'opacity-75 hover:opacity-100'
                    }`}
                  >
                    <svg 
                      className={`h-6 w-6 flex-shrink-0 ${
                        activeSection === service.id 
                          ? 'text-purple-500' 
                          : 'text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-purple-500'
                      }`} 
                      fill={activeSection === service.id ? 'none' : 'currentColor'}
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${
                        activeSection === service.id ? 'text-purple-500' : 'text-gray-900'
                      }`}>
                        {service.title}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="lg:col-span-6 lg:px-8">
          <div className="space-y-12 md:space-y-24 lg:space-y-40">
            <section id="declaraciones" className="min-h-0 lg:min-h-[50vh] flex items-start lg:items-center transition-all duration-700 transform scroll-mt-24">
              <div className={`${activeSection === 'declaraciones' ? 'opacity-100 translate-y-0' : 'lg:opacity-30 lg:-translate-y-4'} transition-all duration-500`}>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
                  Declaraciones Mensuales
                </h2>
                <div className="prose prose-sm md:prose-lg text-gray-600">
                  <p className="text-sm md:text-base">
                    Nos encargamos del cálculo y presentación de tus declaraciones provisionales
                    mensuales ante el SAT.
                  </p>
                  <ul className="space-y-2 md:space-y-3 text-sm md:text-base">
                    <li>Cálculo de IVA mensual (16%)</li>
                    <li>Determinación de ISR provisional</li>
                    <li>Presentación en tiempo y forma</li>
                    <li>Línea de captura lista para pagar</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="anual" className="min-h-0 lg:min-h-[50vh] flex items-start lg:items-center transition-all duration-700 transform scroll-mt-24">
              <div className={`${activeSection === 'anual' ? 'opacity-100 translate-y-0' : 'lg:opacity-30 lg:-translate-y-4'} transition-all duration-500`}>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
                  Declaración Anual
                </h2>
                <div className="prose prose-sm md:prose-lg text-gray-600">
                  <p className="text-sm md:text-base">
                    Preparamos tu declaración anual optimizando tus deducciones personales.
                  </p>
                  <ul className="space-y-2 md:space-y-3 text-sm md:text-base">
                    <li>Integración anual de ingresos y gastos</li>
                    <li>Deducciones personales (médicos, educación)</li>
                    <li>Aplicación de saldos a favor</li>
                    <li>Presentación en DeclaraSAT</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="facturas" className="min-h-0 lg:min-h-[50vh] flex items-start lg:items-center transition-all duration-700 transform scroll-mt-24">
              <div className={`${activeSection === 'facturas' ? 'opacity-100 translate-y-0' : 'lg:opacity-30 lg:-translate-y-4'} transition-all duration-500`}>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
                  Control de Facturas
                </h2>
                <div className="prose prose-sm md:prose-lg text-gray-600">
                  <p className="text-sm md:text-base">
                    Control de facturas emitidas y recibidas del SAT:
                  </p>
                  <ul className="space-y-2 md:space-y-3 text-sm md:text-base">
                    <li>Descarga automática del SAT</li>
                    <li>Ingresos por cliente, gastos por proveedor</li>
                    <li>Identificación de deducibles</li>
                    <li>Consulta en tiempo real</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="activos" className="min-h-0 lg:min-h-[50vh] flex items-start lg:items-center transition-all duration-700 transform scroll-mt-24">
              <div className={`${activeSection === 'activos' ? 'opacity-100 translate-y-0' : 'lg:opacity-30 lg:-translate-y-4'} transition-all duration-500`}>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
                  Activos Fijos
                </h2>
                <div className="prose prose-sm md:prose-lg text-gray-600">
                  <p className="text-sm md:text-base">
                    Control y depreciación fiscal de tus activos:
                  </p>
                  <ul className="space-y-2 md:space-y-3 text-sm md:text-base">
                    <li>Registro de equipo, mobiliario y maquinaria</li>
                    <li>Depreciación según tasas fiscales</li>
                    <li>Deducción mensual automática</li>
                    <li>Historial de activos</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="extranjeras" className="min-h-0 lg:min-h-[50vh] flex items-start lg:items-center transition-all duration-700 transform scroll-mt-24">
              <div className={`${activeSection === 'extranjeras' ? 'opacity-100 translate-y-0' : 'lg:opacity-30 lg:-translate-y-4'} transition-all duration-500`}>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
                  Facturas Extranjeras
                </h2>
                <div className="prose prose-sm md:prose-lg text-gray-600">
                  <p className="text-sm md:text-base">
                    Pagos a proveedores del exterior como gastos deducibles:
                  </p>
                  <ul className="space-y-2 md:space-y-3 text-sm md:text-base">
                    <li>Registro de Adobe, AWS, etc.</li>
                    <li>Conversión a pesos mexicanos</li>
                    <li>Clasificación deducible</li>
                    <li>Integración con facturas nacionales</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="resumen" className="min-h-0 lg:min-h-[50vh] flex items-start lg:items-center transition-all duration-700 transform scroll-mt-24">
              <div className={`${activeSection === 'resumen' ? 'opacity-100 translate-y-0' : 'lg:opacity-30 lg:-translate-y-4'} transition-all duration-500`}>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
                  Resumen Fiscal
                </h2>
                <div className="prose prose-sm md:prose-lg text-gray-600">
                  <p className="text-sm md:text-base">
                    Tu situación fiscal en tiempo real:
                  </p>
                  <ul className="space-y-2 md:space-y-3 text-sm md:text-base">
                    <li>Ingresos facturados del año</li>
                    <li>Gastos deducibles acumulados</li>
                    <li>Utilidad fiscal</li>
                    <li>ISR e IVA pagado</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="portal" className="min-h-0 lg:min-h-[50vh] flex items-start lg:items-center transition-all duration-700 transform scroll-mt-24">
              <div className={`${activeSection === 'portal' ? 'opacity-100 translate-y-0' : 'lg:opacity-30 lg:-translate-y-4'} transition-all duration-500`}>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
                  Portal Mi Contabilidad
                </h2>
                <div className="prose prose-sm md:prose-lg text-gray-600">
                  <p className="text-sm md:text-base">
                    Acceso 24/7 a toda tu información fiscal:
                  </p>
                  <ul className="space-y-2 md:space-y-3 text-sm md:text-base">
                    <li>Consulta tu RFC y régimen</li>
                    <li>Descarga líneas de captura</li>
                    <li>Revisa todas tus facturas</li>
                    <li>Constancia de Situación Fiscal</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>
        
        {/* Teléfono móvil - hidden on mobile */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="sticky top-[calc(50vh-18rem)] max-h-[calc(100vh-12rem)]">
            <MobileDevicePF>
              {getScreenComponent()}
            </MobileDevicePF>
          </div>
        </div>
      </div>
    </div>
  );
}
