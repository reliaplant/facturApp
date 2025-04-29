import { v4 as uuidv4 } from 'uuid';
import { 
  FixedAsset, 
  CreateFixedAssetData, 
  UpdateFixedAssetData,
  isFullyDepreciated,
  MonthlyDepreciation,
  DepreciationHistoryItem
} from '../models/FixedAsset';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  writeBatch 
} from 'firebase/firestore';
import app from './firebase';

// Inicializar Firestore
const db = getFirestore(app);

/**
 * Servicio simplificado para manejar operaciones con activos fijos
 */
export class FixedAssetService {
  
  /**
   * Calcula la depreciación mensual para un activo fijo
   */
  calculateMonthlyDepreciation(asset: FixedAsset): number {
    if (!asset) return 0;
    
    // Solo usamos el método de línea recta
    const depreciableAmount = asset.cost - asset.residualValue;
    return Number((depreciableAmount / asset.usefulLifeMonths).toFixed(2));
  }
  
  /**
   * Calcula la depreciación acumulada y el valor actual hasta una fecha específica
   */
  calculateCurrentDepreciation(
    asset: FixedAsset,
    cutoffDate: Date = new Date()
  ): { accumulatedDepreciation: number, currentValue: number } {
    if (!asset || asset.status !== 'active') {
      return {
        accumulatedDepreciation: asset?.accumulatedDepreciation || 0,
        currentValue: asset?.currentValue || 0
      };
    }
    
    const purchaseDate = new Date(asset.purchaseDate);
    
    // Si la fecha de corte es anterior a la compra, no hay depreciación
    if (cutoffDate < purchaseDate) {
      return {
        accumulatedDepreciation: 0,
        currentValue: asset.cost
      };
    }
    
    // Calcular meses completos transcurridos
    const monthsDiff = 
      (cutoffDate.getFullYear() - purchaseDate.getFullYear()) * 12 + 
      (cutoffDate.getMonth() - purchaseDate.getMonth());
    
    // Limitar a los meses de vida útil
    const effectiveMonths = Math.min(monthsDiff, asset.usefulLifeMonths);
    
    if (effectiveMonths <= 0) {
      return {
        accumulatedDepreciation: 0,
        currentValue: asset.cost
      };
    }
    
    // Calcular depreciación
    const monthlyDepreciation = this.calculateMonthlyDepreciation(asset);
    const accumulatedDepreciation = monthlyDepreciation * effectiveMonths;
    
    // Asegurar que no exceda el límite (costo - valor residual)
    const maxDepreciation = asset.cost - asset.residualValue;
    const finalDepreciation = Math.min(accumulatedDepreciation, maxDepreciation);
    
    // Calcular el valor actual
    const currentValue = Math.max(asset.cost - finalDepreciation, asset.residualValue);
    
    return {
      accumulatedDepreciation: finalDepreciation,
      currentValue
    };
  }
  
  /**
   * Crea un nuevo activo fijo
   */
  async createFixedAsset(assetData: CreateFixedAssetData): Promise<FixedAsset> {
    // Generar ID único para el activo
    const assetId = uuidv4();
    const now = new Date().toISOString();
    
    // Crear el objeto de activo fijo con valores iniciales
    const newAsset: FixedAsset = {
      id: assetId,
      clientId: assetData.clientId,
      name: assetData.name,
      type: assetData.type,
      purchaseDate: assetData.purchaseDate,
      cost: assetData.cost,
      deductibleValue: assetData.deductibleValue || assetData.cost, // Por defecto es el costo total
      depreciationMethod: 'straightLine',
      usefulLifeMonths: assetData.usefulLifeMonths,
      residualValue: assetData.residualValue || 0,
      status: 'active',
      currentValue: assetData.cost, // Inicialmente, el valor actual es igual al costo
      accumulatedDepreciation: 0,   // Inicialmente, no hay depreciación acumulada
      invoiceNumber: assetData.invoiceNumber,
      hasInvoiceFile: false,        // Por defecto, no hay archivo de factura
      notes: assetData.notes,
      createdAt: now,
      updatedAt: now
    };
    
    // Calcular y agregar la depreciación mensual
    newAsset.monthlyDepreciation = this.calculateMonthlyDepreciation(newAsset);
    
    // Guardar en Firestore como subcollección del cliente
    await setDoc(doc(db, `clients/${assetData.clientId}/fixedAssets`, assetId), newAsset);
    
    return newAsset;
  }
  
