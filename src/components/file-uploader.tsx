import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFilesUploaded: (files: File[]) => Promise<void>;
  isLoading: boolean;
}

export function FileUploader({ onFilesUploaded, isLoading }: FileUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filtrar solo archivos XML
    const xmlFiles = acceptedFiles.filter(file => 
      file.name.toLowerCase().endsWith('.xml')
    );
    
    if (xmlFiles.length !== acceptedFiles.length) {
      // Podrías mostrar una alerta aquí
      console.warn("Se ignoraron archivos que no son XML");
    }
    
    setFiles(prevFiles => [...prevFiles, ...xmlFiles]);
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/xml': ['.xml']
    }
  });
  
  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };
  
  const handleUpload = async () => {
    if (files.length === 0) return;
    
    // Simular progreso
    const timer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(timer);
          return prev;
        }
        return prev + 5;
      });
    }, 100);
    
    await onFilesUploaded(files);
    setUploadProgress(100);
    
    // Resetear después de completar
    setTimeout(() => {
      setFiles([]);
      setUploadProgress(0);
    }, 1000);
  };
  
  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer",
          isDragActive ? "border-primary bg-primary/5" : "border-gray-300 dark:border-gray-700"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isDragActive
            ? "Suelta los archivos XML aquí..."
            : "Arrastra y suelta archivos XML, o haz clic para seleccionar"}
        </p>
        <p className="text-xs text-gray-500 mt-1">Solo archivos XML de CFDI</p>
      </div>
      
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Archivos seleccionados ({files.length})</div>
          <div className="border rounded-lg overflow-y-auto max-h-[200px] p-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-md"
              >
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-blue-500" />
                  <div className="text-sm truncate max-w-xs">{file.name}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="text-gray-500 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          
          {uploadProgress > 0 && (
            <div className="w-full space-y-1">
              <div className="flex justify-between text-xs">
                <span>Cargando...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
          
          <div className="flex justify-end">
            <Button 
              onClick={() => setFiles([])} 
              variant="outline" 
              size="sm"
              className="mr-2"
              disabled={isLoading}
            >
              Limpiar
            </Button>
            <Button 
              onClick={handleUpload} 
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <>Procesando...</>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Procesar {files.length} archivo{files.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
