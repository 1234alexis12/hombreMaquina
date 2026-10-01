/**
 * =============================================================================
 * PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
 * Hook de Comunicación WebSocket en Tiempo Real
 * =============================================================================
 * Establece un canal bidireccional continuo con el backend en Python para recibir
 * las coordenadas de las zonas, el progreso de carga (0-100%) y los disparos.
 * =============================================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url = 'ws://localhost:8000/ws') {
  const [conectado, setConectado] = useState(false);
  const [telemetria, setTelemetria] = useState({
    fps: 0,
    zones: [],
    last_trigger: null,
    active_elements: { arucos_count: 0, hands_count: 0 }
  });

  const wsRef = useRef(null);
  const temporizadorReconexionRef = useRef(null);

  const conectar = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Conexión establecida con el servidor TUI-A');
        setConectado(true);
      };

      ws.onmessage = (evento) => {
        try {
          const datos = JSON.parse(evento.data);
          if (datos.type === 'telemetry') {
            setTelemetria(datos);
          }
        } catch (e) {
          console.error('[WebSocket] Error al deserializar paquete JSON:', e);
        }
      };

      ws.onclose = () => {
        setConectado(false);
        // Intentar reconectar automáticamente cada 2 segundos
        temporizadorReconexionRef.current = setTimeout(() => {
          conectar();
        }, 2000);
      };

      ws.onerror = (err) => {
        console.warn('[WebSocket] Error en socket:', err);
        ws.close();
      };
    } catch (e) {
      console.warn('[WebSocket] No se pudo crear socket:', e);
      temporizadorReconexionRef.current = setTimeout(conectar, 2000);
    }
  }, [url]);

  useEffect(() => {
    conectar();
    return () => {
      if (temporizadorReconexionRef.current) {
        clearTimeout(temporizadorReconexionRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [conectar]);

  const enviarMensaje = useCallback((obj) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
    }
  }, []);

  return { conectado, telemetria, enviarMensaje };
}
