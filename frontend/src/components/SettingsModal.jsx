/**
 * =============================================================================
 * PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
 * Componente: Modal de Configuración y Ajustes de Accesibilidad
 * =============================================================================
 * Permite al usuario o evaluador ajustar el Dwell Time, el período de enfriamiento
 * y el sonido para adaptar la experiencia a cada nivel de control motor.
 * =============================================================================
 */

import React, { useState } from 'react';
import { X, Volume2, VolumeX, Sliders, Check, RefreshCw, Smartphone, Camera } from 'lucide-react';

export function SettingsModal({
  abierto,
  alCerrar,
  dwellTimeMs,
  alCambiarDwellTime,
  sonidoHabilitado,
  alCambiarSonido,
  cooldownMs,
  alCambiarCooldown,
  fuenteCamaraInicial = '0'
}) {
  if (!abierto) return null;

  const [fuenteCamara, setFuenteCamara] = useState(String(fuenteCamaraInicial));
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);

  const guardarConfiguracion = async () => {
    setGuardando(true);
    try {
      await fetch('http://localhost:8000/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interaction: {
            dwell_time_ms: Number(dwellTimeMs),
            cooldown_ms: Number(cooldownMs)
          },
          camera: {
            source: fuenteCamara.trim()
          }
        })
      });
      setMensajeExito(true);
      setTimeout(() => setMensajeExito(false), 2000);
    } catch (e) {
      console.error('Error al guardar configuración:', e);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Parámetros de Interacción (HCI)</h2>
          </div>
          <button
            onClick={alCerrar}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido de configuración */}
        <div className="space-y-6 py-5">
          
          {/* 1. Control de Dwell Time (Filtro Anti Midas-Touch) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-200">
                Tiempo de Permanencia (Dwell Time)
              </label>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                {dwellTimeMs} ms
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tiempo que el usuario debe mantener la mano o bloque quieto para confirmar la tecla (evita toques accidentales).
            </p>
            <input
              type="range"
              min="300"
              max="2000"
              step="50"
              value={dwellTimeMs}
              onChange={(e) => alCambiarDwellTime(Number(e.target.value))}
              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>300 ms (Rápido)</span>
              <span>800 ms (Estándar)</span>
              <span>2000 ms (Espástico)</span>
            </div>
          </div>

          {/* 2. Control de Cooldown (Anti-Rebote) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-200">
                Tiempo de Enfriamiento (Cooldown)
              </label>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300">
                {cooldownMs} ms
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pausa tras activar la tecla para evitar pulsaciones múltiples indeseadas.
            </p>
            <input
              type="range"
              min="200"
              max="1200"
              step="50"
              value={cooldownMs}
              onChange={(e) => alCambiarCooldown(Number(e.target.value))}
              className="w-full accent-emerald-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* 3. Selección de Cámara (Webcam, DroidCam o Celular por Wi-Fi) */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-cyan-400" />
              <label className="text-sm font-semibold text-slate-200">
                Fuente de Cámara (Webcam o Celular)
              </label>
            </div>
            <p className="text-xs text-slate-400">
              Escribe el <strong>índice</strong> (0 para webcam integrada, 1 o 2 para DroidCam/Iriun USB) o la <strong>URL</strong> de la app IP Webcam.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={fuenteCamara}
                onChange={(e) => setFuenteCamara(e.target.value)}
                placeholder="0 o http://192.168.1.XX:8080/video"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="flex gap-2 text-[10px] text-slate-400">
              <button
                type="button"
                onClick={() => setFuenteCamara('0')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Webcam (0)
              </button>
              <button
                type="button"
                onClick={() => setFuenteCamara('1')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                DroidCam/USB (1)
              </button>
              <button
                type="button"
                onClick={() => setFuenteCamara('http://192.168.1.50:8080/video')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                IP Webcam URL
              </button>
            </div>
          </div>

          {/* 4. Interruptor de Efectos de Sonido */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-3">
              {sonidoHabilitado ? (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <div className="text-sm font-semibold text-slate-200">Retroalimentación Auditiva</div>
                <div className="text-xs text-slate-400">Sonido de progreso y campana de confirmación</div>
              </div>
            </div>
            <button
              onClick={() => alCambiarSonido(!sonidoHabilitado)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                sonidoHabilitado
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {sonidoHabilitado ? 'Activado' : 'Silenciado'}
            </button>
          </div>

          {/* 5. Instrucción de Calibración */}
          <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200">
            <span className="font-bold">¿Deseas recalibrar la perspectiva de la mesa?</span>
            <p className="text-slate-400 mt-1">
              Ejecuta en tu terminal: <code className="px-1.5 py-0.5 bg-slate-800 text-cyan-300 rounded font-mono">python backend/calibration.py</code> y marca las 4 esquinas de tu mesa física.
            </p>
          </div>

        </div>

        {/* Pie del Modal: Botón Guardar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {mensajeExito && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <Check className="w-4 h-4" /> Configuración guardada en backend
            </span>
          )}
          {!mensajeExito && <div />}

          <div className="flex gap-2">
            <button
              onClick={alCerrar}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cerrar
            </button>
            <button
              onClick={guardarConfiguracion}
              disabled={guardando}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition flex items-center gap-1.5"
            >
              {guardando ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Guardar Cambios
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
