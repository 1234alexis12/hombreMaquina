/**
 * =============================================================================
 * PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
 * Hook de Efectos de Sonido con Web Audio API Nativa
 * =============================================================================
 * Sintetiza tonos de retroalimentación auditiva directamente en el navegador
 * sin depender de archivos de audio externos (baja latencia y cero dependencias).
 * =============================================================================
 */

import { useRef, useCallback, useState } from 'react';

export function useSoundEffects() {
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);
  const audioCtxRef = useRef(null);
  const ultimoTickRef = useRef(0);

  // Inicializa o reanuda el contexto de audio del navegador al primer uso
  const obtenerAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  /**
   * Genera un "tick" sutil de carga a frecuencia creciente mientras el usuario
   * mantiene la mano o bloque dentro de la zona (Feedforward continuo).
   */
  const reproducirProgresoDwell = useCallback((progreso) => {
    if (!sonidoHabilitado || progreso <= 0 || progreso >= 1) return;

    const ahora = Date.now();
    // Limitar la cadencia de tics a 1 cada 100 ms para no saturar
    if (ahora - ultimoTickRef.current < 120) return;
    ultimoTickRef.current = ahora;

    const ctx = obtenerAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Frecuencia dinámica: sube de 350 Hz a 650 Hz según el progreso (0% a 100%)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350 + (progreso * 300), ctx.currentTime);

      // Volumen muy bajo y envolvente ultra rápida (percusiva)
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // Ignorar restricciones de autoplay si aún no hubo interacción
    }
  }, [sonidoHabilitado, obtenerAudioContext]);

  /**
   * Genera un acorde brillante de confirmación (Chime) cuando la tecla
   * completa su Dwell Time y es efectivamente disparada en el SO.
   */
  const reproducirConfirmacionDisparo = useCallback(() => {
    if (!sonidoHabilitado) return;

    const ctx = obtenerAudioContext();
    if (!ctx) return;

    try {
      const ahora = ctx.currentTime;
      // Frecuencias para un acorde armónico claro y agradable (C5 y G5)
      const frecuencias = [523.25, 783.99];

      frecuencias.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle'; // Tono suave tipo campana
        osc.frequency.setValueAtTime(freq, ahora + (idx * 0.04));

        gain.gain.setValueAtTime(0.15, ahora + (idx * 0.04));
        gain.gain.exponentialRampToValueAtTime(0.001, ahora + (idx * 0.04) + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ahora + (idx * 0.04));
        osc.stop(ahora + (idx * 0.04) + 0.35);
      });
    } catch (e) {
      console.warn("AudioContext error:", e);
    }
  }, [sonidoHabilitado, obtenerAudioContext]);

  return {
    sonidoHabilitado,
    setSonidoHabilitado,
    reproducirProgresoDwell,
    reproducirConfirmacionDisparo
  };
}
