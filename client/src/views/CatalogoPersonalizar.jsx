// ============================================================
// VISTAS: Catálogo + Personalizador 2D v4.0
//
// v4: el editor dibuja la prenda que corresponde. Antes mostraba
// siempre una polera aunque eligieras chamarra: el cliente
// personalizaba una prenda y veía otra.
//
// Ahora hay polera, polo, chamarra y buzo, con frente y espalda, y
// zonas de estampado declaradas por prenda — pecho, espalda,
// mangas. En una chamarra con cierre no se ofrece el pecho entero,
// porque el cierre parte el dibujo al medio.
//
// Se mantiene en 2D y no 3D a propósito: un visor 3D suma entre 3 y
// 6 MB de descarga, y todo este sistema parte de que la conexión
// del Distrito 6 es intermitente y se paga por datos móviles.
// ============================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ShoppingBag, Upload, Loader2, Check, Trash2, AlertTriangle,
  RotateCw, Search, ArrowUpDown, Package,
} from 'lucide-react';
import { api } from '../lib/api';
import { reducirImagen } from '../lib/imagen';
import { FormField, inputClass } from '../components/Modal';
import { Cargando, ErrorCarga, SinDatos } from '../components/Layout';
import { Prenda } from '../components/Prenda';
import { useCart } from '../context/CartContext';
import { CartModal } from '../components/CartModal';
import { bs } from 'shared/formato';
import { prendaDe, COLORES_TELA, TALLAS_MEDIDAS } from '../data/prendas';

// ══════════════════════════════════════════════════════════════
// CATÁLOGO
// ══════════════════════════════════════════════════════════════

const ORDENES = [
  { id: 'nombre',      label: 'Nombre' },
  { id: 'precio-asc',  label: 'Más barato' },
  { id: 'precio-desc', label: 'Más caro' },
  { id: 'disponible',  label: 'Listo para llevar' },
];

export const Catalogo = ({ setVista }) => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('nombre');
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

  const productos = useMemo(() => {
    if (!datos) return [];
    const texto = busqueda.trim().toLowerCase();

    let lista = datos.productos.filter((p) => {
      if (filtro !== 'todas' && p.categoria !== filtro) return false;
      if (!texto) return true;
      return `${p.nombre} ${p.descripcion ?? ''} ${p.taller.nombre}`
        .toLowerCase()
        .includes(texto);
    });

    const orden4 = {
      nombre: (a, b) => a.nombre.localeCompare(b.nombre),
      'precio-asc': (a, b) => a.precioVenta - b.precioVenta,
      'precio-desc': (a, b) => b.precioVenta - a.precioVenta,
      disponible: (a, b) => b.listasParaLlevar - a.listasParaLlevar,
    };
    return [...lista].sort(orden4[orden]);
  }, [datos, filtro, busqueda, orden]);

  if (cargando) return <Cargando texto="Cargando el catálogo..." />;
  if (error) return <ErrorCarga mensaje={error} onReintentar={cargar} />;

  return (
    <div className="p-4 sm:p-8 space-y-5">
      {/* Buscador y orden */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[12rem]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar una prenda..."
            className="w-full pl-10 pr-4 py-2.5 border-2 border-stone-200 rounded-sm text-sm focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <ArrowUpDown size={14} className="text-stone-400" />
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            className="px-3 py-2.5 border-2 border-stone-200 rounded-sm text-sm focus:outline-none focus:border-orange-500"
          >
            {ORDENES.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setCarritoAbierto(true)}
          className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2.5 text-xs font-black rounded-sm hover:bg-stone-800 relative shrink-0"
        >
          <ShoppingBag size={14} /> MI CARRITO
          {items.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-orange-500 text-stone-950 text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center">
              {items.length}
            </span>
          )}
        </button>
      </div>

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

      {datos.productos.length === 0 ? (
        <SinDatos titulo="La tienda está vacía por ahora" texto={datos.aviso} />
      ) : productos.length === 0 ? (
        <SinDatos
          titulo="No encontramos nada así"
          texto={`Probá con otra palabra o mirá todas las prendas.`}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {productos.map((p) => (
            <TarjetaProducto
              key={p.id}
              p={p}
              onAgregar={() =>
                agregarItem({
                  productoId: p.id,
                  tallerId: p.taller.id,
                  nombre: p.nombre,
                  precio: p.precioVenta,
                  cantidad: 1,
                })
              }
              onPersonalizar={() => setVista('personalizar')}
            />
          ))}
        </div>
      )}

      <CartModal open={carritoAbierto} onClose={() => setCarritoAbierto(false)} />
    </div>
  );
};

