import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export default function RenderUploader({ files = [], onAdd, onRemove, maxFiles = 6 }) {
  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach(file => {
      if (files.length < maxFiles) {
        onAdd(file);
      }
    });
  }, [files.length, maxFiles, onAdd]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
    maxFiles: maxFiles - files.length,
  });

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-brown">Rendus 3D (max {maxFiles})</label>
      <div className="grid grid-cols-3 gap-3">
        {files.map((file, index) => (
          <div key={index} className="relative border-2 border-brown rounded-lg p-2 h-24 bg-white">
            <img
              src={URL.createObjectURL(file)}
              alt={`Rendu ${index + 1}`}
              className="h-full w-full object-contain"
            />
            <button
              onClick={() => onRemove(index)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600"
            >
              ×
            </button>
            {index === 0 && (
              <span className="absolute bottom-1 left-1 bg-gold text-white text-xs px-1 rounded">Principal</span>
            )}
          </div>
        ))}
        {files.length < maxFiles && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg h-24 flex items-center justify-center cursor-pointer transition-all
              ${isDragActive ? 'border-gold bg-gold bg-opacity-10' : 'border-brown hover:border-gold'}`}
          >
            <input {...getInputProps()} />
            <div className="text-center text-brown">
              <span className="text-2xl">+</span>
              <p className="text-xs">Ajouter</p>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-brown opacity-70 mt-1">
        {files.length} / {maxFiles} rendus uploadés
      </p>
    </div>
  );
}