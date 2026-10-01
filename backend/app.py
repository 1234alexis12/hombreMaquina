"""
=============================================================================
PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
Servidor Principal FastAPI con WebSockets y Transmisión de Telemetría
=============================================================================
Este servidor ejecuta el bucle de visión artificial en tiempo real, administra
las conexiones WebSocket con la interfaz de usuario en React, transmite el
progreso del Dwell Time a 30 FPS y expone la transmisión de video MJPEG.
=============================================================================
"""

import os
import time
import json
import asyncio
import logging
import cv2
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# Importar módulos propios del backend
from vision.camera import CamaraCenital
from vision.aruco_detector import DetectorArUco
from vision.hand_detector import DetectorManos
from vision.zone_manager import GestorZonas
from keyboard_controller import teclado

# Configuración del registro de eventos
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ServidorTUI-A")

RUTA_CONFIG = os.path.join(os.path.dirname(__file__), "config.json")

def cargar_configuracion():
    """Lee el archivo de configuración JSON del sistema."""
    if os.path.exists(RUTA_CONFIG):
        with open(RUTA_CONFIG, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def guardar_configuracion(config_dict):
    """Guarda las modificaciones en el archivo JSON."""
    with open(RUTA_CONFIG, "w", encoding="utf-8") as f:
        json.dump(config_dict, f, indent=2, ensure_ascii=False)

# Inicializar FastAPI
app = FastAPI(title="TUI-A Backend API", version="1.0.0")

# Habilitar CORS para permitir peticiones desde Vite / React (localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# GESTOR DE CONEXIONES WEBSOCKET
# -----------------------------------------------------------------------------
class AdministradorConexiones:
    """Gestiona múltiples clientes conectados vía WebSocket."""
    def __init__(self):
        self.conexiones_activas: List[WebSocket] = []

    async def conectar(self, websocket: WebSocket):
        await websocket.accept()
        self.conexiones_activas.append(websocket)
        logger.info(f"Cliente WebSocket conectado. Total activos: {len(self.conexiones_activas)}")

    def desconectar(self, websocket: WebSocket):
        if websocket in self.conexiones_activas:
            self.conexiones_activas.remove(websocket)
            logger.info(f"Cliente WebSocket desconectado. Total activos: {len(self.conexiones_activas)}")

    async def transmitir_json(self, datos: dict):
        """Envía un payload JSON a todos los clientes web conectados."""
        for conexion in list(self.conexiones_activas):
            try:
                await conexion.send_json(datos)
            except Exception:
                self.desconectar(conexion)

admin_ws = AdministradorConexiones()

# -----------------------------------------------------------------------------
# VARIABLES GLOBALES Y MOTOR DE VISIÓN
# -----------------------------------------------------------------------------
config_actual = cargar_configuracion()
cam_cfg = config_actual.get("camera", {})
inter_cfg = config_actual.get("interaction", {})
zonas_cfg = config_actual.get("zones", [])

# Instanciar subsistemas de visión
camara = CamaraCenital(
    indice_camara=cam_cfg.get("index", 0),
    ancho=cam_cfg.get("width", 1280),
    alto=cam_cfg.get("height", 720),
    esquinas_mesa=cam_cfg.get("desk_corners", None),
    ancho_salida=cam_cfg.get("warped_width", 800),
    alto_salida=cam_cfg.get("warped_height", 600)
)

detector_aruco = DetectorArUco()
detector_manos = DetectorManos(confianza_minima=inter_cfg.get("min_detection_confidence", 0.5))

ultimo_evento_disparo = None

def al_disparar_tecla(tecla):
    """Callback invocado cuando una zona completa su Dwell Time con éxito."""
    global ultimo_evento_disparo
    teclado.presionar_tecla(tecla)
    ultimo_evento_disparo = {
        "key": tecla,
        "timestamp": time.time()
    }

gestor_zonas = GestorZonas(
    lista_config_zonas=zonas_cfg,
    dwell_time_ms=inter_cfg.get("dwell_time_ms", 800),
    cooldown_ms=inter_cfg.get("cooldown_ms", 400),
    callback_disparo=al_disparar_tecla
)

# Variable para almacenar el fotograma anotado para streaming MJPEG
ultimo_frame_anotado = None

# -----------------------------------------------------------------------------
# BUCLE PRINCIPAL DE VISIÓN (ASÍNCRONO)
# -----------------------------------------------------------------------------
async def bucle_vision():
    """
    Bucle continuo que captura imágenes, procesa ArUcos y manos,
    actualiza la máquina de estados y transmite por WebSocket.
    """
    global ultimo_frame_anotado, ultimo_evento_disparo
    fps_contador = 0
    fps_actual = 30.0
    ultimo_tiempo_fps = time.time()

    logger.info("Iniciando bucle de visión y procesamiento TUI-A...")

    while True:
        tiempo_inicio_ciclo = time.time()
        
        # 1. Capturar fotograma y obtener la vista aplanada ortogonal
        ret, frame_crudo, frame_mesa = camara.leer_frame()
        
        if ret and frame_mesa is not None:
            # 2. Detección de marcadores ArUco (bloques tangibles)
            arucos = detector_aruco.detectar(frame_mesa)
            
            # 3. Detección de manos/palmas/puños (MediaPipe + fallback piel)
            manos = detector_manos.detectar(frame_mesa)
            
            # 4. Actualizar máquina de estados de las zonas interactivas
            estados_zonas = gestor_zonas.actualizar(arucos, manos)
            
            # 5. Dibujar anotaciones visuales sobre el fotograma aplanado
            frame_debug = detector_aruco.dibujar_marcadores(frame_mesa, arucos)
            frame_debug = detector_manos.dibujar_manos(frame_debug, manos)
            frame_debug = gestor_zonas.dibujar_zonas(frame_debug)
            
            ultimo_frame_anotado = frame_debug

            # 6. Cálculo de FPS reales
            fps_contador += 1
            if time.time() - ultimo_tiempo_fps >= 1.0:
                fps_actual = round(fps_contador / (time.time() - ultimo_tiempo_fps), 1)
                fps_contador = 0
                ultimo_tiempo_fps = time.time()

            # 7. Transmisión del paquete de telemetría a los clientes web
            if len(admin_ws.conexiones_activas) > 0:
                payload = {
                    "type": "telemetry",
                    "timestamp": round(time.time(), 3),
                    "fps": fps_actual,
                    "zones": estados_zonas,
                    "dwell_target_ms": gestor_zonas.dwell_time_segundos * 1000,
                    "active_elements": {
                        "arucos_count": len(arucos),
                        "hands_count": len(manos)
                    },
                    "last_trigger": ultimo_evento_disparo
                }
                await admin_ws.transmitir_json(payload)
                
                # Limpiar el evento de disparo luego de transmitirlo
                if ultimo_evento_disparo is not None:
                    ultimo_evento_disparo = None

        # Controlar la tasa de actualización a ~30-40 FPS para no saturar CPU
        tiempo_ciclo = time.time() - tiempo_inicio_ciclo
        tiempo_espera = max(0.001, (1.0 / 35.0) - tiempo_ciclo)
        await asyncio.sleep(tiempo_espera)

@app.on_event("startup")
async def inicio_servidor():
    """Inicia la tarea en segundo plano del procesamiento de visión al arrancar FastAPI."""
    asyncio.create_task(bucle_vision())

# -----------------------------------------------------------------------------
# RUTAS DE LA API REST
# -----------------------------------------------------------------------------
@app.get("/api/config")
def obtener_configuracion():
    """Devuelve la configuración actual del sistema."""
    return cargar_configuracion()

@app.post("/api/config")
async def actualizar_configuracion(nuevos_datos: dict):
    """Actualiza y persiste la configuración (dwell time, teclas, zonas)."""
    global config_actual
    config_actual.update(nuevos_datos)
    guardar_configuracion(config_actual)
    
    # Aplicar cambios en caliente al gestor de zonas
    if "interaction" in nuevos_datos:
        dwell_ms = nuevos_datos["interaction"].get("dwell_time_ms", 800)
        cooldown_ms = nuevos_datos["interaction"].get("cooldown_ms", 400)
        gestor_zonas.dwell_time_segundos = dwell_ms / 1000.0
        gestor_zonas.cooldown_segundos = cooldown_ms / 1000.0
        
    return {"status": "ok", "message": "Configuración guardada exitosamente"}

@app.get("/video_feed")
def transmision_video_mjpeg():
    """
    Ruta para incrustar la transmisión de video en vivo (con detección y zonas)
    directamente en la interfaz React mediante una etiqueta <img> estándar.
    """
    def generador():
        while True:
            if ultimo_frame_anotado is not None:
                ret, buffer = cv2.imencode('.jpg', ultimo_frame_anotado, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
                if ret:
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.04) # ~25 FPS

    return StreamingResponse(generador(), media_type="multipart/x-mixed-replace; boundary=frame")

# -----------------------------------------------------------------------------
# ENDPOINT WEBSOCKET
# -----------------------------------------------------------------------------
@app.websocket("/ws")
async def punto_enlace_websocket(websocket: WebSocket):
    """Canal bidireccional en tiempo real con el frontend."""
    await admin_ws.conectar(websocket)
    try:
        while True:
            # Escuchar mensajes enviados desde el frontend (comandos o cambios de dwell)
            mensaje_texto = await websocket.receive_text()
            try:
                mensaje = json.loads(mensaje_texto)
                if mensaje.get("type") == "set_dwell_time":
                    nuevo_dwell = float(mensaje.get("value", 800))
                    gestor_zonas.dwell_time_segundos = nuevo_dwell / 1000.0
                    logger.info(f"Dwell Time actualizado a {nuevo_dwell} ms")
            except Exception as e:
                logger.error(f"Error procesando mensaje WebSocket entrante: {e}")
    except WebSocketDisconnect:
        admin_ws.desconectar(websocket)
    except Exception as e:
        logger.error(f"Excepción en conexión WebSocket: {e}")
        admin_ws.desconectar(websocket)

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*70)
    print(" INICIANDO SERVIDOR TUI-A (FASTAPI + WEBSOCKETS)")
    print(" Acceso a la API: http://localhost:8000")
    print(" Video en vivo:   http://localhost:8000/video_feed")
    print("="*70 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
