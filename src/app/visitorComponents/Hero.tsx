'use client';

import { useState } from "react";
import ContactButton from "./ContactButton";
import MobileDevice from "./MobileDevice";

export default function Hero() {
  const [email, setEmail] = useState("");

  return (
    <div className="relative w-full">
      {/* Navigation menu */}
    <nav className="hidden lg:flex justify-start w-full py-4 mb-4">
      <div className="flex space-x-6 text-black text-sm">
        <a href="#contabilidad" className="hover:opacity-80">Contabilidad de personas físicas</a>
        <span>|</span>
        <a href="#comienza" className="font-semibold hover:opacity-80">Como empezar</a>
        <span>|</span>
        <a href="#precios" className="hover:opacity-80">Precios</a>
        <span>|</span>
        <a href="#faq" className="hover:opacity-80">FAQ</a>
      </div>
    </nav>

      {/* Hero section with gradient background - restored purple colors */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-purple-500 min-h-[600px] lg:min-h-[700px] w-full rounded-2xl overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            
            {/* Left column: content */}
            <div className="w-full lg:w-1/2 mb-12 lg:mb-0">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-white !leading-[1.3]">
                Contabilidad Personal 
                <span className="inline-block bg-white text-purple-600 px-2 py-1 mx-1 rounded-md">
                  confiable
                </span> 
                <span className="ml-3">y sin complicaciones</span>
                </h1>
              
              <h2 className="text-xl lg:text-2xl text-white/90 font-normal mb-10">
                Tu información fiscal disponible 24/7 para consulta en tu app y nos encargamos de todo por ti
              </h2>
              
              {/* Email form */}
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                <div className="flex-grow">
                  <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Escribe tu correo electrónico"
                  className="shadow-2xl  w-full px-4 py-3 rounded-lg border border-violet-800 focus:ring-2 focus:ring-white text-nowrap"
                  />
                </div>
                <ContactButton
                  buttonText="Quiero gestionar mi contabilidad"
                  origin="hero-form"
                  modalTitle="Solicita información"
                />
                </div>
            </div>
            
            {/* Right column: Mobile device */}
            <div className="w-full lg:w-1/2 flex justify-center items-center relative">
              <div className="relative z-10">
                <MobileDevice />
              </div>
              
              {/* Abstract shape decoration - restored purple colors */}
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-purple-400/30 rounded-full blur-3xl"></div>
              <div className="absolute -right-10 bottom-10 w-60 h-60 bg-purple-300/20 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
