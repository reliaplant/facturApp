import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import app from '@/services/firebase';
import { Category } from '@/models/Category';

// Initialize Firestore
const db = getFirestore(app);

const COLLECTION_NAME = 'categories';

class CategoryService {
  // Get all categories
  async getAllCategories(): Promise<Category[]> {
    try {
      const categoriesQuery = query(
        collection(db, COLLECTION_NAME),
        orderBy('name', 'asc')
      );
      
      const querySnapshot = await getDocs(categoriesQuery);
      const categories: Category[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        categories.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // Get category by ID
  async getCategoryById(id: string): Promise<Category | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          description: data.description,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };
      } else {
        console.log('No category found with that ID');
        return null;
      }
    } catch (error) {
      console.error('Error fetching category:', error);
      throw error;
    }
  }

  // Create a new category
  async createCategory(categoryData: Omit<Category, 'id'>): Promise<Category> {
    try {
      const now = Date.now();
      const newCategory = {
        ...categoryData,
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(collection(db, COLLECTION_NAME), newCategory);
      
      return {
        id: docRef.id,
        ...newCategory
      };
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  // Update a category
  async updateCategory(id: string, categoryData: Partial<Category>): Promise<Category> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Category not found');
      }
      
      // Get current data
      const currentData = docSnap.data();
      
      const updateData = {
        ...categoryData,
        updatedAt: Date.now()
      };
      
      await updateDoc(docRef, updateData);
      
      // Get the updated document
      const updatedDocSnap = await getDoc(docRef);
      const data = updatedDocSnap.data();
      
      if (!data) {
        throw new Error('Failed to retrieve updated category data');
      }
      
      // Create a complete category object with all fields
      return {
        id: updatedDocSnap.id,
        name: data.name || currentData.name,
        description: data.description || currentData.description,
        createdAt: data.createdAt || currentData.createdAt,
        updatedAt: data.updatedAt || Date.now()
      };
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  // Delete a category
  async deleteCategory(id: string): Promise<boolean> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // Search categories by name
  async searchCategories(term: string): Promise<Category[]> {
    try {
      // Firebase doesn't support direct text search, so we'll fetch all and filter
      const allCategories = await this.getAllCategories();
      
      if (!term) return allCategories;
      
      const lowerTerm = term.toLowerCase();
      return allCategories.filter(
        category => 
          category.name.toLowerCase().includes(lowerTerm) || 
          category.description.toLowerCase().includes(lowerTerm)
      );
    } catch (error) {
      console.error('Error searching categories:', error);
      throw error;
    }
  }
}

export const categoryService = new CategoryService();
