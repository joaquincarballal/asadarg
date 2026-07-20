import imageCompression from 'browser-image-compression';

const FORMATOS_ACEPTADOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/** Comprime una foto client-side a ~200KB antes de subirla (constitución: fotos). */
export async function comprimirFoto(file: File): Promise<File> {
  if (!FORMATOS_ACEPTADOS.includes(file.type)) {
    throw new Error('Formato de imagen no soportado — usá JPG, PNG o WEBP.');
  }

  return imageCompression(file, {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  });
}
