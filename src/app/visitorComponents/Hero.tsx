'use client';

import ContactButton from "./ContactButton";
import MobileDevice from "./MobileDevice";

export default function Hero() {
  return (
    <div className="relative w-full">
      {/* Navigation menu */}
    <nav className="hidden lg:flex justify-start w-full py-4 mb-4">
      <div className="flex space-x-6 text-black text-sm">
        <a href="#contabilidad" className="hover:opacity-80">Contabilidad de personas físicas</a>
        <span>|</span>
        <a href="#comienza" className="font-semibold hover:opacity-80">Como empezar</a>
        <span>|</span>
        <a href="#faq" className="hover:opacity-80">FAQ</a>
      </div>
    </nav>

      {/* Hero section with gradient background */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-purple-500 min-h-[400px] md:min-h-[500px] lg:min-h-[700px] w-full rounded-2xl overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 lg:py-16">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            
            {/* Left column: content */}
            <div className="w-full lg:w-1/2 mb-8 lg:mb-0 text-center lg:text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 text-white !leading-[1.3]">
                Tu información fiscal{' '}
                <span className="inline-block bg-white text-purple-600 px-2 py-1 mx-1 rounded-md">
                  clara
                </span>{' '}
                y a la mano
                </h1>
              
              <h2 className="text-base sm:text-lg lg:text-2xl text-white/90 font-normal mb-6 md:mb-10 px-2 lg:px-0">
                Con otros contadores nunca sabes qué pasa con tus impuestos. Con Kontia tienes acceso 24/7 a tu información: declaraciones, facturas, pagos.
              </h2>
              
              {/* CTA Button - hidden on mobile */}
              <div className="hidden sm:block">
                <ContactButton
                  buttonText="🚀 Quiero mi contabilidad con Kontia"
                  origin="hero-form"
                  modalTitle="Solicita información"
                />
              </div>
            </div>
            
            {/* Right column: Mobile device - smaller on mobile */}
            <div className="w-full lg:w-1/2 flex justify-center items-center mt-6 lg:mt-0 scale-90 md:scale-100">
              <MobileDevice />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
