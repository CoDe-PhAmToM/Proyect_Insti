// ============================================================
// DIBUJO DE LA PRENDA
//
// Pinta la prenda que corresponde — polera, polo, chamarra o buzo —
// de frente o de espalda, con el estampado en la zona elegida.
//
// Antes el editor dibujaba siempre una polera aunque eligieras
// chamarra. El cliente personalizaba una prenda y veía otra.
//
// El sombreado es un degradado suave sobre el color de la tela, no
// una textura de imagen: pesa cero y funciona con cualquier color.
// ============================================================

import React from 'react';
import { necesitaBorde } from '../data/prendas';

export const Prenda = ({
  prenda,
  vista = 'frente',
  colorHex = '#1a1a1a',
  estampado = null,
  zona = null,
  escala = 1,
  onZona = null,
  mostrarZonas = false,
  idGradiente = 'tela',
}) => {
  const trazos = prenda[vista] ?? prenda.frente;
  const claro = necesitaBorde(colorHex);
  const borde = claro ? '#c0bdb6' : '#00000022';

  // Solo las zonas que existen en esta vista
  const zonasVisibles = prenda.zonas.filter(
    (z) => z.vista === 'ambas' || z.vista === vista
  );

  return (
    <svg viewBox="0 0 400 460" className="w-full h-full" style={{ filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.14))' }}>
      <defs>
        {/* Sombreado de la tela: más claro arriba, más oscuro abajo */}
        <linearGradient id={`${idGradiente}-luz`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={claro ? 0.35 : 0.16} />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity={claro ? 0.1 : 0.22} />
        </linearGradient>

        {/* El estampado se recorta a la silueta: no puede salirse */}
        <clipPath id={`${idGradiente}-recorte`}>
          {trazos
            .filter((t) => t.tipo === 'cuerpo' && t.d)
            .map((t, i) => (
              <path key={i} d={t.d} />
            ))}
        </clipPath>
      </defs>

      {/* Cuerpo de la prenda */}
      {trazos.map((t, i) => {
        if (t.cx != null) {
          return (
            <circle
              key={i}
              cx={t.cx}
              cy={t.cy}
              r={t.r}
              fill={claro ? '#a8a29e' : '#ffffff'}
              opacity="0.75"
            />
          );
        }
        if (t.tipo === 'cuerpo') {
          return (
            <path
              key={i}
              d={t.d}
              fill={colorHex}
              stroke={t.borde ? borde : borde}
              strokeWidth="1.5"
            />
          );
        }
        if (t.tipo === 'accesorio') {
          return (
            <path
              key={i}
              d={t.d}
              fill="none"
              stroke={claro ? '#78716c' : '#d6d3d1'}
              strokeWidth={t.grosor ?? 4}
              strokeLinecap="round"
              opacity="0.85"
            />
          );
        }
        return (
          <path
            key={i}
            d={t.d}
            fill="none"
            stroke={claro ? '#00000025' : '#00000030'}
            strokeWidth={t.grosor ?? 2}
            strokeLinecap="round"
          />
        );
      })}

      {/* Estampado, recortado a la prenda */}
      {estampado && zona && (
        <g clipPath={`url(#${idGradiente}-recorte)`}>
          <image
            href={estampado}
            x={(zona.x / 100) * 400 - ((zona.ancho / 100) * 400 * escala) / 2}
            y={(zona.y / 100) * 460 - ((zona.ancho / 100) * 400 * escala) / 2}
            width={(zona.ancho / 100) * 400 * escala}
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      )}

      {/* Sombreado encima, para que el estampado siga la tela */}
      <g clipPath={`url(#${idGradiente}-recorte)`} style={{ pointerEvents: 'none' }}>
        {trazos
          .filter((t) => t.tipo === 'cuerpo' && t.d)
          .map((t, i) => (
            <path key={i} d={t.d} fill={`url(#${idGradiente}-luz)`} />
          ))}
      </g>

      {/* Zonas donde se puede estampar */}
      {mostrarZonas &&
        zonasVisibles.map((z) => {
          const activa = zona?.id === z.id;
          const ancho = (z.ancho / 100) * 400;
          return (
            <g
              key={z.id}
              onClick={() => onZona?.(z)}
              style={{ cursor: onZona ? 'pointer' : 'default' }}
            >
              <rect
                x={(z.x / 100) * 400 - ancho / 2}
                y={(z.y / 100) * 460 - ancho / 2}
                width={ancho}
                height={ancho}
                rx="4"
                fill={activa ? '#f9731622' : '#00000008'}
                stroke={activa ? '#f97316' : '#00000035'}
                strokeWidth={activa ? 2.5 : 1.5}
                strokeDasharray={activa ? '0' : '5 4'}
              />
              {!estampado && (
                <text
                  x={(z.x / 100) * 400}
                  y={(z.y / 100) * 460 + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill={activa ? '#ea580c' : '#57534e'}
                  style={{ pointerEvents: 'none' }}
                >
                  {z.nombre.split(' ')[0]}
                </text>
              )}
            </g>
          );
        })}
    </svg>
  );
};
