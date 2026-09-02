// ============================================================
// REDUCCIÓN DE IMÁGENES
//
// El estampado se reduce ANTES de subirlo. Una foto de celular
// pesa entre 3 y 8 MB; reducida a 500 px queda en 25–60 KB.
//
// Dos razones, y ninguna es técnica en el fondo:
//  - En el Distrito 6 la conexión es intermitente y muchas veces
//    por datos móviles. Subir 5 MB puede tardar minutos o fallar.
//  - Para estampar una prenda, 500 px alcanza y sobra.
// ============================================================

const MAX_LADO = 500;
const CALIDAD = 0.82;

/**
 * @param {File} archivo imagen elegida por el usuario
 * @returns {Promise<{dataUrl:string, kb:number, original:number}>}
 */
export const reducirImagen = (archivo) =>
  new Promise((resolve, reject) => {
    if (!archivo.type.startsWith('image/')) {
      return reject(new Error('Ese archivo no es una imagen'));
    }

    const lector = new FileReader();

    lector.onerror = () => reject(new Error('No se pudo leer la imagen'));
    lector.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error('Esa imagen está dañada o no se puede abrir'));
      img.onload = () => {
        const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
        const ancho = Math.round(img.width * escala);
        const alto = Math.round(img.height * escala);

        const lienzo = document.createElement('canvas');
        lienzo.width = ancho;
        lienzo.height = alto;

        const ctx = lienzo.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, ancho, alto);

        // PNG conserva la transparencia, que en un estampado importa;
        // el resto va a JPEG, que pesa bastante menos.
        const conservaTransparencia = archivo.type === 'image/png';
        const dataUrl = conservaTransparencia
          ? lienzo.toDataURL('image/png')
          : lienzo.toDataURL('image/jpeg', CALIDAD);

        resolve({
          dataUrl,
          kb: Math.round((dataUrl.length * 3) / 4 / 1024),
          original: Math.round(archivo.size / 1024),
          ancho,
          alto,
        });
      };

      img.src = lector.result;
    };

    lector.readAsDataURL(archivo);
  });