const TarjetaProducto = ({ p, onAgregar, onPersonalizar }) => {
  const prenda = prendaDe(p);

  return (
    <div className="bg-white border border-stone-200 rounded-sm overflow-hidden hover:border-stone-400 transition-colors flex flex-col">
      {/* Vista previa: la prenda real, no un emoji */}
      <div className="h-48 bg-stone-50 flex items-center justify-center p-4 relative">
        {p.imagenUrl ? (
          <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-32 h-full">
            <Prenda prenda={prenda} colorHex="#44403c" idGradiente={`cat-${p.id}`} />
          </div>
        )}

        <span
          className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-sm ${
            p.disponibilidad === 'listo'
              ? 'bg-green-100 text-green-800'
              : 'bg-stone-200 text-stone-700'
          }`}
        >
          {p.disponibilidad === 'listo' ? `${p.listasParaLlevar} LISTAS` : 'A PEDIDO'}
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wider text-stone-400 mb-1">
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
              onClick={onAgregar}
              className="px-3 py-2 border border-stone-300 text-xs font-bold rounded-sm hover:bg-stone-100"
            >
              AGREGAR
            </button>
            <button
              onClick={onPersonalizar}
              className="px-3 py-2 bg-orange-500 text-stone-950 text-xs font-black rounded-sm hover:bg-orange-400"
            >
              PERSONALIZAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// PERSONALIZADOR
// ══════════════════════════════════════════════════════════════

export const Personalizador = () => {
  const [productos, setProductos] = useState([]);
  const [producto, setProducto] = useState(null);
  const [colorTela, setColorTela] = useState(COLORES_TELA[0]);
  const [talla, setTalla] = useState('M');
  const [vista, setVista] = useState('frente');
  const [estampado, setEstampado] = useState(null);
  const [infoImagen, setInfoImagen] = useState(null);
  const [zona, setZona] = useState(null);
  const [escala, setEscala] = useState(1);
  const [errorImagen, setErrorImagen] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const inputRef = useRef(null);
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

  const prenda = producto ? prendaDe(producto) : null;

  // Al cambiar de prenda, la zona elegida puede no existir en la
  // nueva: una chamarra no tiene "pecho entero".
  useEffect(() => {
    if (!prenda) return;
    const sigueValida = prenda.zonas.some((z) => z.id === zona?.id);
    if (!sigueValida) setZona(prenda.zonas[0] ?? null);
  }, [prenda, zona]);

  const zonasDeVista = prenda
    ? prenda.zonas.filter((z) => z.vista === 'ambas' || z.vista === vista)
    : [];

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
      if (!zona) setZona(prenda.zonas[0]);
    } catch (err) {
      setErrorImagen(err.message);
    } finally {
      setSubiendo(false);
    }
  };

  const agregar = () => {
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
      posicionJson: estampado ? { zona: zona?.id, nombreZona: zona?.nombre, vista, escala } : null,
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
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen">
      {/* ── Lienzo ─────────────────────────────────── */}
      <div className="lg:col-span-7 bg-stone-100 relative flex flex-col items-center justify-center p-4 min-h-[28rem]">
        <div className="absolute top-0 left-0 right-0 px-4 sm:px-6 py-4 flex justify-between items-center bg-stone-100/90 backdrop-blur-sm z-10 border-b border-stone-200">
          <div className="min-w-0">
            <div className="text-[11px] tracking-[0.25em] uppercase text-stone-500">
              {prenda.nombre}
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight truncate">
              {producto.nombre}
            </h2>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setVista((v) => (v === 'frente' ? 'espalda' : 'frente'))}
              className="bg-white border border-stone-200 px-3 py-2 text-xs font-bold rounded-sm hover:bg-stone-50 flex items-center gap-1.5"
            >
              <RotateCw size={12} /> {vista === 'frente' ? 'VER ESPALDA' : 'VER FRENTE'}
            </button>
            <button
              onClick={() => setCarritoAbierto(true)}
              className="bg-white border border-stone-200 px-3 py-2 text-xs font-bold rounded-sm hover:bg-stone-50 flex items-center gap-1.5 relative"
            >
              <ShoppingBag size={12} />
              {items.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-stone-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="w-[300px] sm:w-[340px] h-[350px] sm:h-[400px] mt-16">
          <Prenda
            prenda={prenda}
            vista={vista}
            colorHex={colorTela.hex}
            estampado={estampado}
            zona={zona}
            escala={escala}
            mostrarZonas
            onZona={setZona}
            idGradiente="editor"
          />
        </div>

        <div className="mt-2 text-[11px] text-stone-500 text-center px-4">
          {estampado
            ? `Tocá otro recuadro para mover el dibujo · ${vista === 'frente' ? 'vista de frente' : 'vista de espalda'}`
            : 'Subí un dibujo y elegí dónde va'}
        </div>
      </div>

      {/* ── Panel ──────────────────────────────────── */}
      <div className="lg:col-span-5 bg-white border-l border-stone-200 overflow-y-auto p-5 sm:p-6 space-y-6">
        {productos.length > 1 && (
          <FormField label="¿Qué prenda?">
            <select
              value={producto.id}
              onChange={(e) => {
                setProducto(productos.find((p) => p.id === e.target.value));
                setVista('frente');
              }}
              className={inputClass}
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — {bs(p.precioVenta)}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <div>
          <div className="text-[11px] font-bold tracking-[0.15em] uppercase text-stone-500 mb-2">
            Color de la tela
          </div>
          <div className="grid grid-cols-5 gap-2">
            {COLORES_TELA.map((c) => (
              <button
                key={c.nombre}
                onClick={() => setColorTela(c)}
                title={c.nombre}
                className={`h-11 rounded-sm border-2 transition-all ${
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

        {/* Dibujo */}
        <div>
          <div className="text-[11px] font-bold tracking-[0.15em] uppercase text-stone-500 mb-2">
            Tu dibujo o logo
          </div>

          <input ref={inputRef} type="file" accept="image/*" onChange={subirImagen} className="hidden" />

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
              {subiendo ? <Loader2 size={22} className="animate-spin" /> : <Upload size={22} />}
              <span className="text-sm font-bold">
                {subiendo ? 'Preparando la imagen...' : 'Subí tu dibujo'}
              </span>
              <span className="text-[11px]">JPG o PNG · se achica sola</span>
            </button>
          ) : (
            <div className="border border-stone-200 rounded-sm p-3 space-y-4">
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

              {/* Zonas de estampado de esta prenda */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  ¿Dónde lo ponemos?
                </label>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {zonasDeVista.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => setZona(z)}
                      className={`py-2 px-2 rounded-sm border-2 text-xs font-bold ${
                        zona?.id === z.id
                          ? 'bg-orange-50 border-orange-500 text-orange-800'
                          : 'border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      {z.nombre}
                    </button>
                  ))}
                </div>
                {prenda.zonas.some((z) => z.vista !== 'ambas' && z.vista !== vista) && (
                  <p className="text-[11px] text-stone-500 mt-1.5">
                    Hay más lugares del otro lado — tocá "ver{' '}
                    {vista === 'frente' ? 'espalda' : 'frente'}".
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] text-stone-500">Tamaño del dibujo</label>
                <input
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.05"
                  value={escala}
                  onChange={(e) => setEscala(Number(e.target.value))}
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
          {estampado && zona && (
            <div className="text-[11px] text-stone-500 mt-2">
              Estampado en {zona.nombre.toLowerCase()}, {vista === 'frente' ? 'adelante' : 'atrás'}
            </div>
          )}
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
