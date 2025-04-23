import { v4 as uuidv4 } from 'uuid';
import { 
  FixedAsset, 
  CreateFixedAssetData, 
  UpdateFixedAssetData,
  isFullyDepreciated
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
    
    // Datos de actualización con timestamp
    const updatePayload = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
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
}