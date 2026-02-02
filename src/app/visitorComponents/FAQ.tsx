'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ContactButton from './ContactButton';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "¿Qué hago yo y qué hacen ustedes?",
      answer: "Tú solo nos das acceso a tu información del SAT y nosotros nos encargamos del resto: descargamos tus facturas, calculamos tus impuestos, preparamos y presentamos tus declaraciones. Tú solo pagas lo que debas.",
    },
    {
      question: "¿Cómo sé que mis declaraciones están al día?",
      answer: "Cada vez que presentamos una declaración te notificamos. Además, en tu portal 'Mi Contabilidad' puedes ver el estado de todas tus declaraciones: cuáles están pagadas, cuáles tienen saldo a favor y cuáles están pendientes.",
    },
    {
      question: "¿Y si tengo un problema con el SAT?",
      answer: "Tranquilo, para eso estamos. Si el SAT te envía algún requerimiento o tienes alguna duda sobre tu situación fiscal, nosotros te asesoramos y te ayudamos a resolverlo.",
    },
    {
      question: "¿Cómo sé cuánto tengo que pagar de impuestos?",
      answer: "Muy fácil: en tu portal ves el monto exacto de cada declaración con su línea de captura lista para pagar en el banco o por transferencia. Sin sorpresas.",
    },
    {
      question: "¿También hacen la declaración anual?",
      answer: "Sí, está incluida. Preparamos tu declaración anual con todas las deducciones personales que identificamos durante el año. Si te toca devolución, te ayudamos a solicitarla.",
    },
    {
      question: "¿Qué pasa si tengo meses atrasados?",
      answer: "No hay problema. Podemos regularizar tu situación fiscal presentando las declaraciones pendientes. Te decimos exactamente qué se debe y cómo ponerte al corriente sin estrés.",
    },
  ];

  return (
    <div className="py-20 px-8 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-black">
              ¿Todavía tienes dudas?
            </span>
          </h2>
          <p className="text-xl text-gray-600">
            Aquí respondemos lo que más nos preguntan
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
