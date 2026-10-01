/**
 * =============================================================================
 * PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
 * Componente: Módulo Experimental de Evaluación de Usabilidad (HCI)
 * =============================================================================
 * Diseñado para la experimentación académica descrita en la propuesta:
 * - Evalúa tiempos de tarea, fallos y precisión.
 * - Compara la Modalidad Mano vs. Modalidad Bloque Tangible.
 * - Exporta los datos empíricos en formato CSV para análisis con SUS y NASA-TLX.
 * =============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Download, CheckCircle, AlertTriangle, Activity } from 'lucide-react';

export function UsabilityTest({ zones, lastTrigger }) {
  const [activo, setActivo] = useState(false);
  const [modalidad, setModalidad] = useState('MANO'); // 'MANO' o 'BLOQUE'
  const [sujetoId, setSujetoId] = useState('Sujeto_01');
  const [objetivoActual, setObjetivoActual] = useState(null);
  const [tiempoInicioEnsayo, setTiempoInicioEnsayo] = useState(null);
  const [erroresEnsayoActual, setErroresEnsayoActual] = useState(0);
  const [ensayosCompletados, setEnsayosCompletados] = useState([]);
  const [numeroEnsayo, setNumeroEnsayo] = useState(0);
  const totalEnsayosDeseados = 6;

  // Iniciar nuevo ensayo seleccionando aleatoriamente una de las zonas disponibles
  const siguienteEnsayo = () => {
    if (zones.length === 0) return;
    const zonaAleatoria = zones[Math.floor(Math.random() * zones.length)];
    setObjetivoActual(zonaAleatoria);
    setTiempoInicioEnsayo(Date.now());
    setErroresEnsayoActual(0);
    setNumeroEnsayo((prev) => prev + 1);
  };

  // Comenzar la batería de pruebas
  const iniciarPrueba = () => {
    setEnsayosCompletados([]);
    setNumeroEnsayo(0);
    setActivo(true);
    setTimeout(siguienteEnsayo, 400);
  };

  // Detener la prueba
  const detenerPrueba = () => {
    setActivo(false);
    setObjetivoActual(null);
  };

  // Escuchar disparos para validar si el usuario acertó o se equivocó
  useEffect(() => {
    if (!activo || !objetivoActual || !lastTrigger) return;

    const teclaDisparada = lastTrigger.key.toLowerCase();
    const teclaObjetivo = objetivoActual.key.toLowerCase();
    const tiempoReaccionMs = Date.now() - tiempoInicioEnsayo;

    if (teclaDisparada === teclaObjetivo) {
      // Éxito: el usuario activó la tecla solicitada
      const nuevoRegistro = {
        sujeto: sujetoId,
        modalidad: modalidad,
        ensayo: numeroEnsayo,
        tecla_objetivo: objetivoActual.label,
        tecla_presionada: lastTrigger.key,
        tiempo_ms: tiempoReaccionMs,
        errores: erroresEnsayoActual,
        exito: 1
      };

      setEnsayosCompletados((prev) => [...prev, nuevoRegistro]);

      if (numeroEnsayo < totalEnsayosDeseados) {
        setTimeout(siguienteEnsayo, 800);
      } else {
        // Fin de la batería de ensayos
        setActivo(false);
        setObjetivoActual(null);
      }
    } else {
      // Error: activó otra tecla no solicitada
      setErroresEnsayoActual((prev) => prev + 1);
    }
  }, [lastTrigger]);

  // Exportar los resultados en formato CSV para análisis en Excel, SPSS o R
  const descargarCSV = () => {
    if (ensayosCompletados.length === 0) return;

    const cabeceras = ['Sujeto', 'Modalidad', 'Ensayo', 'Tecla_Objetivo', 'Tecla_Presionada', 'Tiempo_ms', 'Errores', 'Exito'];
    const filas = ensayosCompletados.map((r) => [
      r.sujeto,
      r.modalidad,
      r.ensayo,
      r.tecla_objetivo,
      r.tecla_presionada,
      r.tiempo_ms,
      r.errores,
      r.exito
    ]);

    const contenidoCSV = [
      cabeceras.join(','),
      ...filas.map((f) => f.join(','))
    ].join('\n');

    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tui_a_metricas_${sujetoId}_${modalidad}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cálculo de estadísticas resumidas
  const tiempoPromedio = ensayosCompletados.length > 0
    ? Math.round(ensayosCompletados.reduce((acc, curr) => acc + curr.tiempo_ms, 0) / ensayosCompletados.length)
    : 0;

  const totalErrores = ensayosCompletados.reduce((acc, curr) => acc + curr.errores, 0);

  return (
    <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-sm space-y-6">
      
      {/* Encabezado del Módulo de Usabilidad */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Protocolo de Evaluación Empírica (HCI)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro experimental de velocidad y precisión para análisis SUS y NASA-TLX.
          </p>
        </div>

        {/* Controles de Configuración del Experimento */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={sujetoId}
            disabled={activo}
            onChange={(e) => setSujetoId(e.target.value)}
            placeholder="ID Sujeto"
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
          />

          <select
            value={modalidad}
            disabled={activo}
            onChange={(e) => setModalidad(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="MANO">Modalidad: Mano / Puño</option>
            <option value="BLOQUE">Modalidad: Bloque Tangible ArUco</option>
          </select>

          {!activo ? (
            <button
              onClick={iniciarPrueba}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Iniciar Test
            </button>
          ) : (
            <button
              onClick={detenerPrueba}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Detener
            </button>
          )}

          {ensayosCompletados.length > 0 && (
            <button
              onClick={descargarCSV}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Panel del Ensayo Activo */}
      {activo && objetivoActual && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-slate-900 border-2 border-cyan-500/50 flex items-center justify-between animate-pulse">
          <div className="space-y-1">
            <span className="text-xs uppercase font-mono text-cyan-400 tracking-wider">
              Ensayo {numeroEnsayo} de {totalEnsayosDeseados} — {modalidad === 'MANO' ? 'Apoya la Mano en:' : 'Desliza el Bloque hacia:'}
            </span>
            <div className="text-3xl font-black text-white">
              {objetivoActual.label} <span className="text-lg font-normal text-slate-400">({objetivoActual.name})</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-amber-400 font-mono">
              {erroresEnsayoActual > 0 ? `Errores en este ensayo: ${erroresEnsayoActual}` : 'Esperando activación...'}
            </span>
          </div>
        </div>
      )}

      {/* Tarjetas de Métricas Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
          <div className="text-xs text-slate-400">Ensayos Realizados</div>
          <div className="text-2xl font-bold text-white mt-1">
            {ensayosCompletados.length} <span className="text-xs text-slate-500">/ {totalEnsayosDeseados}</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
          <div className="text-xs text-slate-400">Tiempo Medio de Tarea</div>
          <div className="text-2xl font-bold text-cyan-300 mt-1">
            {tiempoPromedio} <span className="text-xs text-slate-500">ms</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
          <div className="text-xs text-slate-400">Errores Totales (Midas Touch)</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {totalErrores}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
          <div className="text-xs text-slate-400">Tasa de Precisión</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {ensayosCompletados.length > 0 ? `${Math.round((ensayosCompletados.length / (ensayosCompletados.length + totalErrores)) * 100)}%` : '--%'}
          </div>
        </div>
      </div>

      {/* Tabla de Registros Individuales */}
      {ensayosCompletados.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Sujeto</th>
                <th className="p-3">Modalidad</th>
                <th className="p-3">Objetivo</th>
                <th className="p-3">Tiempo (ms)</th>
                <th className="p-3">Errores</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {ensayosCompletados.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="p-3 font-mono">{item.ensayo}</td>
                  <td className="p-3">{item.sujeto}</td>
                  <td className="p-3">{item.modalidad}</td>
                  <td className="p-3 font-bold text-white">{item.tecla_objetivo}</td>
                  <td className="p-3 font-mono text-cyan-300">{item.tiempo_ms} ms</td>
                  <td className="p-3 text-amber-400">{item.errores}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" /> Exitoso
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
