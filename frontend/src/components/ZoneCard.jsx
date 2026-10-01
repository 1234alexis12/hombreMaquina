/**
 * =============================================================================
 * PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
 * Componente: Tarjeta de Zona / Tecla Virtual Interactiva
 * =============================================================================
 * Muestra el estado en tiempo real de cada área de la mesa, con un indicador
 * circular de carga de Dwell Time de alto contraste y retroalimentación visual.
 * =============================================================================
 */

import React, { useEffect, useState } from 'react';
import { Hand, Box, CheckCircle2, Clock, Zap } from 'lucide-react';

export function ZoneCard({ zone, onSoundProgress, onSoundTrigger }) {
  const { id, name, label, key, state, progress, source, color } = zone;
  const [animandoDisparo, setAnimandoDisparo] = useState(false);

  // Reproducir efectos auditivos según el cambio de estado y progreso
  useEffect(() => {
    if (state === 'CHARGING') {
      onSoundProgress?.(progress);
    } else if (state === 'TRIGGERED') {
      onSoundTrigger?.();
      setAnimandoDisparo(true);
      const timer = setTimeout(() => setAnimandoDisparo(false), 500);
      return () => clearTimeout(timer);
    }
  }, [state, progress, onSoundProgress, onSoundTrigger]);

  // Dimensiones del círculo de progreso SVG
  const radio = 48;
  const circunferencia = 2 * Math.PI * radio;
  const offsetProgreso = circunferencia - (progress * circunferencia);

  // Determinar clases de estilo y color según el estado
  const obtenerEstiloEstado = () => {
    switch (state) {
      case 'CHARGING':
        return {
          borde: 'border-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.35)]',
          textoEstado: 'text-amber-300 font-semibold',
          fondoBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          textoEtiqueta: 'text-amber-100',
          colorProgreso: '#fbbf24'
        };
      case 'TRIGGERED':
        return {
          borde: 'border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.6)] bg-emerald-950/40',
          textoEstado: 'text-emerald-300 font-bold',
          fondoBadge: 'bg-emerald-500/30 text-emerald-200 border-emerald-400',
          textoEtiqueta: 'text-emerald-300',
          colorProgreso: '#34d399'
        };
      case 'COOLDOWN':
        return {
          borde: 'border-slate-600/50 bg-slate-900/60',
          textoEstado: 'text-slate-400',
          fondoBadge: 'bg-slate-700/30 text-slate-400 border-slate-600/40',
          textoEtiqueta: 'text-slate-300',
          colorProgreso: '#64748b'
        };
      default: // IDLE
        return {
          borde: 'border-slate-800 bg-slate-900/40 hover:border-slate-700',
          textoEstado: 'text-slate-500',
          fondoBadge: 'bg-slate-800/50 text-slate-500 border-slate-700/50',
          textoEtiqueta: 'text-slate-200',
          colorProgreso: color || '#38bdf8'
        };
    }
  };

  const estilo = obtenerEstiloEstado();

  return (
    <div
      className={`relative flex flex-col items-center justify-between p-6 rounded-3xl border-2 transition-all duration-150 backdrop-blur-sm ${estilo.borde} ${
        animandoDisparo ? 'animate-trigger ring-4 ring-emerald-400' : ''
      }`}
      style={{ minHeight: '320px' }}
    >
      {/* Encabezado: Nombre de la zona y tipo de sensor */}
      <div className="w-full flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
          Zona {id}: {name}
        </span>
        <div className="flex items-center gap-1.5">
          {source === 'ARUCO' ? (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
              <Box className="w-3.5 h-3.5" /> Bloque ArUco
            </span>
          ) : source === 'MANO' ? (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-orange-950/60 border border-orange-500/40 text-orange-300">
              <Hand className="w-3.5 h-3.5" /> Mano / Puño
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-500">
              En Espera
            </span>
          )}
        </div>
      </div>

      {/* Indicador Circular Central de Dwell Time y Etiqueta de la Tecla */}
      <div className="relative flex items-center justify-center my-4">
        <svg className="w-40 h-40 transform -rotate-90">
          {/* Círculo de fondo tenue */}
          <circle
            cx="80"
            cy="80"
            r={radio}
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-800"
            fill="transparent"
          />
          {/* Círculo dinámico de progreso de Dwell */}
          <circle
            cx="80"
            cy="80"
            r={radio}
            stroke={estilo.colorProgreso}
            strokeWidth="8"
            strokeDasharray={circunferencia}
            strokeDashoffset={offsetProgreso}
            strokeLinecap="round"
            className="transition-all duration-75 ease-out"
            fill="transparent"
          />
        </svg>

        {/* Letra / Nombre de la tecla en el centro */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`text-4xl font-black tracking-tight ${estilo.textoEtiqueta}`}>
            {label}
          </span>
          <span className="text-[11px] font-mono text-slate-400 mt-1 uppercase">
            [Tecla: {key}]
          </span>
        </div>
      </div>

      {/* Pie de tarjeta: Estado actual y porcentaje */}
      <div className="w-full flex items-center justify-between pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          {state === 'CHARGING' && <Clock className="w-4 h-4 text-amber-400 animate-spin" />}
          {state === 'TRIGGERED' && <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />}
          {state === 'COOLDOWN' && <Clock className="w-4 h-4 text-slate-500" />}
          {state === 'IDLE' && <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />}
          
          <span className={`text-xs uppercase tracking-wide ${estilo.textoEstado}`}>
            {state === 'CHARGING' && `Confirmando (${Math.round(progress * 100)}%)`}
            {state === 'TRIGGERED' && '¡ACTIVADA!'}
            {state === 'COOLDOWN' && 'Enfriamiento...'}
            {state === 'IDLE' && 'Listo para tocar'}
          </span>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono text-slate-400">
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
