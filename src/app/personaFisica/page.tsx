'use client';
import { useEffect, useState } from 'react';
import MobileDevicePF from './mobileDevPF';
import ScreenDeclaraciones from './mobileDevPFScreen/screenMensual';
import ScreenAnual from './mobileDevPFScreen/screenAnual';
import ScreenEmision from './mobileDevPFScreen/screenEmision';
import ScreenRecibidas from './mobileDevPFScreen/screenRecibidas';
import ScreenEmitidas from './mobileDevPFScreen/screenEmitidas';
import ScreenSimulacion from './mobileDevPFScreen/screenSimulacion';
import ScreenConstancia from './mobileDevPFScreen/screenConstancia';
import ScreenOpinion from './mobileDevPFScreen/screenOpinion';
import ScreenHistorial from './mobileDevPFScreen/screenHistorial';
import ScreenDeducciones from './mobileDevPFScreen/screenDeducciones';
import ScreenAsesoria from './mobileDevPFScreen/screenAsesoria';

export default function PersonaFisicaPage() {
  const [activeSection, setActiveSection] = useState('');

  const includedServices = [
    {
      title: "Declaraciones mensuales",
      description: "Cálculo y presentación de impuestos mensuales",
      id: "declaraciones"
    },
    {
      title: "Declaración anual",
      description: "Preparación completa de tu declaración",
      id: "anual"
    },
    {
      title: "Emisión de facturas",
      description: "Generación de CFDIs versión 4.0",
      id: "emision"
    },
    {
      title: "Revisión facturas recibidas",
      description: "Validación de facturas de proveedores",
      id: "recibidas"
    },
    {
      title: "Revisión facturas emitidas",
      description: "Control y seguimiento de tus ingresos",
      id: "emitidas"
    },
    {
      title: "Simulación de impuestos",
      description: "Planificación tributaria anticipada",
      id: "simulacion"
    },
    {
      title: "Constancia fiscal",
      description: "Obtención de constancia actualizada del SAT",
      id: "constancia"
    },
    {
      title: "Opinión de cumplimiento",
      description: "Verificación de estatus ante el SAT",
      id: "opinion"
    },
    {
      title: "Acceso a historial",
      description: "Consulta tus declaraciones anteriores",
      id: "historial"
    },
    {
      title: "Asesoría continua",
      description: "Consultas ilimitadas con expertos fiscales",
      id: "asesoria"
    }
  ];

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const sections = document.querySelectorAll('section[id]');
    
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
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
      case 'emision':
        return <ScreenEmision />;
      case 'recibidas':
        return <ScreenRecibidas />;
      case 'emitidas':
        return <ScreenEmitidas />;
      case 'simulacion':
        return <ScreenSimulacion />;
      case 'constancia':
        return <ScreenConstancia />;
      case 'opinion':
        return <ScreenOpinion />;
      case 'historial':
        return <ScreenHistorial />;
      case 'deducciones':
        return <ScreenDeducciones />;
      case 'asesoria':
        return <ScreenAsesoria />;
      default:
        return <ScreenDeclaraciones />;
    }
  };

  return (
    <div className="mt-16 py-16  max-w-7xl mx-auto">
      <div className="mb-16 flex flex-col items-center">
        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-sky-100 text-sky-800 mb-4">
          Servicio contable
        </span>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Contabilidad para Personas Físicas
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl text-center">
          Gestiona tus impuestos de manera eficiente y cumple con tus obligaciones ante el SAT con nuestro servicio integral de contabilidad.
        </p>
      </div>

      {/* Contenedor principal con altura fija */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative"> {/* altura total menos altura del menú */}
        {/* Sidebar izquierdo */}
        <div className="lg:col-span-3">
          <div className="sticky top-48 max-h-[calc(100vh-6rem)]"> {/* Altura máxima y sticky normal */}
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
                      {/* <p className="text-xs text-gray-500">{service.description}</p> */}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Contenido principal - mantiene su scroll */}
        <div className="lg:col-span-6 lg:px-8">
          <div className="space-y-40"> {/* Espaciado uniforme entre secciones */}
            <section id="declaraciones" className="min-h-[50vh] flex items-center transition-all duration-700 transform scroll-mt-32">
              <div className={`${activeSection === 'declaraciones' ? 'opacity-100 translate-y-0' : 'opacity-30 -translate-y-4'} transition-all duration-500`}>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Declaraciones Mensuales
                </h2>
                <div className="prose prose-lg text-gray-600">
                  <p>
                    Nos encargamos del cálculo y presentación de tus declaraciones provisionales
                    mensuales ante el SAT. Incluye:
                  </p>
                  <ul className="space-y-4">
                    <li>Cálculo de IVA mensual (16%)</li>
                    <li>Determinación de ISR provisional según régimen fiscal</li>
                    <li>Presentación en la plataforma del SAT en tiempo y forma</li>
                    <li>Cálculo correcto de retenciones de ISR e IVA</li>
                    <li>Avisos de fechas límite según calendario del SAT</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="anual" className="min-h-[50vh] flex items-center transition-all duration-700 transform scroll-mt-32">
              <div className={`${activeSection === 'anual' ? 'opacity-100 translate-y-0' : 'opacity-30 -translate-y-4'} transition-all duration-500`}>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Declaración Anual
                </h2>
                <div className="prose prose-lg text-gray-600">
                  <p>
                    Preparamos tu declaración anual optimizando al máximo tus deducciones
                    personales conforme a la legislación fiscal vigente:
                  </p>
                  <ul className="space-y-4">
                    <li>Integración anual de ingresos y gastos</li>
                    <li>Aplicación de deducciones personales (gastos médicos, intereses hipotecarios, etc.)</li>
                    <li>Cálculo de impuesto anual según tablas vigentes del ISR</li>
                    <li>Aplicación de estímulos fiscales aplicables</li>
                    <li>Presentación en el aplicativo DeclaraSAT</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="emision" className="min-h-[50vh] flex items-center transition-all duration-700 transform scroll-mt-32">
              <div className={`${activeSection === 'emision' ? 'opacity-100 translate-y-0' : 'opacity-30 -translate-y-4'} transition-all duration-500`}>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Emisión de Facturas
                </h2>
                <div className="prose prose-lg text-gray-600">
                  <p>
                    Facilitamos la emisión de facturas CFDI 4.0 cumpliendo con todos los requisitos fiscales:
                  </p>
                  <ul className="space-y-4">
                    <li>Emisión de CFDI de Ingreso, Egreso, Nómina y otros</li>
                    <li>Inclusión de complementos requeridos según el tipo de operación</li>
                    <li>Validación automática de datos fiscales de tus clientes</li>
                    <li>Envío directo a tus clientes por correo</li>
                    <li>Emisiones ilimitadas de facturas dentro de tu plan</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="recibidas" className="min-h-[50vh] flex items-center transition-all duration-700 transform scroll-mt-32">
              <div className={`${activeSection === 'recibidas' ? 'opacity-100 translate-y-0' : 'opacity-30 -translate-y-4'} transition-all duration-500`}>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Revisión de Facturas Recibidas
                </h2>
                <div className="prose prose-lg text-gray-600">
                  <p>
                    Verificamos y procesamos todas las facturas que recibes de tus proveedores:
                  </p>
                  <ul className="space-y-4">
                    <li>Validación en tiempo real con el SAT</li>
                    <li>Verificación de requisitos fiscales completos</li>
                    <li>Clasificación por tipo de gasto para deducciones</li>
                    <li>Alertas de facturas apócrifas o de contribuyentes en lista negra</li>
                    <li>Organización por categorías fiscales</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="emitidas" className="min-h-[50vh] flex items-center transition-all duration-700 transform scroll-mt-32">
              <div className={`${activeSection === 'emitidas' ? 'opacity-100 translate-y-0' : 'opacity-30 -translate-y-4'} transition-all duration-500`}>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Revisión de Facturas Emitidas
                </h2>
                <div className="prose prose-lg text-gray-600">
                  <p>
                    Monitoreamos y gestionamos todas tus facturas emitidas:
                  </p>
                  <ul className="space-y-4">
                    <li>Registro y control de ingresos facturados</li>
                    <li>Seguimiento de facturas pagadas y pendientes</li>
                    <li>Verificación de complementos de pago requeridos</li>
                    <li>Control de cancelaciones según normativa vigente</li>
                    <li>Reportes mensuales de facturación</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="simulacion" className="min-h-[50vh] flex items-center transition-all duration-700 transform scroll-mt-32">
              <div className={`${activeSection === 'simulacion' ? 'opacity-100 translate-y-0' : 'opacity-30 -translate-y-4'} transition-all duration-500`}>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Simulación de Impuestos
                </h2>
                <div className="prose prose-lg text-gray-600">
                  <p>
                    Proyecta tus obligaciones fiscales futuras y planifica tus pagos:
                  </p>
                  <ul className="space-y-4">
                    <li>Cálculo predictivo de impuestos según ingresos estimados</li>
                    <li>Simulación de escenarios fiscales</li>
                    <li>Proyección de IVA e ISR a pagar</li>
                    <li>Recomendaciones para optimización fiscal</li>
                    <li>Planificación de flujo de efectivo para obligaciones fiscales</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="constancia" className="min-h-[50vh] flex items-center transition-all duration-700 transform scroll-mt-32">
              <div className={`${activeSection === 'constancia' ? 'opacity-100 translate-y-0' : 'opacity-30 -translate-y-4'} transition-all duration-500`}>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Constancia Fiscal Actualizada
                </h2>
                <div className="prose prose-lg text-gray-600">
                  <p>
                    Obtenemos y mantenemos actualizada tu constancia de situación fiscal:
                  </p>
                  <ul className="space-y-4">
                    <li>Descarga directa desde el portal del SAT</li>
                    <li>Verificación de datos registrales correctos</li>
                    <li>Validación de régimen fiscal apropiado</li>
                    <li>Gestión de actualizaciones cuando sea necesario</li>
                    <li>Disponibilidad inmediata para trámites fiscales</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="opinion" className="min-h-[50vh] flex items-center transition-all duration-700 transform scroll-mt-32">
              <div className={`${activeSection === 'opinion' ? 'opacity-100 translate-y-0' : 'opacity-30 -translate-y-4'} transition-all duration-500`}>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Opinión de Cumplimiento
                </h2>
                <div className="prose prose-lg text-gray-600">
                  <p>
                    Monitoreamos y mantenemos positiva tu opinión de cumplimiento ante el SAT:
                  </p>
                  <ul className="space-y-4">
                    <li>Obtención periódica de la opinión de cumplimiento</li>
                    <li>Verificación preventiva de obligaciones fiscales</li>
                    <li>Resolución de discrepancias con el SAT</li>
                    <li>Alertas ante posibles incumplimientos</li>
                    <li>Asistencia para mantener el estatus positivo</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="historial" className="min-h-[50vh] flex items-center transition-all duration-700 transform scroll-mt-32">
              <div className={`${activeSection === 'historial' ? 'opacity-100 translate-y-0' : 'opacity-30 -translate-y-4'} transition-all duration-500`}>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Acceso a Historial
                </h2>
                <div className="prose prose-lg text-gray-600">
                  <p>
                    Mantén un registro completo y accesible de toda tu información fiscal:
                  </p>
                  <ul className="space-y-4">
                    <li>Repositorio digital de todas tus declaraciones</li>
                    <li>Archivo organizado de facturas emitidas y recibidas</li>
                    <li>Seguimiento histórico de pagos de impuestos</li>
                    <li>Consulta de declaraciones complementarias</li>
                    <li>Respaldo seguro y cumplimiento con conservación de 5 años</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="asesoria" className="min-h-[50vh] flex items-center transition-all duration-700 transform scroll-mt-32">
              <div className={`${activeSection === 'asesoria' ? 'opacity-100 translate-y-0' : 'opacity-30 -translate-y-4'} transition-all duration-500`}>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Asesoría Continua
                </h2>
                <div className="prose prose-lg text-gray-600">
                  <p>
                    Contarás con expertos fiscales para resolver todas tus dudas:
                  </p>
                  <ul className="space-y-4">
                    <li>Consultas ilimitadas con contadores certificados</li>
                    <li>Orientación sobre reformas fiscales y su impacto</li>
                    <li>Resolución de requerimientos del SAT</li>
                    <li>Asesoría en cambios de régimen fiscal</li>
                    <li>Recomendaciones de planificación fiscal personalizada</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>
        
        {/* Teléfono móvil */}
        <div className="lg:col-span-3">
            <div className="sticky top-[calc(50vh-18rem)] max-h-[calc(100vh-12rem)]"> {/* Centrado vertical considerando altura del menú */}
            <MobileDevicePF>
              {getScreenComponent()}
            </MobileDevicePF>
          </div>
        </div>
      </div>
    </div>
  );
}
