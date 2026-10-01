/**
 * =============================================================================
 * PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
 * Componente Principal: App.jsx
 * =============================================================================
 * Vista central de la aplicación. Conecta la telemetría del backend por WebSocket,
 * renderiza las tarjetas de teclas virtuales, el reproductor de video en vivo y
 * el panel de evaluación de usabilidad.
 * =============================================================================
 */

import React, { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useSoundEffects } from './hooks/useSoundEffects';
import { ZoneCard } from './components/ZoneCard';
import { SettingsModal } from './components/SettingsModal';
import { UsabilityTest } from './components/UsabilityTest';
import { 
  Sliders, 
  Camera, 
  EyeOff, 
  Wifi, 
  WifiOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Keyboard, 
  HelpCircle,
  Activity
} from 'lucide-react';

export default function App() {
  // 1. Hooks de estado y comunicación
  const { conectado, telemetria, enviarMensaje } = useWebSocket('ws://localhost:8000/ws');
  const { 
    sonidoHabilitado, 
    setSonidoHabilitado, 
    reproducirProgresoDwell, 
    reproducirConfirmacionDisparo 
  } = useSoundEffects();

  // 2. Estados locales de la interfaz
  const [modalConfigAbierto, setModalConfigAbierto] = useState(false);
  const [mostrarCamara, setMostrarCamara] = useState(true);
  const [pestañaActiva, setPestañaActiva] = useState('interfaz'); // 'interfaz' o 'experimento'
  const [dwellTimeMs, setDwellTimeMs] = useState(800);
  const [cooldownMs, setCooldownMs] = useState(400);
  const [fuenteCamara, setFuenteCamara] = useState('0');

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
      .catch(err => console.warn('Backend aún iniciando...', err));
  }, []);

  // Sincronizar cambio de Dwell Time hacia el backend en tiempo real vía WebSocket
  const manejarCambioDwell = (nuevoValor) => {
    setDwellTimeMs(nuevoValor);
    enviarMensaje({ type: 'set_dwell_time', value: nuevoValor });
  };

  const zonas = telemetria?.zones || [];
  const elementos = telemetria?.active_elements || { arucos_count: 0, hands_count: 0 };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
      
      {/* =====================================================================
          BARRA DE NAVEGACIÓN SUPERIOR (ACCESIBLE Y ELEGANTE)
         ===================================================================== */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Título e Identificación del Proyecto */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Keyboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white">TUI-A</h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                  HCI Accesible
                </span>
              </div>
              <p className="text-xs text-slate-400">Superficie Tangible Aumentada de Bajo Costo</p>
            </div>
          </div>

          {/* Indicadores de Telemetría (FPS, Estado WebSocket, Detecciones) */}
          <div className="flex items-center gap-3">
            
            {/* Estado del WebSocket */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              conectado 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
            }`}>
              {conectado ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 animate-pulse" />}
              <span>{conectado ? 'Conectado (30 FPS)' : 'Reconectando...'}</span>
            </div>

            {/* Contador de elementos físicos sobre la mesa */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 font-mono">
              <span>ArUcos: <strong className="text-cyan-400">{elementos.arucos_count}</strong></span>
              <span className="text-slate-600">|</span>
              <span>Manos: <strong className="text-orange-400">{elementos.hands_count}</strong></span>
            </div>

            {/* Alternar Sonido */}
            <button
              onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
              title={sonidoHabilitado ? 'Silenciar Sonido' : 'Activar Sonido'}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              {sonidoHabilitado ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Alternar Cámara en Vivo */}
            <button
              onClick={() => setMostrarCamara(!mostrarCamara)}
              title={mostrarCamara ? 'Ocultar Cámara' : 'Ver Cámara'}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition flex items-center gap-1.5 text-xs"
            >
              {mostrarCamara ? <EyeOff className="w-4 h-4 text-cyan-400" /> : <Camera className="w-4 h-4 text-slate-400" />}
              <span className="hidden md:inline">{mostrarCamara ? 'Ocultar Cámara' : 'Ver Cámara'}</span>
            </button>

            {/* Botón de Configuración Modal */}
            <button
              onClick={() => setModalConfigAbierto(true)}
              className="p-2 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition flex items-center gap-1.5 text-xs font-bold"
            >
              <Sliders className="w-4 h-4" />
              <span>Ajustes</span>
            </button>

          </div>
        </div>
      </header>

      {/* =====================================================================
          PESTAÑAS DE VISTA: TECLADO INTERACTIVO vs. MODO EXPERIMENTO (HCI)
         ===================================================================== */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-6">
        <div className="flex gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 w-fit">
          <button
            onClick={() => setPestañaActiva('interfaz')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              pestañaActiva === 'interfaz'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Superficie de Interacción
          </button>
          <button
            onClick={() => setPestañaActiva('experimento')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              pestañaActiva === 'experimento'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            Protocolo de Usabilidad (SUS / NASA-TLX)
          </button>
        </div>
      </div>

      {/* =====================================================================
          CUERPO PRINCIPAL
         ===================================================================== */}
      <main className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 space-y-6">

        {/* PESTAÑA 1: VISTA DE LA SUPERFICIE DE INTERACCIÓN */}
        {pestañaActiva === 'interfaz' && (
          <div className="space-y-6">
            
            {/* Cuadrícula de Tarjetas de Teclas Virtuales (Grande, Accesible) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {zonas.length > 0 ? (
                zonas.map((zona) => (
                  <ZoneCard
                    key={zona.id}
                    zone={zona}
                    onSoundProgress={reproducirProgresoDwell}
                    onSoundTrigger={reproducirConfirmacionDisparo}
                  />
                ))
              ) : (
                <div className="col-span-2 p-12 text-center rounded-3xl bg-slate-900/40 border border-dashed border-slate-800">
                  <p className="text-slate-400 text-sm">
                    Esperando datos del backend en <code className="text-cyan-400">http://localhost:8000</code>...
                  </p>
                </div>
              )}
            </div>

            {/* Vista Opcional de la Transmisión de Cámara MJPEG */}
            {mostrarCamara && (
              <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span>Visión Cenital en Vivo (Mesa Aplanada con Detecciones)</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    MJPEG Stream: /video_feed
                  </span>
                </div>
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-[380px] flex items-center justify-center border border-slate-800">
                  <img
                    src="http://localhost:8000/video_feed"
                    alt="Transmisión cenital en vivo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Imagen de respaldo si el backend aún no corre
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

          </div>
        )}

        {/* PESTAÑA 2: MÓDULO EXPERIMENTAL DE EVALUACIÓN DE USABILIDAD */}
        {pestañaActiva === 'experimento' && (
          <UsabilityTest 
            zones={zonas} 
            lastTrigger={telemetria?.last_trigger} 
          />
        )}

      </main>

      {/* =====================================================================
          PIE DE PÁGINA
         ===================================================================== */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500">
        <p>
          Proyecto TUI-A • Interacción Hombre-Máquina • Autores: Bryan Mango Ticllahuanaco & Anthony Luque Guzmán
        </p>
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
