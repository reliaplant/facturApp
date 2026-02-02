import React, { useState, useEffect } from "react";
import { categoryService } from "@/services/category-service";
import { Category } from "@/models/Category";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export function ListaCategorias() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New state for category dialog - removed description
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: ""
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      setIsLoading(true);
      setError(null);
      try {
        const categoriesData = await categoryService.getAllCategories();
        setCategories(categoriesData);
      } catch (err) {
        console.error("Error loading categories:", err);
        setError("No se pudieron cargar las categorías. Intente de nuevo más tarde.");
      } finally {
        setIsLoading(false);
      }
    }

    loadCategories();
  }, []);

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("¿Está seguro que desea eliminar esta categoría?")) {
      return;
    }

    try {
      await categoryService.deleteCategory(id);
      setCategories(categories.filter(cat => cat.id !== id));
    } catch (err) {
      console.error("Error deleting category:", err);
      alert("No se pudo eliminar la categoría. Intente de nuevo más tarde.");
    }
  };

  // Handle creating a new category
  const handleCreateCategory = async () => {
    if (!newCategory.name) {
      alert("El nombre de la categoría es obligatorio");
      return;
    }

    setIsCreating(true);
    try {
      const categoryData = {
        name: newCategory.name,
        description: "" // Empty description
      };

      const createdCategory = await categoryService.createCategory(categoryData);
      setCategories(prev => [...prev, createdCategory]);

      // Reset form and close dialog
      setNewCategory({
        name: ""
      });
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Error creating category:", err);
      alert("No se pudo crear la categoría. Intente de nuevo más tarde.");
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center">
        <p className="text-red-500">{error}</p>
        <button 
          className="mt-2 px-4 py-2 bg-violet-600 text-white rounded-md"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-2">Categorías</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        Administra las categorías para organizar tus facturas y servicios.
      </p>
      
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-500">
          {categories.length} categorías en total
        </div>
        <button 
          className="px-3 py-1 bg-violet-600 text-white text-sm rounded-md hover:bg-violet-700"
          onClick={() => setIsDialogOpen(true)}
        >
          + Nueva Categoría
        </button>
      </div>
      
      {categories.length === 0 ? (
        <div className="text-center py-10 border border-dashed rounded-md">
          <p className="text-gray-500">No hay categorías registradas aún.</p>
          <p className="text-sm text-gray-400 mt-1">
            Crea tu primera categoría para empezar a organizar tus facturas.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="py-3 px-4 text-left">Nombre</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-3 px-4 font-medium">{category.name}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        Editar
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        onClick={() => category.id && handleDeleteCategory(category.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog for creating a new category */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nueva Categoría</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                placeholder="Nombre de la categoría"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateCategory}
              disabled={isCreating}
            >
              {isCreating ? "Creando..." : "Crear Categoría"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
