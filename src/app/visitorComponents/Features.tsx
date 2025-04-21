import { FileText, Users, BarChart3, ClipboardList } from "lucide-react";

const steps = [
  {
    title: "Formulario Inicial",
    description: "Completa un formulario básico para entender tus actividades y necesidades contables.",
    icon: FileText,
    day: "Día 1",
    step: "Paso 1",
  },
  {
    title: "Asignación de Asesor",
    description: "Te asignamos un asesor especializado que te acompañará durante todo el proceso.",
    icon: Users,
    day: "Día 1",
    step: "Paso 2",
  },
  {
    title: "Alta de Contabilidad",
    description: "Realizamos todos los trámites necesarios para dar de alta tu contabilidad.",
    icon: BarChart3,
    day: "Día 2-3",
    step: "Paso 3",
  },
  {
    title: "Perfil Contable",
    description: "Preparamos tu perfil contable personalizado según tus necesidades específicas.",
    icon: ClipboardList,
    day: "Día 4",
    step: "Paso 4",
  },
  {
    title: "Reunión de Inicio",
    description: "Conoce a tu contador asignado y establece las bases de trabajo conjunto.",
    icon: FileText,
    day: "Día 5",
    step: "Paso 5",
  }
];

export default function NuStyledSteps() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto px-8 py-28 md:px-4 md:py-20 bg-white">
      <h2 className="text-3xl font-bold text-center mb-12 text-zinc-900">
        Proceso de Alta en 5 Pasos
      </h2>
      {steps.map((step, i) => (
        <div key={i} className="flex items-center bg-[#f7f7f8] rounded-2xl p-5 gap-5">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-sky-50 rounded-full ring-8 ring-white flex items-center justify-center -ml-10">
              <step.icon className="w-5 h-5 text-sky-600" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm font-medium bg-[#f1ecfb] text-[#8854D0] px-3 py-1 rounded-full">{step.step}</span>
              <span className="text-sm text-gray-400">{step.day}</span>
            </div>
            <div className="text-lg font-semibold mb-1 text-zinc-900">{step.title}</div>
            <p className="text-gray-600 text-sm">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
