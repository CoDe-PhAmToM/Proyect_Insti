// ============================================================
// VISTAS: Catálogo + Personalizador v2.0
// ============================================================

import React, { useState, useRef } from 'react';
import { Upload, RotateCw, Maximize2, ShoppingBag, Check } from 'lucide-react';
import { CATALOGO, COLORES_TELA, TALLAS_MEDIDAS } from '../data/mockData';
import { useCart } from '../context/CartContext';
import { CartModal } from '../components/CartModal';

// ── Catálogo público ─────────────────────────────────────────
export const Catalogo = ({ setVista }) => {
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const categorias = ['Todos', ...new Set(CATALOGO.map(p => p.categoria))];

  const productosFiltrados = categoriaActiva === 'Todos'
    ? CATALOGO
    : CATALOGO.filter(p => p.categoria === categoriaActiva);

  return (
    <div className="p-8">
      {/* Filtros */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-1">Vista pública</div>
          <h2 className="text-3xl font-black tracking-tight">Catálogo de productos</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          {categorias.map((c, i) => (
            <button
              key={i}
              onClick={() => setCategoriaActiva(c)}
              className={`px-4 py-2 text-xs font-bold rounded-sm transition-colors ${
                categoriaActiva === c
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de productos */}
      <div className="grid grid-cols-3 gap-6">
        {productosFiltrados.map(p => (
          <div
            key={p.id}
            className="group cursor-pointer"
            onClick={() => setVista('personalizar')}
          >
            {/* Imagen mock */}
            <div className="bg-stone-100 aspect-[3/4] flex flex-col items-center justify-center text-8xl relative overflow-hidden rounded-sm hover:bg-stone-200 transition-colors">
              <span>{p.emoji}</span>
              <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/10 transition-all" />
              <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-200">
                <button className="w-full bg-orange-500 text-stone-950 py-2.5 font-black text-xs rounded-sm">
                  PERSONALIZAR →
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="mt-3">
              <div className="text-[10px] tracking-wider uppercase text-stone-500 mb-0.5">{p.categoria}</div>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black text-stone-900">{p.nombre}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{p.descripcion}</div>
                </div>
                <div className="font-black text-lg text-stone-900 shrink-0 ml-2">Bs. {p.precio}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Personalizador ───────────────────────────────────────────
export const Personalizador = () => {
  const [colorTela,    setColorTela]    = useState(COLORES_TELA[0]);
  const [talla,        setTalla]        = useState('M');
  const [estampado,    setEstampado]    = useState(null);
  const [estampadoPos, setEstampadoPos] = useState({ x: 50, y: 45, scale: 1, rotation: 0 });
  const [arrastrando,  setArrastrando]  = useState(false);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [confirmacionVisible, setConfirmacionVisible] = useState(false);
  const fileInputRef = useRef(null);
  const canvasRef    = useRef(null);
  const { items, agregarItem } = useCart();

  const medidas = TALLAS_MEDIDAS[talla];
  const precioBase = 65;
  const precioTotal = precioBase + (estampado ? 15 : 0);

  const handleUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setEstampado(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleMouseMove = e => {
    if (!arrastrando || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    setEstampadoPos(p => ({
      ...p,
      x: Math.max(20, Math.min(80, x)),
      y: Math.max(25, Math.min(72, y)),
    }));
  };

  const handleAgregarCarrito = () => {
    agregarItem({
      producto: 'Polera Clásica Urbana',
      color: colorTela.nombre,
      colorHex: colorTela.hex,
      talla,
      tieneEstampado: !!estampado,
      estampado,
      precio: precioTotal,
    });
    setConfirmacionVisible(true);
    setTimeout(() => setConfirmacionVisible(false), 2200);
  };

  return (
    <div
      className="grid grid-cols-12 h-[calc(100vh-0px)] overflow-hidden"
      onMouseUp={() => setArrastrando(false)}
      onMouseLeave={() => setArrastrando(false)}
      onMouseMove={handleMouseMove}
    >

      {/* ── Canvas ──────────────────────────────────── */}
      <div className="col-span-7 bg-stone-100 relative flex flex-col items-center justify-center overflow-hidden">

        {/* Header del canvas */}
        <div className="absolute top-0 left-0 right-0 px-6 py-4 flex justify-between items-center bg-stone-100/80 backdrop-blur-sm z-10 border-b border-stone-200">
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500">Editor 2D</div>
            <h2 className="text-lg font-black tracking-tight">Polera Clásica Urbana</h2>
          </div>
          <div className="flex gap-2">
            <button className="bg-white border border-stone-200 px-3 py-1.5 text-xs font-bold rounded-sm hover:bg-stone-50 flex items-center gap-1">
              <RotateCw size={11} /> ROTAR VISTA
            </button>
            <button className="bg-white border border-stone-200 px-3 py-1.5 text-xs font-bold rounded-sm hover:bg-stone-50 flex items-center gap-1">
              <Maximize2 size={11} /> AMPLIAR
            </button>
            <button
              onClick={() => setCarritoAbierto(true)}
              className="bg-white border border-stone-200 px-3 py-1.5 text-xs font-bold rounded-sm hover:bg-stone-50 flex items-center gap-1.5 relative"
            >
              <ShoppingBag size={12} /> CARRITO
              {items.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-stone-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Polera SVG */}
        <div ref={canvasRef} className="relative w-[400px] h-[480px] mt-14">
          <svg viewBox="0 0 400 460" className="w-full h-full drop-shadow-2xl" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))' }}>
            {/* Cuerpo */}
            <path
              d="M 100 80 L 60 100 L 30 180 L 70 200 L 80 190 L 80 420 L 320 420 L 320 190 L 330 200 L 370 180 L 340 100 L 300 80 L 260 70 Q 230 110 200 110 Q 170 110 140 70 Z"
              fill={colorTela.hex}
              stroke={colorTela.hex === '#f5f5f0' || colorTela.hex === '#e8dcc4' ? '#c0bdb6' : '#00000020'}
              strokeWidth="1.5"
            />
            {/* Cuello */}
            <path
              d="M 140 70 Q 170 110 200 110 Q 230 110 260 70 Q 230 93 200 93 Q 170 93 140 70 Z"
              fill={colorTela.hex}
              stroke="#00000030"
              strokeWidth="1.5"
            />
            {/* Pliegues sutiles */}
            <path d="M 80 200 Q 82 310 82 420" stroke="#00000012" strokeWidth="2" fill="none" />
            <path d="M 318 200 Q 316 310 316 420" stroke="#00000012" strokeWidth="2" fill="none" />
            <path d="M 200 115 Q 200 250 200 415" stroke="#00000008" strokeWidth="1.5" fill="none" />
            {/* Sombra manga izq */}
            <path d="M 62 102 L 72 198 L 80 193 L 74 104 Z" fill="#00000015" />
            {/* Sombra manga der */}
            <path d="M 324 104 L 318 193 L 326 198 L 336 102 Z" fill="#00000015" />
          </svg>

          {/* Estampado superpuesto */}
          {estampado && (
            <img
              src={estampado}
              alt="estampado"
              draggable={false}
              className={`absolute select-none pointer-events-auto ${arrastrando ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{
                left:      `${estampadoPos.x}%`,
                top:       `${estampadoPos.y}%`,
                transform: `translate(-50%, -50%) scale(${estampadoPos.scale}) rotate(${estampadoPos.rotation}deg)`,
                width:     '110px',
                mixBlendMode: ['#f5f5f0','#e8dcc4'].includes(colorTela.hex) ? 'multiply' : 'screen',
              }}
              onMouseDown={() => setArrastrando(true)}
            />
          )}

          {/* Indicadores de medidas */}
          <div className="absolute top-[30%] left-[-8px] bg-white border border-stone-300 px-1.5 py-0.5 text-[9px] font-mono font-black rounded-sm shadow-sm whitespace-nowrap">
            ↔ {medidas.pecho}cm
          </div>
          <div className="absolute bottom-[5%] right-[-8px] bg-white border border-stone-300 px-1.5 py-0.5 text-[9px] font-mono font-black rounded-sm shadow-sm whitespace-nowrap">
            ↕ {medidas.largo}cm
          </div>
        </div>

        {/* Hint */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/90 border border-stone-200 rounded-sm px-4 py-2 text-[11px] text-stone-500 shadow-sm whitespace-nowrap">
          {estampado
            ? '🖱️  Arrastrá el estampado para moverlo sobre la polera'
            : '← Subí tu diseño desde el panel derecho'}
        </div>
      </div>

      {/* ── Panel de controles ───────────────────────────── */}
      <div className="col-span-5 bg-white border-l border-stone-200 flex flex-col overflow-y-auto">

        <div className="p-6 border-b border-stone-100 shrink-0">
          <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-1">Paso a paso</div>
          <h3 className="text-xl font-black tracking-tight">Diseñá tu polera</h3>
        </div>

        {/* 01 · Color */}
        <div className="p-6 border-b border-stone-100">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 font-bold">01 · Color de tela</div>
            <span className="text-xs font-bold bg-stone-100 px-2 py-0.5 rounded-sm">{colorTela.nombre}</span>
          </div>
          <div className="grid grid-cols-8 gap-2">
            {COLORES_TELA.map(c => (
              <button
                key={c.nombre}
                onClick={() => setColorTela(c)}
                title={c.nombre}
                className={`aspect-square rounded-sm border-2 transition-all hover:scale-110 ${
                  colorTela.nombre === c.nombre
                    ? 'border-orange-500 scale-110 shadow-md'
                    : 'border-stone-200'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        {/* 02 · Talla */}
        <div className="p-6 border-b border-stone-100">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 font-bold">02 · Talla</div>
            <span className="text-xs font-bold bg-stone-100 px-2 py-0.5 rounded-sm">Talla {talla}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {Object.keys(TALLAS_MEDIDAS).map(t => (
              <button
                key={t}
                onClick={() => setTalla(t)}
                className={`py-2.5 font-black text-base rounded-sm border-2 transition-all ${
                  talla === t
                    ? 'border-orange-500 bg-orange-500 text-stone-950'
                    : 'border-stone-200 hover:border-stone-400 text-stone-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {/* Medidas dinámicas */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Pecho',   val: medidas.pecho },
              { label: 'Largo',   val: medidas.largo },
              { label: 'Manga',   val: medidas.manga },
              { label: 'Hombro',  val: medidas.hombro },
            ].map(m => (
              <div key={m.label} className="bg-stone-50 px-3 py-2 rounded-sm border border-stone-100">
                <div className="text-[9px] text-stone-500 uppercase tracking-wider mb-0.5">{m.label}</div>
                <div className="font-black text-sm">{m.val} cm</div>
              </div>
            ))}
          </div>
        </div>

        {/* 03 · Estampado */}
        <div className="p-6 border-b border-stone-100">
          <div className="text-[10px] tracking-[0.25em] uppercase text-stone-500 font-bold mb-3">03 · Estampado (opcional)</div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />

          {/* Subida / estado del estampado */}
          {!estampado ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-stone-300 hover:border-orange-400 rounded-sm p-5 transition-colors text-center mb-4"
            >
              <Upload size={20} className="mx-auto mb-2 text-stone-400" />
              <div className="text-sm font-bold mb-0.5">Subí tu diseño o logo</div>
              <div className="text-xs text-stone-400">PNG, JPG o SVG · Máx 5 MB</div>
            </button>
          ) : (
            <div className="bg-stone-50 border border-stone-200 p-3 rounded-sm flex items-center gap-3 mb-4">
              <img src={estampado} alt="" className="w-10 h-10 object-cover rounded-sm bg-white border border-stone-200 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold">Diseño cargado ✓</div>
                <div className="text-[11px] text-stone-500">Arrastralo sobre la polera</div>
              </div>
              <button onClick={() => setEstampado(null)} className="text-[10px] font-black text-red-600 hover:text-red-700 shrink-0">
                QUITAR
              </button>
            </div>
          )}

          {/* Sliders — siempre visibles, deshabilitados sin estampado */}
          <div className={`space-y-4 ${!estampado ? 'opacity-40 pointer-events-none' : ''}`}>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-stone-600 font-medium">Tamaño</span>
                <span className="font-black">{Math.round(estampadoPos.scale * 100)}%</span>
              </div>
              <input
                type="range" min="0.4" max="2.2" step="0.05" value={estampadoPos.scale}
                onChange={e => setEstampadoPos(p => ({ ...p, scale: Number(e.target.value) }))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-stone-600 font-medium">Rotación</span>
                <span className="font-black">{estampadoPos.rotation}°</span>
              </div>
              <input
                type="range" min="-180" max="180" value={estampadoPos.rotation}
                onChange={e => setEstampadoPos(p => ({ ...p, rotation: Number(e.target.value) }))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>
            {!estampado && (
              <p className="text-[10px] text-stone-400 text-center">Subí un diseño para activar estos controles</p>
            )}
          </div>
        </div>

        {/* Resumen y CTA */}
        <div className="p-6 bg-stone-950 text-white mt-auto">
          <div className="text-[10px] tracking-[0.25em] uppercase text-stone-400 mb-3">Resumen del pedido</div>
          <div className="space-y-2 text-xs mb-4">
            <div className="flex justify-between">
              <span className="text-stone-400">Polera base</span>
              <span>Bs. {precioBase}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Estampado personalizado</span>
              <span>{estampado ? 'Bs. 15' : 'Bs. 0 (sin estampado)'}</span>
            </div>
            <div className="flex justify-between text-[11px] text-stone-500">
              <span>Talla {talla} · {colorTela.nombre}</span>
              <span>{estampado ? 'Con diseño' : 'Color sólido'}</span>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-3 mb-4 flex justify-between items-end">
            <span className="text-xs text-stone-400 uppercase tracking-wider">Total</span>
            <span className="text-3xl font-black text-orange-400">Bs. {precioTotal}</span>
          </div>
          <button
            onClick={handleAgregarCarrito}
            className="w-full bg-orange-500 text-stone-950 py-3 font-black text-xs rounded-sm hover:bg-orange-400 tracking-widest relative"
          >
            {confirmacionVisible ? (
              <span className="flex items-center justify-center gap-2">
                <Check size={14} /> AGREGADO AL CARRITO
              </span>
            ) : (
              'AGREGAR AL CARRITO →'
            )}
          </button>
          {confirmacionVisible && (
            <button
              onClick={() => setCarritoAbierto(true)}
              className="w-full mt-2 text-center text-[11px] text-stone-400 hover:text-orange-400 underline"
            >
              Ver carrito ({items.length})
            </button>
          )}
        </div>
      </div>

      <CartModal open={carritoAbierto} onClose={() => setCarritoAbierto(false)} />
    </div>
  );
};
