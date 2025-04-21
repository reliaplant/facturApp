import Image from 'next/image';

export default function GridSection() {
  const steps = [
    {
      icon: "📝",
      title: "Regístrate en línea",
      description: "Completa el formulario con tus datos básicos"
    },
    {
      icon: "✅",
      title: "Verifica tu identidad",
      description: "Sube los documentos necesarios de forma segura"
    }
  ];

  return (
    <div className="w-full py-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
          {/* Cuadro superior izquierdo - Mensaje motivacional */}
          <div className="bg-sky-100 rounded-2xl p-8 flex items-center justify-center">
            <h2 className="text-3xl md:text-4xl font-bold text-sky-950 text-center">
              No hay filas, solo unos cuantos clics
            </h2>
          </div>

          {/* Cuadro superior derecho - CTA */}
          <div className="bg-purple-600 rounded-2xl p-8 flex items-center justify-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center">
              ¿Todo listo para solicitar?
            </h2>
          </div>

          {/* Cuadro inferior izquierdo - Pasos */}
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="space-y-8">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-600">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cuadro inferior derecho - Imagen */}
          <div className="bg-stone-50 rounded-2xl p-8 flex items-center justify-center relative overflow-hidden">
            <Image
              src="/happy-person.jpg"
              alt="Persona feliz mostrando tarjeta"
              width={400}
              height={300}
              className="object-cover rounded-xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
