// ============================================================
// PRONOSTICO DE DEMANDA
//
// Media movil y tendencia por minimos cuadrados. Funciones puras,
// sin dependencias, para poder probarlas contra calculos hechos a
// mano.
//
// Nota honesta sobre el nombre: esto es estadistica descriptiva y
// regresion lineal, no inteligencia artificial. En la pantalla se
// llama "Recomendaciones"; en el documento conviene describirlo por
// lo que hace. Si un jurado pregunta "donde esta la IA", la
// respuesta honesta se sostiene y la inflada se cae en dos
// preguntas.
//
// Regla de oro de todo este modulo: cuando no hay datos suficientes
// para afirmar algo, se dice. Nunca se devuelve un numero inventado.
// ============================================================

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const red = (n, d = 2) => {
  const f = 10 ** d;
  return Math.round((num(n) + Number.EPSILON) * f) / f;
};

/** Minimo de periodos para que una tendencia signifique algo. */
export const MINIMO_PERIODOS = 3;

/**
 * Media movil simple de los ultimos N periodos.
 * Es el pronostico mas conservador: sirve cuando la serie es corta
 * o ruidosa, que es lo habitual en un taller chico.
 */
export const mediaMovil = (serie = [], ventana = 3) => {
  const valores = serie.map(num);
  if (valores.length === 0) return null;

  const ultimos = valores.slice(-ventana);
  return red(ultimos.reduce((a, v) => a + v, 0) / ultimos.length);
};

/**
 * Tendencia por minimos cuadrados sobre la serie.
 *
 * Devuelve la pendiente (cuanto sube o baja por periodo), el
 * pronostico del proximo periodo y el R2, que dice que tan bien la
 * recta explica los datos. Un R2 bajo significa que la serie es
 * demasiado erratica para confiar en la tendencia — y eso se
 * reporta, no se esconde.
 */
export const tendencia = (serie = []) => {
  const y = serie.map(num);
  const n = y.length;

  if (n < MINIMO_PERIODOS) {
    return {
      confiable: false,
      motivo: `Hacen falta al menos ${MINIMO_PERIODOS} meses de datos para ver una tendencia. Hay ${n}.`,
      pendiente: null,
      proximo: null,
      r2: null,
      direccion: null,
    };
  }

  const x = y.map((_, i) => i + 1);
  const sumX = x.reduce((a, v) => a + v, 0);
  const sumY = y.reduce((a, v) => a + v, 0);
  const sumXY = x.reduce((a, v, i) => a + v * y[i], 0);
  const sumX2 = x.reduce((a, v) => a + v * v, 0);

  const denominador = n * sumX2 - sumX * sumX;
  if (denominador === 0) {
    return { confiable: false, motivo: 'La serie no permite calcular una tendencia.', pendiente: null, proximo: null, r2: null, direccion: null };
  }

  const pendiente = (n * sumXY - sumX * sumY) / denominador;
  const intercepto = (sumY - pendiente * sumX) / n;

  // R2: que porcion de la variacion explica la recta
  const mediaY = sumY / n;
  const ssTot = y.reduce((a, v) => a + (v - mediaY) ** 2, 0);
  const ssRes = y.reduce((a, v, i) => a + (v - (pendiente * x[i] + intercepto)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  const proximo = Math.max(0, pendiente * (n + 1) + intercepto);

  return {
    confiable: r2 >= 0.5,
    motivo:
      r2 < 0.5
        ? 'Tus ventas varían demasiado de un mes a otro como para marcar una tendencia clara.'
        : null,
    pendiente: red(pendiente),
    intercepto: red(intercepto),
    proximo: red(proximo),
    r2: red(r2, 3),
    direccion: pendiente > 0.5 ? 'sube' : pendiente < -0.5 ? 'baja' : 'estable',
  };
};

/**
 * Junta media movil y tendencia en un solo pronostico, con la frase
 * que lo explica en castellano llano.
 *
 * @param {number[]} serie unidades vendidas por mes, del mas viejo al mas nuevo
 * @param {string} nombre  como se llama la prenda, para armar la frase
 */
export const pronosticar = (serie = [], nombre = 'esta prenda') => {
  const n = serie.length;
  const media = mediaMovil(serie);
  const t = tendencia(serie);

  if (n === 0) {
    return {
      hayDatos: false,
      mensaje: `Todavía no hay ventas registradas de ${nombre}.`,
      estimado: null,
      periodosUsados: 0,
    };
  }

  if (n < MINIMO_PERIODOS) {
    return {
      hayDatos: true,
      suficiente: false,
      estimado: media,
      periodosUsados: n,
      mensaje: `Con ${n} mes${n !== 1 ? 'es' : ''} de datos solo se puede estimar por promedio: unas ${Math.round(media)} unidades. El pronóstico se vuelve confiable a partir de ${MINIMO_PERIODOS} meses.`,
      tendencia: t,
    };
  }

  // Con tendencia confiable se usa la recta; si no, el promedio,
  // que es mas prudente.
  const estimado = t.confiable ? t.proximo : media;

  const frase = t.confiable
    ? t.direccion === 'sube'
      ? `Las ventas de ${nombre} vienen subiendo unas ${Math.abs(t.pendiente).toFixed(1)} unidades por mes. Para el mes que viene se estiman ${Math.round(estimado)}.`
      : t.direccion === 'baja'
        ? `Las ventas de ${nombre} vienen bajando unas ${Math.abs(t.pendiente).toFixed(1)} unidades por mes. Para el mes que viene se estiman ${Math.round(estimado)}.`
        : `Las ventas de ${nombre} se mantienen parejas en unas ${Math.round(estimado)} unidades por mes.`
    : `${t.motivo} Por eso se toma el promedio de los últimos meses: unas ${Math.round(estimado)} unidades.`;

  return {
    hayDatos: true,
    suficiente: true,
    estimado: red(estimado),
    mediaMovil: media,
    periodosUsados: n,
    tendencia: t,
    mensaje: frase,
  };
};

/**
 * Indice estacional por mes. Un valor de 1.5 en junio significa que
 * en junio se vende un 50 % mas que el promedio del año.
 *
 * Necesita 12 meses. Con menos, cualquier "estacionalidad" que se
 * calcule es ruido — y afirmarla seria justamente el tipo de
 * invento que este modulo viene a eliminar.
 */
export const indiceEstacional = (porMes = {}) => {
  const meses = Object.keys(porMes);
  if (meses.length < 12) {
    return {
      hayEstacionalidad: false,
      motivo: `Para hablar de temporadas hacen falta 12 meses de datos. Hay ${meses.length}.`,
      indices: null,
    };
  }

  const valores = Object.values(porMes).map(num);
  const promedio = valores.reduce((a, v) => a + v, 0) / valores.length;
  if (promedio === 0) {
    return { hayEstacionalidad: false, motivo: 'No hay ventas registradas.', indices: null };
  }

  const indices = Object.fromEntries(
    Object.entries(porMes).map(([mes, v]) => [mes, red(num(v) / promedio, 2)])
  );

  const ordenados = Object.entries(indices).sort((a, b) => b[1] - a[1]);

  return {
    hayEstacionalidad: true,
    indices,
    mesFuerte: ordenados[0],
    mesFlojo: ordenados.at(-1),
  };
};
