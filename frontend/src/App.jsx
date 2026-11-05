/**
 * =============================================================================
 * PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
 * Componente Principal: App.jsx
 * =============================================================================
 * Arquitectura de Dashboard Cockpit para IHM / HCI.
 * Organiza ergonómicamente el escenario de macro-zonas táctiles, el monitor de
 * visión cenital con homografía y la telemetría en tiempo real.
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useSoundEffects } from './hooks/useSoundEffects';
import { ZoneCard } from './components/ZoneCard';
import { SettingsModal } from './components/SettingsModal';
import { UsabilityTest } from './components/UsabilityTest';
import { 
  Sliders, 
  Camera, 
  EyeOff, 
  Eye,
  Wifi, 
  WifiOff, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  Activity,
  ShieldCheck,
  Radio,
  Layers,
  Sparkles,
  Clock,
  Zap,
  Info,
  RefreshCw,
  Box,
  Hand
} from 'lucide-react';

export default function App() {
  // 1. Hooks de comunicación WebSocket y Audio Nativo
  const { conectado, telemetria, enviarMensaje } = useWebSocket('ws://localhost:8000/ws');
  const { 
    sonidoHabilitado, 
    setSonidoHabilitado, 
    reproducirProgresoDwell, 
    reproducirConfirmacionDisparo 
  } = useSoundEffects();

  // 2. Estados locales
  const [modalConfigAbierto, setModalConfigAbierto] = useState(false);
  const [mostrarCamara, setMostrarCamara] = useState(true);
  const [pestañaActiva, setPestañaActiva] = useState('interfaz'); // 'interfaz' | 'experimento'
  const [dwellTimeMs, setDwellTimeMs] = useState(800);
  const [cooldownMs, setCooldownMs] = useState(400);
  const [fuenteCamara, setFuenteCamara] = useState('0');
  const [historialDisparos, setHistorialDisparos] = useState([]);

  // Cargar configuración inicial desde el backend
  useEffect(() => {
    fetch('http://localhost:8000/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.camera) {
          const src = data.camera.source !== undefined ? data.camera.source : (data.camera.index ?? '0');
          setFuenteCamara(String(src));
        }
        if (data.interaction) {
          if (data.interaction.dwell_time_ms) setDwellTimeMs(data.interaction.dwell_time_ms);
          if (data.interaction.cooldown_ms) setCooldownMs(data.interaction.cooldown_ms);
        }
      })
      .catch(err => console.warn('Backend iniciando...', err));
  }, []);

  // Registrar disparos en el feed de auditoría en vivo
  useEffect(() => {
    if (telemetria?.last_trigger) {
      const nuevoEvento = {
        id: Date.now(),
        key: telemetria.last_trigger.key,
        timestamp: new Date().toLocaleTimeString(),
        source: telemetria.zones?.find(z => z.key === telemetria.last_trigger.key)?.source || 'SENSOR'
      };
      setHistorialDisparos(prev => [nuevoEvento, ...prev.slice(0, 4)]);
    }
  }, [telemetria?.last_trigger]);

  // Sincronizar cambio de Dwell Time hacia el backend vía WebSocket
  const manejarCambioDwell = (nuevoValor) => {
    setDwellTimeMs(nuevoValor);
    enviarMensaje({ type: 'set_dwell_time', value: nuevoValor });
  };

  const zonas = telemetria?.zones || [];
  const elementos = telemetria?.active_elements || { arucos_count: 0, hands_count: 0 };
  const fpsActual = telemetria?.fps || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
      
      {/* =====================================================================
          HEADER PRINCIPAL (ESTILO COCKPIT DE ALTO RENDIMIENTO)
         ===================================================================== */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Bloque de Identidad de Marca */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/40">
              <Keyboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  TUI-A
                  <span className="text-cyan-400 font-mono text-xs font-semibold">v1.2</span>
                </h1>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                  HCI Accesible
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Superficie Aumentada de Bajo Costo • Reducción Motora Distal
              </p>
            </div>
          </div>

          {/* Selector Central de Pestañas (Segmented Switcher) */}
          <nav className="flex items-center p-1 rounded-2xl bg-slate-950 border border-slate-800/90 shadow-inner">
            <button
              onClick={() => setPestañaActiva('interfaz')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                pestañaActiva === 'interfaz'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Superficie de Control</span>
            </button>
            <button
              onClick={() => setPestañaActiva('experimento')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                pestañaActiva === 'experimento'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Protocolo de Usabilidad (HCI)</span>
            </button>
          </nav>

          {/* Controles de Estado y Herramientas Rápidas */}
          <div className="flex items-center gap-2.5">
            
            {/* Estado WebSocket & FPS */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              conectado 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              {conectado ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>En Línea</span>
                  <span className="font-mono text-[11px] text-emerald-400/80">({fpsActual} FPS)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 animate-pulse" />
                  <span>Reconectando...</span>
                </>
              )}
            </div>

            {/* Alternar Sonido */}
            <button
              onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
              title={sonidoHabilitado ? 'Silenciar Retroalimentación Auditiva' : 'Activar Retroalimentación Auditiva'}
              className={`p-2 rounded-xl border text-xs font-medium transition ${
                sonidoHabilitado
                  ? 'bg-slate-800/90 border-slate-700 text-emerald-400 hover:bg-slate-700'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {sonidoHabilitado ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Alternar Cámara */}
            <button
              onClick={() => setMostrarCamara(!mostrarCamara)}
              title={mostrarCamara ? 'Ocultar Visión Cenital' : 'Mostrar Visión Cenital'}
              className="p-2 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              {mostrarCamara ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Botón de Configuración Modal */}
            <button
              onClick={() => setModalConfigAbierto(true)}
              className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition flex items-center gap-1.5 text-xs font-black shadow-md shadow-cyan-500/20"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Ajustes</span>
            </button>

          </div>
        </div>
      </header>

      {/* =====================================================================
          CONTENIDO PRINCIPAL (LAYOUT COCKPIT RESPONSIVE)
         ===================================================================== */}
      <main className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 py-5 flex-1">
        
        {/* PESTAÑA 1: VISTA DE LA SUPERFICIE DE INTERACCIÓN */}
        {pestañaActiva === 'interfaz' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ---------------------------------------------------------------
                COLUMNA IZQUIERDA (7/12): ESCENARIO TÁCTIL Y MACRO-ZONAS
               --------------------------------------------------------------- */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Cabecera del Escenario Táctil */}
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Superficie de Interacción Aumentada</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Macro-zonas táctiles calibradas para motricidad gruesa (Ley de Fitts)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Filtro Anti-Midas: {dwellTimeMs}ms
                  </span>
                </div>
              </div>

              {/* Cuadrícula de Macro-Zonas Táctiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {zonas.length > 0 ? (
                  zonas.map((zona) => (
                    <ZoneCard
                      key={zona.id}
                      zone={zona}
                      dwellTargetMs={dwellTimeMs}
                      onSoundProgress={reproducirProgresoDwell}
                      onSoundTrigger={reproducirConfirmacionDisparo}
                    />
                  ))
                ) : (
                  <div className="col-span-2 p-12 text-center rounded-3xl bg-slate-900/40 border border-dashed border-slate-800">
                    <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">
                      Conectando con el motor de visión en <code className="text-cyan-400">http://localhost:8000</code>...
                    </p>
                  </div>
                )}
              </div>

              {/* Barra de Ajuste Rápido de Dwell Time en Vivo */}
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200">
                      Sensibilidad Temporal (Dwell Time en Caliente)
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                    {dwellTimeMs} ms
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="300"
                    max="1800"
                    step="50"
                    value={dwellTimeMs}
                    onChange={(e) => manejarCambioDwell(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Botones de Ajuste Rápido Preestablecidos */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex gap-2">
                    <button
                      onClick={() => manejarCambioDwell(500)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition ${
                        dwellTimeMs === 500
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      500ms (Rápido)
                    </button>
                    <button
                      onClick={() => manejarCambioDwell(800)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition ${
                        dwellTimeMs === 800
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      800ms (Estándar)
                    </button>
                    <button
                      onClick={() => manejarCambioDwell(1200)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition ${
                        dwellTimeMs === 1200
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      1200ms (Accesible)
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-500 hidden sm:inline">
                    Anti-rebote activo: {cooldownMs}ms
                  </span>
                </div>
              </div>

              {/* Registro de Actividad y Auditoría en Vivo */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Feed de Auditoría de Pulsaciones Reales (Windows)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Últimos eventos</span>
                </div>

                {historialDisparos.length > 0 ? (
                  <div className="space-y-1.5">
                    {historialDisparos.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/40 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="font-bold text-white uppercase">[{ev.key}]</span>
                          <span className="text-slate-400">emulada con éxito</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                          <span>{ev.source}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-cyan-300">{ev.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-1">
                    Esperando primer contacto intencional del usuario sobre la mesa...
                  </p>
                )}
              </div>

            </div>

            {/* ---------------------------------------------------------------
                COLUMNA DERECHA (5/12): VISIÓN CENITAL Y TELEMETRÍA
               --------------------------------------------------------------- */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* Tarjeta de Visión Cenital en Vivo */}
              {mostrarCamara ? (
                <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      <Camera className="w-4 h-4 text-cyan-400" />
                      <span>Visión Cenital Ortogonal (Plano Mesa)</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                      800x600 Warped
                    </span>
                  </div>

                  {/* Viewport de video con marco tecnológico de alta precisión */}
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-slate-800 shadow-inner group">
                    <img
                      src="http://localhost:8000/video_feed"
                      alt="Transmisión cenital en vivo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />

                    {/* Retículas ópticas esquineras para dar aspecto de instrumento calibrado */}
                    <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/70 pointer-events-none" />
                    <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/70 pointer-events-none" />
                    <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/70 pointer-events-none" />
                    <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/70 pointer-events-none" />

                    {/* HUD Badge en esquina inferior */}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-slate-300 border border-white/10">
                      Homografía Activa
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 text-center">
                    Cámara corregida mediante homografía de 4 puntos. Puedes recalibrar con <code className="text-cyan-300 font-mono">python backend/calibration.py</code>
                  </p>
                </div>
              ) : (
                <div className="p-8 text-center rounded-3xl bg-slate-900/40 border border-slate-800">
                  <Camera className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Transmisión de cámara oculta para ahorrar recursos.</p>
                  <button
                    onClick={() => setMostrarCamara(true)}
                    className="mt-3 px-3 py-1 rounded-xl text-xs font-bold bg-slate-800 text-cyan-300 hover:bg-slate-700"
                  >
                    Mostrar Cámara
                  </button>
                </div>
              )}

              {/* Panel de Sensores y Diagnóstico de Visión */}
              <div className="p-4 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <span>Detecciones y Sensores Activos sobre la Mesa</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Tarjeta ArUco */}
                  <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Box className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Marcadores ArUco</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-cyan-300 font-mono">
                        {elementos.arucos_count}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">DICT_4X4_50</span>
                    </div>
                  </div>

                  {/* Tarjeta Manos */}
                  <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Hand className="w-3.5 h-3.5 text-amber-400" />
                      <span>Manos / Puños</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-amber-300 font-mono">
                        {elementos.hands_count}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">MediaPipe/Piel</span>
                    </div>
                  </div>
                </div>

                {/* Resumen del Pipeline Tecnológico */}
                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Inyección OS:</span>
                    <strong className="text-slate-200 font-mono">Pynput Threaded</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Comunicación:</span>
                    <strong className="text-slate-200 font-mono">FastAPI WebSocket (30 FPS)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Audio Feedback:</span>
                    <strong className="text-slate-200 font-mono">Web Audio API Nativa</strong>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* PESTAÑA 2: PROTOCOLO EXPERIMENTAL (SUS / NASA-TLX) */}
        {pestañaActiva === 'experimento' && (
          <div className="max-w-6xl mx-auto">
            <UsabilityTest 
              zones={zonas} 
              lastTrigger={telemetria?.last_trigger} 
            />
          </div>
        )}

      </main>

      {/* =====================================================================
          PIE DE PÁGINA PROFESIONAL
         ===================================================================== */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 px-6 py-3.5 text-center text-xs text-slate-500">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>
            Proyecto TUI-A • Interacción Humano-Computadora (HCI / IHM)
          </span>
          <span className="text-slate-400 font-medium">
            Autores: Bryan Mango Ticllahuanaco & Anthony Luque Guzmán
          </span>
        </div>
      </footer>

      {/* =====================================================================
          MODAL DE CONFIGURACIÓN
         ===================================================================== */}
      <SettingsModal
        abierto={modalConfigAbierto}
        alCerrar={() => setModalConfigAbierto(false)}
        dwellTimeMs={dwellTimeMs}
        alCambiarDwellTime={manejarCambioDwell}
        cooldownMs={cooldownMs}
        alCambiarCooldown={setCooldownMs}
        sonidoHabilitado={sonidoHabilitado}
        alCambiarSonido={setSonidoHabilitado}
        fuenteCamaraInicial={fuenteCamara}
      />

    </div>
  );
}
