// ============================================================
// ALMACENAMIENTO DE ESTAMPADOS
//
// El plan original era Cloudinary, pero eso obliga al equipo a
// crear otra cuenta y no aporta nada al piloto. Se guarda la imagen
// en la base, ya reducida por el navegador a 500 px y comprimida.
//
// Las cuentas: un estampado asi pesa entre 25 y 60 KB. Con el medio
// giga del plan gratuito de Neon entran mas de 8.000 pedidos, y el
// piloto son 3 a 15 talleres durante unos meses. Alcanza de sobra.
//
// Cuando el volumen lo justifique, se cambia SOLO este archivo:
// guardarEstampado() pasa a subir a Cloudinary o S3 y devuelve la
// URL. El resto del sistema no se entera, porque en la base ya se
// guarda un campo llamado estampadoUrl.
// ============================================================

import { errores } from '../lib/errores.js';

// Tope por imagen. El navegador ya la reduce; esto ataja el caso de
// alguien golpeando la API directamente.
const MAXIMO_BYTES = 250 * 1024;

const FORMATOS = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Valida y normaliza un estampado recibido como data URL.
 * Devuelve lo que se guarda en PedidoItem.estampadoUrl.
 */
export const guardarEstampado = async (dataUrl) => {
  if (!dataUrl) return null;

  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw errores.datosInvalidos('El estampado no tiene un formato válido');
  }

  const coincidencia = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!coincidencia) {
    throw errores.datosInvalidos('El estampado tiene que venir en base64');
  }

  const [, tipo, datos] = coincidencia;

  if (!FORMATOS.includes(tipo)) {
    throw errores.datosInvalidos(
      `Ese tipo de imagen no se acepta. Usá JPG, PNG o WebP.`
    );
  }

  // La longitud en base64 sobreestima ~4/3 el tamaño real
  const bytes = Math.floor((datos.length * 3) / 4);
  if (bytes > MAXIMO_BYTES) {
    throw errores.datosInvalidos(
      `La imagen pesa ${Math.round(bytes / 1024)} KB y el máximo son ${MAXIMO_BYTES / 1024} KB. Probá con una más chica.`
    );
  }

  return dataUrl;
};

export const LIMITE_KB = MAXIMO_BYTES / 1024;
