/**
 * =============================================================================
 * PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
 * Componente: Tarjeta de Macro-Zona / Pad Táctil Virtual de Alta Accesibilidad
 * =============================================================================
 * Diseñado bajo principios de HCI (Ley de Fitts e Interfaces Tangibles).
 * Ofrece máxima affordance visual, retroalimentación continua de Dwell Time y
 * confirmación inequívoca de disparo para usuarios con reducción motora.
 * =============================================================================
 */

import React, { useEffect, useState } from 'react';
import { Hand, Box, CheckCircle2, Clock, Zap, Lock, Sparkles } from 'lucide-react';

export function ZoneCard({ zone, onSoundProgress, onSoundTrigger, dwellTargetMs = 800 }) {
  const { id, name, label, key, state, progress, source, color } = zone;
  const [animandoDisparo, setAnimandoDisparo] = useState(false);

  // Reproducir efectos auditivos según el cambio de estado y progreso
  useEffect(() => {
    if (state === 'CHARGING') {
      onSoundProgress?.(progress);
    } else if (state === 'TRIGGERED') {
      onSoundTrigger?.();
      setAnimandoDisparo(true);
      const timer = setTimeout(() => setAnimandoDisparo(false), 550);
      return () => clearTimeout(timer);
    }
  }, [state, progress, onSoundProgress, onSoundTrigger]);

  // Dimensiones del círculo de progreso SVG
  const radio = 52;
  const circunferencia = 2 * Math.PI * radio;
  const offsetProgreso = circunferencia - (Math.min(1, Math.max(0, progress)) * circunferencia);
  const porcentaje = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const milisegundosActuales = Math.round(progress * dwellTargetMs);

  // Paleta temática personalizada por zona
  const esZona1 = id === 1 || String(key).toLowerCase().includes('space');
  const acentoColor = esZona1 ? '#06b6d4' : '#10b981'; // Cyan vs Emerald
  const acentoClaseBorde = esZona1 ? 'group-hover:border-cyan-500/40' : 'group-hover:border-emerald-500/40';

  // Configuración de estilos visuales dinámicos según estado de la máquina
  const obtenerConfigEstado = () => {
    switch (state) {
      case 'CHARGING':
        return {
          contenedor: 'border-amber-400 bg-amber-950/20 shadow-[0_0_40px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/40',
          badgeFondo: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
          textoEstado: 'text-amber-300',
          colorAnillo: '#f59e0b',
          haloFondo: 'from-amber-500/15 via-transparent to-transparent',
          textoDescripcion: `Confirmando (${milisegundosActuales}ms / ${dwellTargetMs}ms)`
        };
      case 'TRIGGERED':
        return {
          contenedor: 'border-emerald-400 bg-emerald-950/40 shadow-[0_0_55px_rgba(52,211,153,0.55)] ring-4 ring-emerald-400/60',
          badgeFondo: 'bg-emerald-500/30 text-emerald-200 border-emerald-400',
          textoEstado: 'text-emerald-300',
          colorAnillo: '#10b981',
          haloFondo: 'from-emerald-500/30 via-transparent to-transparent',
          textoDescripcion: '¡TECLA EMULADA CON ÉXITO!'
        };
      case 'COOLDOWN':
        return {
          contenedor: 'border-slate-700/60 bg-slate-900/70 shadow-none opacity-85',
          badgeFondo: 'bg-slate-800 text-slate-400 border-slate-700',
          textoEstado: 'text-slate-400',
          colorAnillo: '#64748b',
          haloFondo: 'from-slate-700/5 via-transparent to-transparent',
          textoDescripcion: 'Enfriamiento anti-rebote...'
        };
      default: // IDLE
        return {
          contenedor: `border-slate-800/80 bg-slate-900/60 shadow-lg ${acentoClaseBorde}`,
          badgeFondo: 'bg-slate-800/60 text-slate-400 border-slate-700/60',
          textoEstado: 'text-slate-400',
          colorAnillo: acentoColor,
          haloFondo: esZona1 ? 'from-cyan-500/10 via-transparent to-transparent' : 'from-emerald-500/10 via-transparent to-transparent',
          textoDescripcion: 'Superficie lista para contacto'
        };
    }
  };

  const config = obtenerConfigEstado();

  return (
    <div
      className={`relative flex flex-col justify-between p-6 rounded-3xl border-2 transition-all duration-200 backdrop-blur-xl group overflow-hidden ${config.contenedor} ${
        animandoDisparo ? 'animate-trigger' : ''
      }`}
      style={{ minHeight: '340px' }}
    >
      {/* Resplandor ambiental de fondo */}
      <div className={`absolute inset-0 bg-gradient-to-b ${config.haloFondo} pointer-events-none transition-opacity duration-300`} />

      {/* Franja de estado superior: Identificador de zona y sensor activo */}
      <div className="relative z-10 flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: state === 'CHARGING' ? '#f59e0b' : state === 'TRIGGERED' ? '#10b981' : acentoColor }}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {name || `Zona ${id}`}
          </span>
        </div>

        {/* Badge del Estímulo / Sensor Detectado */}
        <div className="flex items-center">
          {source === 'ARUCO' ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-950">
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bloque ArUco #{zone.aruco_id ?? id - 1}</span>
            </span>
          ) : source === 'MANO' ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 border border-amber-500/50 text-amber-300 shadow-sm shadow-amber-950">
              <Hand className="w-3.5 h-3.5 text-amber-400" />
              <span>Palma / Puño</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 border border-slate-700/60 text-slate-400">
              <span>En Reposo</span>
            </span>
          )}
        </div>
      </div>

      {/* Núcleo Central: Indicador Circular SVG de Dwell Time y Tecla */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-2">
        <div className="relative flex items-center justify-center">
          {/* SVG Circular Gauge */}
          <svg className="w-44 h-44 transform -rotate-90 filter drop-shadow-[0_0_12px_rgba(0,0,0,0.5)]">
            {/* Pista de fondo */}
            <circle
              cx="88"
              cy="88"
              r={radio}
              stroke="rgba(30, 41, 59, 0.9)"
              strokeWidth="9"
              fill="transparent"
            />
            {/* Anillo de progreso dinámico */}
            <circle
              cx="88"
              cy="88"
              r={radio}
              stroke={config.colorAnillo}
              strokeWidth="9"
              strokeDasharray={circunferencia}
              strokeDashoffset={offsetProgreso}
              strokeLinecap="round"
              className="transition-all duration-100 ease-out"
              fill="transparent"
              style={{
                filter: state === 'CHARGING' || state === 'TRIGGERED' ? `drop-shadow(0 0 8px ${config.colorAnillo})` : 'none'
              }}
            />
          </svg>

          {/* Contenido Central: Tecla y Porcentaje */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
            {state === 'TRIGGERED' ? (
              <div className="flex flex-col items-center justify-center animate-bounce">
                <Zap className="w-10 h-10 text-emerald-400 fill-emerald-400" />
                <span className="text-xs font-black uppercase text-emerald-300 tracking-wider mt-1">
                  ¡ACTIVADA!
                </span>
              </div>
            ) : (
              <>
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md">
                  {label}
                </span>
                <span className="mt-1 text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700/60">
                  Tecla: {key}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Barra de progreso lineal complementaria en la base del núcleo */}
        <div className="w-full max-w-[220px] mt-3 space-y-1">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${porcentaje}%`,
                backgroundColor: config.colorAnillo,
                boxShadow: `0 0 8px ${config.colorAnillo}`
              }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 px-0.5">
            <span>Dwell</span>
            <span className={state === 'CHARGING' ? 'text-amber-400 font-bold' : 'text-slate-400'}>
              {porcentaje}%
            </span>
          </div>
        </div>
      </div>

      {/* Pie de tarjeta: Estado actual de interacción */}
      <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {state === 'CHARGING' && <Clock className="w-4 h-4 text-amber-400 animate-spin" />}
          {state === 'TRIGGERED' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {state === 'COOLDOWN' && <Lock className="w-4 h-4 text-slate-500" />}
          {state === 'IDLE' && <Sparkles className="w-4 h-4 text-slate-500" />}
          
          <span className={`font-semibold tracking-wide ${config.textoEstado}`}>
            {config.textoDescripcion}
          </span>
        </div>

        <div className="text-[11px] font-mono text-slate-500">
          ID: {id}
        </div>
      </div>
    </div>
  );
}
