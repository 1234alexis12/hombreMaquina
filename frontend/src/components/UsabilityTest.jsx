/**
 * =============================================================================
 * PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
 * Componente: Módulo Experimental de Evaluación de Usabilidad (HCI)
 * =============================================================================
 * Diseñado para la experimentación académica descrita en la propuesta:
 * - Evalúa tiempos de tarea, fallos y precisión en motricidad gruesa.
 * - Compara la Modalidad Mano vs. Modalidad Bloque Tangible ArUco.
 * - Exporta los datos empíricos en formato CSV para análisis con SUS y NASA-TLX.
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  Clock, 
  Target, 
  UserCheck, 
  FileSpreadsheet,
  Zap,
  BarChart2
} from 'lucide-react';

export function UsabilityTest({ zones, lastTrigger }) {
  const [activo, setActivo] = useState(false);
  const [modalidad, setModalidad] = useState('MANO'); // 'MANO' | 'BLOQUE'
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

    const teclaDisparada = String(lastTrigger.key).toLowerCase();
    const teclaObjetivo = String(objetivoActual.key).toLowerCase();
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
        setTimeout(siguienteEnsayo, 750);
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

  // Cálculo de estadísticas empíricas resumidas
  const tiempoPromedio = ensayosCompletados.length > 0
    ? Math.round(ensayosCompletados.reduce((acc, curr) => acc + curr.tiempo_ms, 0) / ensayosCompletados.length)
    : 0;

  const totalErrores = ensayosCompletados.reduce((acc, curr) => acc + curr.errores, 0);
  const precisionPorcentual = ensayosCompletados.length > 0
    ? Math.round((ensayosCompletados.length / (ensayosCompletados.length + totalErrores)) * 100)
    : 0;

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-2xl space-y-6">
      
      {/* Encabezado del Módulo Experimental */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Activity className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">
                Protocolo Experimental de Usabilidad (HCI)
              </h3>
              <p className="text-xs text-slate-400">
                Evaluación cuantitativa de tiempos de tarea, errores de Midas Touch y exportación SUS / NASA-TLX
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Configuración y Control del Ensayo */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={sujetoId}
              disabled={activo}
              onChange={(e) => setSujetoId(e.target.value)}
              placeholder="ID Sujeto"
              className="bg-transparent border-none text-xs font-mono font-bold text-cyan-300 focus:outline-none w-24"
            />
          </div>

          <select
            value={modalidad}
            disabled={activo}
            onChange={(e) => setModalidad(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="MANO">Modalidad: Mano / Puño</option>
            <option value="BLOQUE">Modalidad: Bloque Tangible ArUco</option>
          </select>

          {!activo ? (
            <button
              onClick={iniciarPrueba}
              className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/25"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar Batería de Ensayos</span>
            </button>
          ) : (
            <button
              onClick={detenerPrueba}
              className="px-5 py-2 rounded-xl text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Detener Test</span>
            </button>
          )}

          {ensayosCompletados.length > 0 && (
            <button
              onClick={descargarCSV}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition flex items-center gap-1.5 shadow-sm shadow-cyan-950"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Planilla CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner Principal del Ensayo Activo (Ultra Accesible y Alto Contraste) */}
      {activo && objetivoActual ? (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-indigo-950/70 border-2 border-cyan-400/80 shadow-[0_0_40px_rgba(6,182,212,0.25)] flex flex-wrap items-center justify-between gap-4 animate-pulse">
          <div className="space-y-1">
            <span className="text-xs uppercase font-mono font-bold text-cyan-400 tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              Ensayo #{numeroEnsayo} de {totalEnsayosDeseados} • {modalidad === 'MANO' ? 'Apoya la Mano en:' : 'Desliza el Bloque hacia:'}
            </span>
            <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              {objetivoActual.label}
              <span className="text-lg font-normal text-slate-400 ml-3">
                ({objetivoActual.name})
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
              {erroresEnsayoActual > 0 ? `Errores en este ensayo: ${erroresEnsayoActual}` : 'Esperando activación intencional...'}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <span>Presiona <strong>"Iniciar Batería de Ensayos"</strong> para comenzar a registrar tiempos de tarea y errores de Midas Touch.</span>
          </div>
          <span className="font-mono text-slate-500">6 Ensayos Aleatorios</span>
        </div>
      )}

      {/* Tarjetas de Métricas Cuantitativas Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Métrica 1: Ensayos */}
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400">Progreso del Test</div>
          <div className="text-3xl font-black text-white mt-1.5">
            {ensayosCompletados.length}
            <span className="text-sm font-normal text-slate-500 ml-1">/ {totalEnsayosDeseados}</span>
          </div>
          <div className="absolute top-0 right-0 w-16 h-1 bg-cyan-400/80" />
        </div>

        {/* Métrica 2: Tiempo Medio */}
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400">Tiempo Medio de Reacción</div>
          <div className="text-3xl font-black text-cyan-300 font-mono mt-1.5">
            {tiempoPromedio}
            <span className="text-xs font-normal text-slate-400 ml-1">ms</span>
          </div>
          <div className="absolute top-0 right-0 w-16 h-1 bg-cyan-400/80" />
        </div>

        {/* Métrica 3: Errores Midas Touch */}
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400">Errores Involuntarios (Midas)</div>
          <div className="text-3xl font-black text-amber-400 font-mono mt-1.5">
            {totalErrores}
          </div>
          <div className="absolute top-0 right-0 w-16 h-1 bg-amber-400/80" />
        </div>

        {/* Métrica 4: Precisión */}
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 relative overflow-hidden">
          <div className="text-xs font-semibold text-slate-400">Tasa de Acierto Global</div>
          <div className="text-3xl font-black text-emerald-400 font-mono mt-1.5">
            {ensayosCompletados.length > 0 ? `${precisionPorcentual}%` : '--%'}
          </div>
          <div className="absolute top-0 right-0 w-16 h-1 bg-emerald-400/80" />
        </div>

      </div>

      {/* Tabla de Registros Experimentales Individuales */}
      {ensayosCompletados.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-300">Detalle de Ensayos Registrados</span>
            <span className="font-mono text-[11px] text-cyan-400">Listo para exportar a Excel / SPSS</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Sujeto</th>
                  <th className="p-3">Modalidad</th>
                  <th className="p-3">Tecla Objetivo</th>
                  <th className="p-3">Tiempo (ms)</th>
                  <th className="p-3">Errores Midas</th>
                  <th className="p-3">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {ensayosCompletados.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 font-mono text-slate-500 font-bold">{item.ensayo}</td>
                    <td className="p-3 font-medium text-slate-200">{item.sujeto}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {item.modalidad}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-white text-sm">{item.tecla_objetivo}</td>
                    <td className="p-3 font-mono font-bold text-cyan-300">{item.tiempo_ms} ms</td>
                    <td className="p-3 font-mono text-amber-400">{item.errores}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                        <CheckCircle className="w-3 h-3 text-emerald-400" /> Confirmado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
