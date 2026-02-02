/**
 * Función para agregar categorías desde el frontend
 * Importar y usar en cualquier componente
 */

import { categoryService } from '@/services/category-service';

// Categorías para gastos deducibles en México
export const CATEGORIAS_DEDUCIBLES = [
  // Gastos de operación
  'Agua',
  'Arrendamiento de inmuebles',
  'Arrendamiento de equipo',
  'Artículos de limpieza',
  'Artículos de oficina',
  'Asesoría legal',
  'Asesoría financiera',
  
  // Comunicaciones
  'Celular',
  'Internet',
  'Telefonía fija',
  'Paquetería y mensajería',
  
  // Transporte y viáticos
  'Estacionamiento',
  'Mantenimiento vehicular',
  'Pasajes aéreos',
  'Pasajes terrestres',
  'Renta de auto',
  'Uber / Taxi',
  'Viáticos nacionales',
  'Viáticos internacionales',
  'Hospedaje',
  
  // Alimentos
  'Alimentos con clientes',
  'Alimentos de trabajo',
  'Consumos en restaurantes',
  
  // Seguros y fianzas
  'Seguros de auto',
  'Seguros de gastos médicos',
  'Seguros de vida',
  'Seguros de equipo',
  'Fianzas',
  
  // Servicios profesionales
  'Servicio de nómina',
  'Consultoría',
  'Diseño gráfico',
  'Desarrollo de software',
  'Fotografía y video',
  'Traducción',
  
  // Marketing y publicidad
  'Publicidad en línea',
  'Publicidad impresa',
  'Redes sociales',
  'Eventos y exposiciones',
  'Material promocional',
  
  // Tecnología
  'Software y licencias',
  'Hosting y dominios',
  'Servicios en la nube',
  'Equipo de cómputo',
  'Mantenimiento de equipo',
  'Suscripciones digitales',
  
  // Servicios básicos
  'Luz / Electricidad',
  'Gas',
  'Predial',
  'Tenencia',
  
  // Capacitación
  'Cursos y capacitación',
  'Libros y publicaciones',
  'Conferencias y seminarios',
  
  // Financieros
  'Comisiones bancarias',
  'Intereses por créditos',
  'Servicios financieros',
  
  // Otros deducibles
  'Donativos',
  'Cuotas y suscripciones',
  'Honorarios médicos',
  'Medicinas',
  'Lentes ópticos',
  'Gastos funerarios',
  
  // Nómina relacionados
  'Uniformes',
  'Equipo de seguridad',
  'Herramientas de trabajo',
  
  // Varios
  'Otros gastos deducibles',
  'Gastos no deducibles',
  'Uso personal',
];

export async function seedCategoriesFromFrontend(): Promise<{ created: number; skipped: number }> {
  console.log('🚀 Iniciando seed de categorías...');
  
  // Obtener categorías existentes
  const existing = await categoryService.getAllCategories();
  const existingNames = new Set(existing.map(c => c.name.toLowerCase()));
  
  console.log(`📋 Categorías existentes: ${existingNames.size}`);
  
  let created = 0;
  let skipped = 0;
  
  for (const nombre of CATEGORIAS_DEDUCIBLES) {
    if (existingNames.has(nombre.toLowerCase())) {
      console.log(`⏭️  Saltando (ya existe): ${nombre}`);
      skipped++;
      continue;
    }
    
    try {
      await categoryService.createCategory({
        name: nombre,
        description: ''
      });
      console.log(`✅ Creada: ${nombre}`);
      created++;
    } catch (error) {
      console.error(`❌ Error creando ${nombre}:`, error);
    }
  }
  
  console.log('\n📊 Resumen:');
  console.log(`   ✅ Creadas: ${created}`);
  console.log(`   ⏭️  Saltadas: ${skipped}`);
  console.log(`   📋 Total categorías ahora: ${existingNames.size + created}`);
  
  return { created, skipped };
}
