import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

export default function FileUploader({ onFileSelect, accept, label, preview, file, maxFiles = 1 }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      onFileSelect(file);
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result);
      reader.readAsDataURL(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    multiple: false,
  });

  const displayPreview = previewUrl || preview;

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-semibold text-brown">{label}</label>}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all
          ${isDragActive ? 'border-gold bg-gold bg-opacity-10' : 'border-brown hover:border-gold'}
          ${displayPreview ? 'h-32' : 'h-40'}`}
      >
        <input {...getInputProps()} />
        {displayPreview ? (
          <div className="relative h-full">
            {file?.type === 'application/pdf' || (preview && preview.includes('pdf')) ? (
              <div className="flex items-center justify-center h-full text-brown">
                <span className="text-4xl">📄</span>
                <span className="ml-2 text-sm">{file?.name || 'PDF'}</span>
              </div>
            ) : (
              <img src={displayPreview} alt="Preview" className="h-full w-auto mx-auto object-contain" />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-brown">
            <span className="text-3xl mb-2">📁</span>
            <p className="text-sm">{isDragActive ? 'Déposez ici' : 'Glissez ou cliquez'}</p>
            <p className="text-xs text-brown-opacity-70 mt-1">{accept}</p>
          </div>
        )}
      </div>
    </div>
  );
}