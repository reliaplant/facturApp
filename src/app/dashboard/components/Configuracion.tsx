import React, { useState } from "react";
import { ListaCategorias } from "./ListaCategorias";

export function Configuracion() {
  const [activeSection, setActiveSection] = useState("categorias");

  // Menu items
  const menuItems = [
    { id: "categorias", label: "Lista de Categorías" },
    { id: "perfil", label: "Perfil de Usuario" },
    { id: "sistema", label: "Configuración del Sistema" },
    { id: "usuarios", label: "Gestión de Usuarios" },
    { id: "seguridad", label: "Seguridad" }
  ];

  // Render the appropriate content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case "categorias":
        return <ListaCategorias />;
      case "perfil":
        return (
          <div>
            <h3 className="text-lg font-medium mb-2">Perfil de Usuario</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Administra tu información personal y preferencias de cuenta.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-md">
                <h4 className="font-medium mb-2">Información Personal</h4>
                <p className="text-sm text-gray-500">Actualiza tu nombre, correo e información de contacto</p>
              </div>
              <div className="p-4 border rounded-md">
                <h4 className="font-medium mb-2">Seguridad</h4>
                <p className="text-sm text-gray-500">Cambiar contraseña y configurar autenticación en dos pasos</p>
              </div>
            </div>
          </div>
        );
      case "sistema":
        return (
          <div>
            <h3 className="text-lg font-medium mb-2">Configuración del Sistema</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Personaliza la apariencia y comportamiento de la aplicación.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-md">
                <h4 className="font-medium mb-2">Apariencia</h4>
                <p className="text-sm text-gray-500">Cambiar entre modo claro y oscuro</p>
              </div>
              <div className="p-4 border rounded-md">
                <h4 className="font-medium mb-2">Notificaciones</h4>
                <p className="text-sm text-gray-500">Configura las notificaciones por correo y sistema</p>
              </div>
            </div>
          </div>
        );
      case "usuarios":
        return (
          <div>
            <h3 className="text-lg font-medium mb-2">Gestión de Usuarios</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Administra los usuarios y sus permisos en el sistema.
            </p>
            <div className="mt-4 p-6 text-center text-gray-500 border border-dashed rounded-md">
              Funcionalidad en desarrollo
            </div>
          </div>
        );
      case "seguridad":
        return (
          <div>
            <h3 className="text-lg font-medium mb-2">Seguridad</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Configura las opciones de seguridad y respaldo.
            </p>
            <div className="mt-4 p-6 text-center text-gray-500 border border-dashed rounded-md">
              Funcionalidad en desarrollo
            </div>
          </div>
        );
      default:
        return <div>Selecciona una opción del menú</div>;
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-md shadow-sm mt-4">
      <h2 className="text-xl font-semibold mb-6">Configuración</h2>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Menu */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {menuItems.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full text-left py-3 px-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                      activeSection === item.id 
                        ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 font-medium' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Right Content */}
        <div className="flex-grow">
          <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
