// ============================================================
// VISTAS: Catálogo + Personalizador 2D v3.0
//
// Estas dos pantallas no están en los objetivos del documento: se
// construyen por decisión del equipo. Para que no queden como un
// anexo suelto, se integran al circuito financiero —
//
//   pedido → orden de producción → ingreso registrado
//
// Así la tienda deja de ser un adorno y pasa a alimentar los
// objetivos 2, 3 y 5.
//
// v3: el catálogo sale de la base (prendas marcadas como
// publicadas) y el estampado se sube de verdad, reducido en el
// navegador antes de viajar.
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingBag, Upload, RotateCw, Loader2, Check, X, Trash2, ImageIcon, AlertTriangle,
} from 'lucide-react';
import { api } from '../lib/api';
import { reducirImagen } from '../lib/imagen';
import { Modal, FormField, inputClass } from '../components/Modal';
import { Cargando, ErrorCarga, SinDatos } from '../components/Layout';
import { useCart } from '../context/CartContext';
import { CartModal } from '../components/CartModal';
import { bs } from 'shared/formato';
import { COLORES_TELA, TALLAS_MEDIDAS } from '../data/mockData';

// ══════════════════════════════════════════════════════════════
// CATÁLOGO
// ══════════════════════════════════════════════════════════════

export const Catalogo = ({ setVista }) => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  const { items, agregarItem } = useCart();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await api.get('/tienda/productos'));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) return <Cargando texto="Cargando el catálogo..." />;
  if (error) return <ErrorCarga mensaje={error} onReintentar={cargar} />;

  const productos =
    filtro === 'todas' ? datos.productos : datos.productos.filter((p) => p.categoria === filtro);

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-1.5 flex-wrap">
          <Chip activo={filtro === 'todas'} onClick={() => setFiltro('todas')}>
            Todas
          </Chip>
          {datos.categorias.map((c) => (
            <Chip key={c} activo={filtro === c} onClick={() => setFiltro(c)}>
              {c}
            </Chip>
          ))}
        </div>

        <button
          onClick={() => setCarritoAbierto(true)}
          className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2.5 text-xs font-black rounded-sm hover:bg-stone-800 relative"
        >
          <ShoppingBag size={14} /> MI CARRITO
          {items.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-orange-500 text-stone-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
              {items.length}
            </span>
          )}
        </button>
      </div>

      {datos.productos.length === 0 ? (
        <SinDatos titulo="La tienda está vacía por ahora" texto={datos.aviso} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {productos.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-stone-200 rounded-sm overflow-hidden hover:border-stone-400 transition-colors flex flex-col"
            >
              <div className="h-40 bg-stone-100 flex items-center justify-center text-6xl">
                {p.imagenUrl ? (
                  <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span>{p.emoji ?? '👕'}</span>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col gap-3">
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">
                    {p.taller.nombre}
                  </div>
                  <h3 className="font-black text-stone-900 leading-snug">{p.nombre}</h3>
                  {p.descripcion && (
                    <p className="text-xs text-stone-500 mt-1 leading-relaxed">{p.descripcion}</p>
                  )}
                </div>

                <div className="flex items-end justify-between gap-3 pt-3 border-t border-stone-100">
                  <div className="text-xl font-black">{bs(p.precioVenta)}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        agregarItem({
                          productoId: p.id,
                          tallerId: p.taller.id,
                          nombre: p.nombre,
                          precio: p.precioVenta,
                          cantidad: 1,
                        })
                      }
                      className="px-3 py-2 border border-stone-300 text-xs font-bold rounded-sm hover:bg-stone-100"
                    >
                      AGREGAR
                    </button>
                    <button
                      onClick={() => setVista('personalizar')}
                      className="px-3 py-2 bg-orange-500 text-stone-950 text-xs font-black rounded-sm hover:bg-orange-400"
                    >
                      PERSONALIZAR
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CartModal open={carritoAbierto} onClose={() => setCarritoAbierto(false)} />
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// PERSONALIZADOR 2D
// ══════════════════════════════════════════════════════════════

export const Personalizador = () => {
  const [productos, setProductos] = useState([]);
  const [producto, setProducto] = useState(null);
  const [colorTela, setColorTela] = useState(COLORES_TELA[0]);
  const [talla, setTalla] = useState('M');
  const [estampado, setEstampado] = useState(null);
  const [infoImagen, setInfoImagen] = useState(null);
  const [errorImagen, setErrorImagen] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 45, escala: 1 });
  const [arrastrando, setArrastrando] = useState(false);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const inputRef = useRef(null);
  const lienzoRef = useRef(null);
  const { items, agregarItem } = useCart();

  useEffect(() => {
    api
      .get('/tienda/productos')
      .then((d) => {
        setProductos(d.productos);
        setProducto(d.productos[0] ?? null);
      })
      .catch(() => {});
  }, []);

  const medidas = TALLAS_MEDIDAS[talla];
  const recargo = estampado ? 15 : 0;
  const precioTotal = (producto?.precioVenta ?? 0) + recargo;

  const subirImagen = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendo(true);
    setErrorImagen(null);
    try {
      const r = await reducirImagen(archivo);
      setEstampado(r.dataUrl);
      setInfoImagen(r);
    } catch (err) {
      setErrorImagen(err.message);
    } finally {
      setSubiendo(false);
    }
  };

  const mover = (e) => {
    if (!arrastrando || !lienzoRef.current) return;
    const r = lienzoRef.current.getBoundingClientRect();
    setPos((p) => ({
      ...p,
      x: Math.max(20, Math.min(80, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(25, Math.min(72, ((e.clientY - r.top) / r.height) * 100)),
    }));
  };

  const agregar = () => {
    if (!producto) return;
    agregarItem({
      productoId: producto.id,
      tallerId: producto.taller.id,
      nombre: producto.nombre,
      precio: precioTotal,
      cantidad: 1,
      color: colorTela.nombre,
      colorHex: colorTela.hex,
      talla,
      estampado,
      posicionJson: pos,
    });
    setConfirmado(true);
    setTimeout(() => setConfirmado(false), 2200);
  };

  if (!producto) {
    return (
      <SinDatos
        titulo="No hay prendas para personalizar"
        texto="El taller todavía no publicó ninguna prenda en la tienda."
      />
    );
  }

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-12 h-screen overflow-hidden"
      onMouseUp={() => setArrastrando(false)}
      onMouseLeave={() => setArrastrando(false)}
      onMouseMove={mover}
    >
      {/* ── Lienzo ─────────────────────────────────── */}
      <div className="lg:col-span-7 bg-stone-100 relative flex flex-col items-center justify-center overflow-hidden min-h-[26rem]">
        <div className="absolute top-0 left-0 right-0 px-6 py-4 flex justify-between items-center bg-stone-100/80 backdrop-blur-sm z-10 border-b border-stone-200">
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500">Editor 2D</div>
            <h2 className="text-lg font-black tracking-tight truncate">{producto.nombre}</h2>
          </div>
          <button
            onClick={() => setCarritoAbierto(true)}
            className="bg-white border border-stone-200 px-3 py-1.5 text-xs font-bold rounded-sm hover:bg-stone-50 flex items-center gap-1.5 relative shrink-0"
          >
            <ShoppingBag size={12} /> CARRITO
            {items.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-stone-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {items.length}
              </span>
            )}
          </button>
        </div>

        <div ref={lienzoRef} className="relative w-[340px] h-[400px] mt-14">
          <svg viewBox="0 0 400 460" className="w-full h-full" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))' }}>
            <path
              d="M 100 80 L 60 100 L 30 180 L 70 200 L 80 190 L 80 420 L 320 420 L 320 190 L 330 200 L 370 180 L 340 100 L 300 80 L 260 70 Q 230 110 200 110 Q 170 110 140 70 Z"
              fill={colorTela.hex}
              stroke={['#f5f5f0', '#e8dcc4'].includes(colorTela.hex) ? '#c0bdb6' : '#00000020'}
              strokeWidth="1.5"
            />
            <path
              d="M 140 70 Q 170 110 200 110 Q 230 110 260 70 Q 230 93 200 93 Q 170 93 140 70 Z"
              fill={colorTela.hex}
              stroke="#00000030"
              strokeWidth="1.5"
            />
            <path d="M 80 200 Q 82 310 82 420" stroke="#00000012" strokeWidth="2" fill="none" />
            <path d="M 318 200 Q 316 310 316 420" stroke="#00000012" strokeWidth="2" fill="none" />
          </svg>

          {estampado && (
            <img
              src={estampado}
              alt="Estampado"
              onMouseDown={() => setArrastrando(true)}
              className="absolute select-none cursor-move"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${28 * pos.escala}%`,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'auto',
              }}
              draggable={false}
            />
          )}
        </div>

        {estampado && (
          <div className="absolute bottom-4 text-[11px] text-stone-500">
            Arrastrá el dibujo para moverlo sobre la prenda
          </div>
        )}
      </div>

      {/* ── Panel ──────────────────────────────────── */}
      <div className="lg:col-span-5 bg-white border-l border-stone-200 overflow-y-auto p-6 space-y-6">
        {productos.length > 1 && (
          <FormField label="¿Qué prenda?">
            <select
              value={producto.id}
              onChange={(e) => setProducto(productos.find((p) => p.id === e.target.value))}
              className={inputClass}
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <div>
          <div className="text-[11px] font-bold tracking-[0.15em] uppercase text-stone-500 mb-2">
            Color de la tela
          </div>
          <div className="grid grid-cols-4 gap-2">
            {COLORES_TELA.map((c) => (
              <button
                key={c.nombre}
                onClick={() => setColorTela(c)}
                title={c.nombre}
                className={`h-12 rounded-sm border-2 transition-all ${
                  colorTela.nombre === c.nombre ? 'border-orange-500 scale-95' : 'border-stone-200'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          <div className="text-xs text-stone-500 mt-1.5">{colorTela.nombre}</div>
        </div>

        <div>
          <div className="text-[11px] font-bold tracking-[0.15em] uppercase text-stone-500 mb-2">
            Talla
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Object.keys(TALLAS_MEDIDAS).map((t) => (
              <button
                key={t}
                onClick={() => setTalla(t)}
                className={`py-2.5 rounded-sm border-2 font-bold text-sm ${
                  talla === t ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-stone-500 mt-1.5">
            Pecho {medidas.pecho} cm · largo {medidas.largo} cm · hombro {medidas.hombro} cm
          </div>
        </div>

        <div>
          <div className="text-[11px] font-bold tracking-[0.15em] uppercase text-stone-500 mb-2">
            Tu dibujo o logo
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={subirImagen}
            className="hidden"
          />

          {errorImagen && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 text-xs rounded-sm p-3 mb-2 flex items-start gap-2">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {errorImagen}
            </div>
          )}

          {!estampado ? (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              className="w-full border-2 border-dashed border-stone-300 rounded-sm py-8 flex flex-col items-center gap-2 text-stone-500 hover:border-orange-400 hover:text-orange-600 disabled:opacity-50"
            >
              {subiendo ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <Upload size={22} />
              )}
              <span className="text-sm font-bold">
                {subiendo ? 'Preparando la imagen...' : 'Subí tu dibujo'}
              </span>
              <span className="text-[11px]">JPG o PNG · se achica sola</span>
            </button>
          ) : (
            <div className="border border-stone-200 rounded-sm p-3 space-y-3">
              <div className="flex items-center gap-3">
                <img src={estampado} alt="" className="w-14 h-14 object-contain bg-stone-100 rounded-sm" />
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-bold text-stone-800">Listo para estampar</div>
                  {infoImagen && (
                    <div className="text-stone-500">
                      {infoImagen.original} KB → <strong>{infoImagen.kb} KB</strong>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setEstampado(null);
                    setInfoImagen(null);
                  }}
                  className="p-1.5 text-stone-400 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div>
                <label className="text-[11px] text-stone-500">Tamaño en la prenda</label>
                <input
                  type="range"
                  min="0.4"
                  max="2"
                  step="0.05"
                  value={pos.escala}
                  onChange={(e) => setPos((p) => ({ ...p, escala: Number(e.target.value) }))}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Precio */}
        <div className="bg-stone-950 text-white p-5 rounded-sm">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-stone-400">{producto.nombre}</span>
            <span>{bs(producto.precioVenta)}</span>
          </div>
          {recargo > 0 && (
            <div className="flex justify-between text-sm mb-1">
              <span className="text-stone-400">Estampado personalizado</span>
              <span>{bs(recargo)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-3 mt-2 border-t border-stone-800">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-black text-orange-400">{bs(precioTotal)}</span>
          </div>
        </div>

        <button
          onClick={agregar}
          className="w-full py-3.5 bg-orange-500 text-stone-950 rounded-sm font-black text-sm hover:bg-orange-400 flex items-center justify-center gap-2"
        >
          {confirmado ? (
            <>
              <Check size={16} /> AGREGADO AL CARRITO
            </>
          ) : (
            <>
              <ShoppingBag size={16} /> AGREGAR AL CARRITO
            </>
          )}
        </button>
      </div>

      <CartModal open={carritoAbierto} onClose={() => setCarritoAbierto(false)} />
    </div>
  );
};

const Chip = ({ activo, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-sm text-xs font-bold ${
      activo ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
    }`}
  >
    {children}
  </button>
);
