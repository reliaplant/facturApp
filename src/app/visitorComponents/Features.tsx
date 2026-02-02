import { FileText, Users, BarChart3, ClipboardList, CheckCircle } from "lucide-react";

const steps = [
  {
    title: "Cuéntanos sobre ti",
    description: "Solo necesitamos tu RFC y unos datos básicos. Nada complicado, te tomará 5 minutos.",
    icon: FileText,
    day: "Día 1",
    step: "Paso 1",
  },
  {
    title: "Conectamos con el SAT",
    description: "Descargamos tus facturas automáticamente. Tú no tienes que hacer nada más.",
    icon: Users,
    day: "Día 1-2",
    step: "Paso 2",
  },
  {
    title: "Analizamos todo",
    description: "Revisamos tus ingresos y gastos. Identificamos qué puedes deducir legalmente.",
    icon: BarChart3,
    day: "Día 2-3",
    step: "Paso 3",
  },
  {
    title: "Tu portal listo",
    description: "Accede a Mi Contabilidad y ve toda tu situación fiscal clara y organizada.",
    icon: ClipboardList,
    day: "Día 3",
    step: "Paso 4",
  },
  {
    title: "¡Primera declaración!",
    description: "Presentamos tu declaración y te avisamos. Solo tienes que pagar si hay saldo.",
    icon: CheckCircle,
    day: "Día 4-5",
    step: "Paso 5",
  }
];

export default function NuStyledSteps() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-20 bg-white">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 text-zinc-900 px-2">
        En menos de una semana, estarás tranquilo
      </h2>
      {steps.map((step, i) => (
        <div key={i} className="flex items-start md:items-center bg-[#f7f7f8] rounded-2xl p-4 md:p-5 gap-3 md:gap-5">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-sky-50 rounded-full ring-4 md:ring-8 ring-white flex items-center justify-center">
              <step.icon className="w-5 h-5 text-sky-600" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
              <span className="text-xs md:text-sm font-medium bg-[#f1ecfb] text-[#8854D0] px-2 md:px-3 py-1 rounded-full">{step.step}</span>
              <span className="text-xs md:text-sm text-gray-400">{step.day}</span>
            </div>
            <div className="text-base md:text-lg font-semibold mb-1 text-zinc-900">{step.title}</div>
            <p className="text-gray-600 text-xs md:text-sm">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