  /**
   * Actualiza un activo fijo existente
   */
  async updateFixedAsset(clientId: string, assetId: string, updateData: UpdateFixedAssetData): Promise<FixedAsset> {
    const assetRef = doc(db, `clients/${clientId}/fixedAssets`, assetId);
    
    // Verificar si el activo existe
    const assetDoc = await getDoc(assetRef);
    if (!assetDoc.exists()) {
      throw new Error(`Activo con ID ${assetId} no encontrado`);
    }
    
    // Obtener el activo actual
    const currentAsset = assetDoc.data() as FixedAsset;
    
    // Datos de actualización con timestamp
    const updatePayload = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // Recalcular la depreciación mensual si se modificaron valores relevantes
    if (
      updateData.cost !== undefined || 
      updateData.residualValue !== undefined || 
      updateData.usefulLifeMonths !== undefined
    ) {
      // Crear un objeto temporal con los valores actualizados para el cálculo
      const tempAsset: FixedAsset = {
        ...currentAsset,
        ...updateData,
      };
      
      // Calcular y agregar la depreciación mensual actualizada
      updatePayload.monthlyDepreciation = this.calculateMonthlyDepreciation(tempAsset);
    }
    
    // Actualizar en Firestore
    await updateDoc(assetRef, updatePayload);
    
    // Obtener y retornar el documento actualizado
    const updatedDoc = await getDoc(assetRef);
    return updatedDoc.data() as FixedAsset;
  }
  
  /**
   * Obtiene un activo fijo por su ID
   */
  async getFixedAssetById(clientId: string, assetId: string): Promise<FixedAsset | null> {
    const assetRef = doc(db, `clients/${clientId}/fixedAssets`, assetId);
    const assetDoc = await getDoc(assetRef);
    
    if (!assetDoc.exists()) {
      return null;
    }
    
    return assetDoc.data() as FixedAsset;
  }
  
  /**
   * Lista todos los activos fijos de un cliente
   */
  async getFixedAssetsByClient(
    clientId: string, 
    status?: FixedAsset['status']
  ): Promise<FixedAsset[]> {
    let q;
    
    if (status) {
      q = query(
        collection(db, `clients/${clientId}/fixedAssets`),
        where('status', '==', status)
      );
    } else {
      q = collection(db, `clients/${clientId}/fixedAssets`);
    }
    
    const querySnapshot = await getDocs(q);
    
    const assets: FixedAsset[] = [];
    querySnapshot.forEach((doc) => {
      const asset = doc.data() as FixedAsset;
      
      // Actualizar la depreciación acumulada y el valor actual para activos activos
      if (asset.status === 'active') {
        const currentDepreciation = this.calculateCurrentDepreciation(asset);
        asset.accumulatedDepreciation = currentDepreciation.accumulatedDepreciation;
        asset.currentValue = currentDepreciation.currentValue;
        
        // Si el activo está completamente depreciado, actualizar su estado
        if (isFullyDepreciated(asset)) {
          asset.status = 'fullyDepreciated';
        }
      }
      
      assets.push(asset);
    });
    
    // Ordenar por fecha de compra (más recientes primero)
    return assets.sort((a, b) => 
      new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    );
  }
  
  /**
   * Obtiene la depreciación mensual total para un cliente en un mes específico
   */
  async getTotalMonthlyDepreciation(
    clientId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    try {
      // Obtener todos los activos fijos activos del cliente
      const assets = await this.getFixedAssetsByClient(clientId, 'active');
      
      // Calcular la depreciación mensual total sumando las depreciaciones individuales
      let totalMonthlyDepreciation = 0;
      
      for (const asset of assets) {
        // Verificar si el activo estaba activo durante el período
        const assetPurchaseDate = new Date(asset.purchaseDate);
        const periodStartDate = new Date(startDate);
        const periodEndDate = new Date(endDate);
        
        // Si el activo se compró después del período, no aplica
        if (assetPurchaseDate > periodEndDate) {
          continue;
        }
        
        // Si el activo se compró durante el período o antes
        const monthlyDepreciation = asset.monthlyDepreciation || this.calculateMonthlyDepreciation(asset);
        totalMonthlyDepreciation += monthlyDepreciation;
      }
      
      return totalMonthlyDepreciation;
    } catch (error) {
      console.error("Error al calcular la depreciación mensual total:", error);
      return 0;
    }
  }

  /**
   * Elimina un activo fijo
   */
  async deleteFixedAsset(clientId: string, assetId: string): Promise<void> {
    const assetRef = doc(db, `clients/${clientId}/fixedAssets`, assetId);
    
    // Verificar si el activo existe
    const assetDoc = await getDoc(assetRef);
    if (!assetDoc.exists()) {
      throw new Error(`Activo con ID ${assetId} no encontrado`);
    }
    
    // Eliminar el activo
    const batch = writeBatch(db);
    batch.delete(assetRef);
    await batch.commit();
  }

