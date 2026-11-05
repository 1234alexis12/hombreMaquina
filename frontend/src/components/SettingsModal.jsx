/**
 * =============================================================================
 * PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
 * Componente: Modal de Configuración y Ajustes de Accesibilidad (HCI)
 * =============================================================================
 * Permite al usuario o evaluador clínico/ergonómico ajustar el Dwell Time, el
 * período de enfriamiento anti-rebote, la fuente de captura y los parámetros de audio.
 * =============================================================================
 */

import React, { useState } from 'react';
import { 
  X, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Check, 
  RefreshCw, 
  Smartphone, 
  Camera, 
  Clock, 
  ShieldCheck, 
  Compass,
  Sparkles
} from 'lucide-react';

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
      setTimeout(() => setMensajeExito(false), 2200);
    } catch (e) {
      console.error('Error al guardar configuración:', e);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl space-y-6">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Ajustes de Interacción y Accesibilidad (HCI)
              </h2>
              <p className="text-xs text-slate-400">
                Parámetros temporales y hardware adaptables al perfil motor del usuario
              </p>
            </div>
          </div>
          <button
            onClick={alCerrar}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido de configuración */}
        <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
          
          {/* 1. Control de Dwell Time (Filtro Anti Midas-Touch) */}
          <div className="space-y-2.5 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Tiempo de Permanencia (Dwell Time)</span>
              </label>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm">
                {dwellTimeMs} ms
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Intervalo continuo de contacto requerido para validar la intencionalidad (filtro anti-toque accidental según Jacob, 1990).
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
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>300 ms (Alta agilidad)</span>
              <span>800 ms (Estándar recomendado)</span>
              <span>2000 ms (Temblor severo)</span>
            </div>
          </div>

          {/* 2. Control de Cooldown (Anti-Rebote) */}
          <div className="space-y-2.5 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Tiempo de Enfriamiento (Anti-Rebote)</span>
              </label>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow-sm">
                {cooldownMs} ms
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Período de bloqueo temporal posterior a la activación para impedir que espasmos involuntarios generen dobles pulsaciones.
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

          {/* 3. Selección de Fuente de Cámara (Webcam, DroidCam o Wi-Fi) */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-400" />
              <label className="text-sm font-bold text-white">
                Fuente de Captura Cenital
              </label>
            </div>
            <p className="text-xs text-slate-400">
              Escribe el <strong>índice de dispositivo</strong> (0 para webcam integrada, 1 o 2 para DroidCam/Iriun USB) o la <strong>URL directa</strong> de la app IP Webcam.
            </p>
            <input
              type="text"
              value={fuenteCamara}
              onChange={(e) => setFuenteCamara(e.target.value)}
              placeholder="Ej: 0 o http://192.168.1.50:8080/video"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
            />
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
              <button
                type="button"
                onClick={() => setFuenteCamara('0')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                Laptop Integrada (0)
              </button>
              <button
                type="button"
                onClick={() => setFuenteCamara('1')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                OBS / Virtual (1)
              </button>
              <button
                type="button"
                onClick={() => setFuenteCamara('2')}
                className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 font-bold"
              >
                Cámara USB Externa (2)
              </button>
              <button
                type="button"
                onClick={() => setFuenteCamara('http://192.168.1.50:8080/video')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                IP Webcam Wi-Fi
              </button>
            </div>
          </div>

          {/* 4. Interruptor de Retroalimentación Auditiva */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
            <div className="flex items-center gap-3">
              <span className={`p-2 rounded-xl ${sonidoHabilitado ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                {sonidoHabilitado ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </span>
              <div>
                <div className="text-sm font-bold text-white">Retroalimentación Auditiva Multimodal</div>
                <div className="text-xs text-slate-400">Tics de carga a frecuencia creciente (350-650 Hz) y acorde armónico</div>
              </div>
            </div>
            <button
              onClick={() => alCambiarSonido(!sonidoHabilitado)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                sonidoHabilitado
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {sonidoHabilitado ? 'Habilitado' : 'Silenciado'}
            </button>
          </div>

          {/* 5. Calibración de Mesa */}
          <div className="p-4 rounded-2xl bg-cyan-950/25 border border-cyan-800/40 text-xs text-cyan-200 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-cyan-300">
              <Compass className="w-4 h-4" />
              ¿Necesitas recalibrar la perspectiva ortogonal de la mesa?
            </span>
            <p className="text-slate-400 leading-relaxed">
              Ejecuta en una terminal: <code className="px-2 py-0.5 bg-slate-900 text-cyan-300 rounded font-mono border border-slate-800">python backend/calibration.py</code> y marca con 4 clics las esquinas de tu mesa física.
            </p>
          </div>

        </div>

        {/* Pie del Modal: Botón Guardar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {mensajeExito ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold animate-pulse">
              <Check className="w-4 h-4" /> Configuración persistida con éxito en el backend
            </span>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              onClick={alCerrar}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cerrar
            </button>
            <button
              onClick={guardarConfiguracion}
              disabled={guardando}
              className="px-5 py-2 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition flex items-center gap-1.5 shadow-lg shadow-cyan-500/25"
            >
              {guardando ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Guardar Parámetros
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
