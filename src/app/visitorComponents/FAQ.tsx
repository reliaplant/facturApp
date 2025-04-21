'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ContactButton from './ContactButton';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "¿Qué servicios incluye la contabilidad mensual?",
      answer: "Incluye registro de ingresos y gastos, declaraciones mensuales, emisión de facturas, cálculo de impuestos y reportes financieros básicos.",
    },
    {
      question: "¿Cómo funciona el soporte técnico?",
      answer: "Ofrecemos soporte por email, teléfono y chat según el plan contratado. Los tiempos de respuesta varían desde 24 horas hasta atención inmediata.",
    },
    {
      question: "¿Puedo cambiar de plan en cualquier momento?",
      answer: "Sí, puedes actualizar o cambiar tu plan en cualquier momento. Los cambios se reflejarán en tu siguiente ciclo de facturación.",
    },
    {
      question: "¿Qué pasa si necesito servicios adicionales?",
      answer: "Ofrecemos servicios adicionales a la carta que puedes contratar según tus necesidades específicas. Contáctanos para más información.",
    },
    {
      question: "¿Cómo garantizan la seguridad de mi información?",
      answer: "Utilizamos encriptación de nivel bancario y seguimos las mejores prácticas de seguridad para proteger tu información confidencial.",
    },
    {
      question: "¿Ofrecen periodo de prueba?",
      answer: "Sí, ofrecemos un periodo de prueba de 14 días para que puedas evaluar nuestros servicios sin compromiso.",
    },
  ];

  return (
    <div className="py-20 px-8 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-black">
              Preguntas Frecuentes
            </span>
          </h2>
          <p className="text-xl text-gray-600">
            Resolvemos tus dudas sobre nuestros servicios
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl overflow-hidden border border-gray-100"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-lg font-medium text-gray-900">{faq.question}</h3>
                <svg
                  className={`ml-4 w-6 h-6 text-purple-600 transition-transform duration-200 ${
                  openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 px-6 pb-4 text-gray-600 border-t border-gray-100">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            ¿No encontraste la respuesta que buscabas?
          </p>
          <ContactButton
            buttonText="Contáctanos directamente"
            origin="faq-contact"
            modalTitle="Contáctanos para resolver tus dudas"
          />
        </div>
      </div>
    </div>
  );
}