  /**
   * Obtiene el historial de depreciación para un activo fijo específico
   */
  async getDepreciationHistoryForAsset(assetId: string): Promise<MonthlyDepreciation[]> {
    try {
      // Primero obtener el activo para conocer el clientId
      const asset = await this.getAssetDetails(assetId);
      if (!asset) {
        throw new Error(`Activo con ID ${assetId} no encontrado`);
      }

      // Consultar la colección de depreciaciones para este activo
      const depreciationsRef = collection(db, `clients/${asset.clientId}/fixedAssets/${assetId}/depreciations`);
      const querySnapshot = await getDocs(depreciationsRef);

      if (querySnapshot.empty) {
        return []; // No hay registros de depreciación
      }

      // Convertir documentos a objetos MonthlyDepreciation
      const depreciations: MonthlyDepreciation[] = [];
      querySnapshot.forEach(doc => {
        depreciations.push(doc.data() as MonthlyDepreciation);
      });

      // Ordenar por año y mes
      return depreciations.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
    } catch (error) {
      console.error("Error al obtener historial de depreciación:", error);
      return []; // Retornar arreglo vacío en caso de error
    }
  }

  /**
   * Obtiene detalles de un activo por su ID (sin verificar clientId)
   * Método helper para getDepreciationHistoryForAsset
   */
  private async getAssetDetails(assetId: string): Promise<FixedAsset | null> {
    try {
      // Buscar en todas las colecciones de clientes (menos eficiente pero necesario)
      const clientsRef = collection(db, 'clients');
      const clientsSnapshot = await getDocs(clientsRef);
      
      for (const clientDoc of clientsSnapshot.docs) {
        const clientId = clientDoc.id;
        const assetRef = doc(db, `clients/${clientId}/fixedAssets`, assetId);
        const assetDoc = await getDoc(assetRef);
        
        if (assetDoc.exists()) {
          return assetDoc.data() as FixedAsset;
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error al buscar activo:", error);
      return null;
    }
  }

  /**
   * Genera un historial simulado de depreciación para un activo fijo
   */
  generateDepreciationHistory(asset: FixedAsset): DepreciationHistoryItem[] {
    if (!asset) return [];
    
    const result: DepreciationHistoryItem[] = [];
    const monthlyDepreciation = this.calculateMonthlyDepreciation(asset);
    
    // Fecha de inicio (fecha de compra)
    const startDate = new Date(asset.purchaseDate);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1; // getMonth() retorna 0-11
    
    // Valor inicial
    let currentValue = asset.cost;
    let accumulatedDepreciation = 0;
    
    // Calcular la cantidad total de meses a depreciar
    const totalMonths = Math.min(
      asset.usefulLifeMonths,
      // Si ya está totalmente depreciado, calcular meses hasta la fecha actual
      asset.status === 'fullyDepreciated' ? 
        this.calculateMonthsUntilFullyDepreciated(asset) : 
        asset.usefulLifeMonths
    );
    
    // Generar registro para cada mes
    for (let i = 0; i < totalMonths; i++) {
      // Calcular año y mes
      const month = ((startMonth + i - 1) % 12) + 1; // 1-12
      const year = startYear + Math.floor((startMonth + i - 1) / 12);
      
      // Valor antes de depreciar
      const assetValueBefore = currentValue;
      const accumulatedBefore = accumulatedDepreciation;
      
      // Aplicar depreciación
      accumulatedDepreciation += monthlyDepreciation;
      currentValue = Math.max(asset.cost - accumulatedDepreciation, asset.residualValue);
      
      // Asegurar que no exceda el valor residual
      if (currentValue <= asset.residualValue) {
        accumulatedDepreciation = asset.cost - asset.residualValue;
        currentValue = asset.residualValue;
      }
      
      // Agregar al resultado
      result.push({
        year,
        month,
        deprecationAmount: monthlyDepreciation,
        accumulatedBefore,
        accumulatedAfter: accumulatedDepreciation,
        assetValueBefore,
        assetValueAfter: currentValue
      });
      
      // Si ya llegamos al valor residual, detenerse
      if (currentValue <= asset.residualValue) {
        break;
      }
    }
    
    return result;
  }
  
  /**
   * Calcula cuántos meses tomó para que un activo se depreciara completamente
   */
  private calculateMonthsUntilFullyDepreciated(asset: FixedAsset): number {
    const monthlyDepreciation = this.calculateMonthlyDepreciation(asset);
    if (monthlyDepreciation <= 0) return asset.usefulLifeMonths;
    
    const depreciableAmount = asset.cost - asset.residualValue;
    return Math.ceil(depreciableAmount / monthlyDepreciation);
  }
}