"use client";
import { useState } from 'react';
import ContactButton from './ContactButton';

export default function Pricing() {
  const [activeTab, setActiveTab] = useState("fisica");

  const pricingCategories = [
    {
      title: "Persona Física",
      plans: [
        {
          name: "Básico",
          price: "999",
          description: "Para profesionistas independientes",
          features: [
            "Declaraciones mensuales",
            "Facturación electrónica básica",
            "1 RFC incluido",
            "Soporte por email",
            "Reportes básicos",
            "Cálculo de impuestos",
          ],
        },
        {
          name: "Profesional",
          price: "1,499",
          description: "Para negocios en crecimiento",
          popular: true,
          features: [
            "Todo lo de Básico más:",
            "Declaración anual",
            "Hasta 2 RFC's",
            "Soporte prioritario",
            "Reportes avanzados",
            "Asesoría fiscal básica",
          ],
        },
        {
          name: "Enterprise",
          description: "Para necesidades especiales",
          customPrice: true,
          features: [
            "Todo lo de Profesional más:",
            "RFC's ilimitados",
            "Soporte 24/7",
            "Reportes personalizados",
            "Asesoría fiscal completa",
            "Planeación patrimonial",
          ],
        },
      ],
    },
    {
      title: "Persona Moral",
      plans: [
        {
          name: "Startup",
          price: "2,499",
          description: "Para empresas nuevas",
          features: [
            "Declaraciones mensuales",
            "Contabilidad electrónica",
            "1 RFC empresarial",
            "Soporte en horario laboral",
            "Estados financieros básicos",
            "DIOT mensual",
          ],
        },
        {
          name: "Business",
          price: "3,999",
          description: "Para empresas establecidas",
          popular: true,
          features: [
            "Todo lo de Startup más:",
            "Hasta 3 RFC's",
            "Soporte prioritario",
            "Reportes personalizados",
            "Asesoría fiscal",
            "Planeación financiera",
          ],
        },
        {
          name: "Corporate",
          description: "Para grandes empresas",
          customPrice: true,
          features: [
            "Todo lo de Business más:",
            "RFC's ilimitados",
            "Soporte dedicado 24/7",
            "Consultoría especializada",
            "Planeación fiscal",
            "Auditorías preventivas",
          ],
        },
      ],
    },
  ];

  return (
    <div className="py-20 px-8 bg-gray-50/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-900">
            Escoge el plan para ti
          </h2>
          {/* <div className="inline-flex rounded-full border border-purple-100 p-1 bg-white shadow-sm">
            <button
              onClick={() => setActiveTab("fisica")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeTab === "fisica"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-purple-600 hover:bg-purple-50"
              }`}
            >
              Persona Física
            </button>
            <button
              onClick={() => setActiveTab("moral")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeTab === "moral"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-purple-600 hover:bg-purple-50"
              }`}
            >
              Persona Moral
            </button>
          </div> */}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {pricingCategories
            .find(cat => 
              activeTab === "fisica" 
                ? cat.title === "Persona Física" 
                : cat.title === "Persona Moral"
            )
            ?.plans.map((plan, index) => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl transition-all duration-200 hover:scale-[1.02] ${
                  plan.popular
                    ? "bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-xl"
                    : "bg-white border border-purple-100 hover:border-purple-200 shadow-md"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-sky-100 to-sky-200 text-sky-700 px-4 py-1.5 rounded-full text-sm font-medium shadow-lg">
                    Más solicitado
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className={plan.popular ? "text-purple-100" : "text-gray-600"}>
                    {plan.description}
                  </p>
                  <div className="mt-4">
                    {plan.customPrice ? (
                      <div className="text-2xl font-bold">Cotización personalizada</div>
                    ) : (
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold">$</span>
                        <span className="text-5xl font-bold tracking-tight">{plan.price}</span>
                        <span className={`text-xl ${plan.popular ? "text-purple-100" : "text-gray-500"}`}>
                          /mes
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <span className={`mr-2 mt-1 text-lg ${plan.popular ? "text-purple-200" : "text-purple-500"}`}>
                        •
                      </span>
                      <span className={plan.popular ? "text-purple-50" : "text-gray-600"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <ContactButton
                  buttonText={plan.customPrice ? "Contactar" : "Comenzar ahora"}
                  origin={`pricing-${plan.name.toLowerCase()}`}
                  modalTitle={`Comienza con el plan ${plan.name}`}
                />
              </div>
            ))}
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          Todos los precios incluyen IVA. Cancela en cualquier momento.
        </p>
      </div>
    </div>
  );
}
