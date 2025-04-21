'use client';

import { useState, useEffect } from 'react';
import { IconType } from 'react-icons';
import Image from 'next/image';

interface ContactButtonProps {
  buttonText: string;
  icon?: IconType;
  origin: string;
  modalTitle: string;
}

export default function ContactButton({ buttonText, icon: Icon, origin, modalTitle }: ContactButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    interest: '',
    otherInterest: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const interestOptions = [
    "Contabilidad para persona física",
    "Contabilidad para persona empresarial",
    "Otro"
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = "El nombre es obligatorio";
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      newErrors.email = "Correo electrónico inválido";
    }
    
    // Validate Mexican phone number
    const phoneRegex = /^(\+?52)?(1)?\d{10}$/;
    if (!formData.phone.trim() || !phoneRegex.test(formData.phone)) {
      newErrors.phone = "Número de teléfono mexicano inválido";
    }
    
    // Validate interest
    if (!formData.interest) {
      newErrors.interest = "Por favor selecciona una opción";
    }
    
    // If "Otro" is selected, validate otherInterest
    if (formData.interest === "Otro" && !formData.otherInterest.trim()) {
      newErrors.otherInterest = "Por favor especifica tu interés";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setFormData(prev => ({ ...prev, phone: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsSubmitting(true);
      
      try {
        // Here you would add the API call to send the form data
        console.log('Form submitted:', { ...formData, origin });
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Success handling
        setIsOpen(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          interest: '',
          otherInterest: ''
        });
        alert('¡Gracias por contactarnos! Nos comunicaremos contigo pronto.');
      } catch (error) {
        console.error('Error submitting form:', error);
        alert('Hubo un error al enviar el formulario. Por favor intenta de nuevo.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-zinc-800 hover:bg-zinc-700 whitespace-nowrap"
      >
        {buttonText}
        {Icon ? <Icon className="ml-2" /> : <span className="ml-2">→</span>}
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          {/* Modal Content */}
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">{modalTitle}</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Cerrar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4">
              <div className="space-y-4">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 text-start">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-zinc-600 ${errors.name ? 'border-red-500 ring-red-500' : ''}`}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>
                
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 text-start">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-zinc-600 ${errors.email ? 'border-red-500 ring-red-500' : ''}`}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>
                
                {/* Phone Field with Mexico Flag */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 text-start">
                    Teléfono móvil
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      <Image src="/mexico-flag.svg" alt="Mexico" width={24} height={16} className="mr-1" />
                      +52
                    </span>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="10 dígitos"
                      className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-r-md border text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-zinc-600 ${errors.phone ? 'border-red-500 ring-red-500' : ''}`}
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>
                
                {/* Interest Dropdown */}
                <div>
                  <label htmlFor="interest" className="block text-sm font-medium text-gray-700 text-start">
                    Interés
                  </label>
                  <select
                    id="interest"
                    name="interest"
                    value={formData.interest}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-zinc-600 ${errors.interest ? 'border-red-500 ring-red-500' : ''}`}
                  >
                    <option value="">Selecciona una opción</option>
                    {interestOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {errors.interest && <p className="mt-1 text-sm text-red-600">{errors.interest}</p>}
                </div>
                
                {/* Conditional Other Interest Field */}
                {formData.interest === "Otro" && (
                  <div>
                    <label htmlFor="otherInterest" className="block text-sm font-medium text-gray-700 text-start">
                      Especifica tu interés
                    </label>
                    <textarea
                      id="otherInterest"
                      name="otherInterest"
                      rows={3}
                      value={formData.otherInterest}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-zinc-600 ${errors.otherInterest ? 'border-red-500 ring-red-500' : ''}`}
                    />
                    {errors.otherInterest && <p className="mt-1 text-sm text-red-600">{errors.otherInterest}</p>}
                  </div>
                )}
              </div>
              
              <div className="mt-5">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-zinc-800 text-base font-medium text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 disabled:bg-zinc-300"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
