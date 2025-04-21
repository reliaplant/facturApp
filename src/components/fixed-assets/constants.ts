// Catálogo de categorías fiscales con sus tasas de depreciación anual por defecto
export const FISCAL_CATEGORIES = [
  { id: 'terrenos', name: 'Terrenos', defaultRate: 0, description: 'No se deprecian (vida útil indefinida)' },
  { id: 'edificios', name: 'Edificios y construcciones', defaultRate: 5, description: 'Locales comerciales, bodegas, fábricas, oficinas, etc.' },
  { id: 'maquinaria', name: 'Maquinaria y equipo de producción', defaultRate: 10, description: 'Maquinaria para procesos productivos o servicios' },
  { id: 'mobiliario', name: 'Mobiliario y equipo de oficina', defaultRate: 10, description: 'Muebles, escritorios, sillas, archiveros, etc.' },
  { id: 'computo', name: 'Equipo de cómputo y accesorios', defaultRate: 30, description: 'Computadoras, servidores, impresoras, etc.' },
  { id: 'transporte', name: 'Equipo de transporte', defaultRate: 25, description: 'Vehículos, camiones, motocicletas, etc.' },
  { id: 'accesorios_vehiculos', name: 'Accesorios de vehículos', defaultRate: 25, description: 'Accesorios para vehículos como remolques, equipamiento especializado, etc.' },
  { id: 'herramientas', name: 'Herramientas', defaultRate: 15, description: 'Herramientas manuales o especiales para la actividad' },
  { id: 'comunicacion', name: 'Equipo de comunicación y telefonía', defaultRate: 15, description: 'Equipos de telefonía, conmutadores, radios, etc.' },
  { id: 'instalaciones', name: 'Mejoras en bienes arrendados', defaultRate: 15, description: 'Inversiones en mejoras a inmuebles rentados' },
  { id: 'software', name: 'Software y licencias', defaultRate: 30, description: 'Programas y licencias informáticas' },
  { id: 'otro', name: 'Otro', defaultRate: 10, description: 'Otra categoría no especificada' }
];