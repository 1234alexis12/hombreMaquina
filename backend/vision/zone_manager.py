"""
=============================================================================
PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
Gestor de Zonas Activas, Dwell Time y Prevención del "Midas Touch"
=============================================================================
Este módulo administra la máquina de estados de cada zona activa de la mesa:
IDLE -> CHARGING -> TRIGGERED -> COOLDOWN.
Controla el tiempo de permanencia (Dwell Time) para validar la intencionalidad
del usuario antes de disparar la pulsación de la tecla real.
=============================================================================
"""

import time
import cv2
import numpy as np
import logging

logger = logging.getLogger("GestorZonas")

class EstadoZona:
    IDLE = "IDLE"              # Zona vacía o sin contacto intencional
    CHARGING = "CHARGING"      # Objeto detectado: temporizador de Dwell en progreso
    TRIGGERED = "TRIGGERED"    # Dwell completado: tecla disparada
    COOLDOWN = "COOLDOWN"      # Período de enfriamiento para evitar rebotes múltiples

class ZonaInteractiva:
    """
    Representa una tecla virtual o área interactiva sobre la mesa.
    """
    def __init__(self, id_zona, nombre, tecla, etiqueta, rect_norm, color_hex="#3B82F6", aruco_id=None):
        self.id = id_zona
        self.nombre = nombre
        self.tecla = tecla
        self.etiqueta = etiqueta
        # Rectángulo normalizado: [x_min, y_min, x_max, y_max] con valores entre 0.0 y 1.0
        self.rect_norm = rect_norm
        self.color_hex = color_hex
        self.aruco_id = aruco_id
        
        # Variables de la máquina de estados
        self.estado = EstadoZona.IDLE
        self.progreso_dwell = 0.0      # De 0.0 a 1.0 (0% a 100%)
        self.tiempo_inicio_carga = None
        self.tiempo_disparo = None
        self.tipo_fuente_actual = None # 'ARUCO' o 'MANO'
        self.ultimo_centroide = None

    def contiene_punto(self, x_norm, y_norm):
        """
        Verifica si unas coordenadas normalizadas (x_norm, y_norm) caen dentro del área de la zona.
        """
        x_min, y_min, x_max, y_max = self.rect_norm
        return (x_min <= x_norm <= x_max) and (y_min <= y_norm <= y_max)

class GestorZonas:
    """
    Coordina todas las zonas activas y procesa las detecciones para actualizar sus estados.
    """

    def __init__(self, lista_config_zonas, dwell_time_ms=800, cooldown_ms=400, callback_disparo=None):
        self.dwell_time_segundos = dwell_time_ms / 1000.0
        self.cooldown_segundos = cooldown_ms / 1000.0
        self.callback_disparo = callback_disparo
        self.zonas = []
        
        # Inicializar objetos de zona desde la configuración
        for conf in lista_config_zonas:
            zona = ZonaInteractiva(
                id_zona=conf["id"],
                nombre=conf.get("name", f"Zona {conf['id']}"),
                tecla=conf.get("key", "space"),
                etiqueta=conf.get("label", conf.get("key", "A")),
                rect_norm=conf.get("rect", [0.1, 0.1, 0.4, 0.9]),
                color_hex=conf.get("color", "#3B82F6"),
                aruco_id=conf.get("aruco_id", None)
            )
            self.zonas.append(zona)

    def actualizar(self, detecciones_aruco, detecciones_mano):
        """
        Evalúa las posiciones detectadas en el fotograma actual y actualiza
        el estado de cada zona según el tiempo transcurrido (Dwell Time).
        
        Retorna:
            resumen_estados (list of dict): Estados listos para enviar al frontend por WebSocket.
        """
        ahora = time.time()
        
        # Lista unificada de estímulos presentes en este ciclo: (x_norm, y_norm, tipo, id_opcional)
        estimulos = []
        for m in detecciones_aruco:
            estimulos.append({
                "pos_norm": m["centro_norm"],
                "tipo": "ARUCO",
                "id": m["id"]
            })
        for h in detecciones_mano:
            estimulos.append({
                "pos_norm": h["centro_norm"],
                "tipo": "MANO",
                "id": None
            })

        for zona in self.zonas:
            # 1. Determinar si hay algún estímulo dentro de esta zona
            estimulo_activo = None
            for est in estimulos:
                x_n, y_n = est["pos_norm"]
                if zona.contiene_punto(x_n, y_n):
                    # Si la zona requiere un ID específico de ArUco, validarlo
                    if est["tipo"] == "ARUCO" and zona.aruco_id is not None:
                        if est["id"] == zona.aruco_id:
                            estimulo_activo = est
                            break
                    else:
                        estimulo_activo = est
                        break

            # 2. Máquina de estados con filtro anti "Midas Touch"
            if zona.estado == EstadoZona.COOLDOWN:
                # Comprobar si ya expiró el período de enfriamiento
                if ahora - zona.tiempo_disparo >= self.cooldown_segundos:
                    # Si el objeto sigue dentro, pasa a reposo hasta que salga o continúe
                    zona.estado = EstadoZona.IDLE
                    zona.progreso_dwell = 0.0
                    zona.tipo_fuente_actual = None
                    
            elif zona.estado == EstadoZona.TRIGGERED:
                # Transición inmediata a COOLDOWN para evitar disparos repetidos
                zona.estado = EstadoZona.COOLDOWN
                zona.tiempo_disparo = ahora
                zona.progreso_dwell = 0.0

            elif estimulo_activo is not None:
                # Objeto o mano detectada dentro de la zona
                if zona.estado == EstadoZona.IDLE:
                    # Iniciar proceso de confirmación de intención (Dwell Time)
                    zona.estado = EstadoZona.CHARGING
                    zona.tiempo_inicio_carga = ahora
                    zona.tipo_fuente_actual = estimulo_activo["tipo"]
                    zona.progreso_dwell = 0.0
                elif zona.estado == EstadoZona.CHARGING:
                    # Incrementar el progreso según el tiempo transcurrido
                    tiempo_transcurrido = ahora - zona.tiempo_inicio_carga
                    zona.progreso_dwell = min(1.0, tiempo_transcurrido / self.dwell_time_segundos)
                    
                    # ¿Se completó el tiempo de permanencia sin retirarse?
                    if zona.progreso_dwell >= 1.0:
                        zona.estado = EstadoZona.TRIGGERED
                        logger.info(f"[DISPARO] Zona '{zona.etiqueta}' activada con éxito ({zona.tipo_fuente_actual})")
                        
                        # Disparar la tecla real en el sistema operativo mediante el callback
                        if self.callback_disparo:
                            self.callback_disparo(zona.tecla)

            else:
                # FILTRO MIDAS TOUCH: Si el usuario retira la mano antes de alcanzar el 100%,
                # se cancela inmediatamente la carga para evitar falsas pulsaciones accidentales.
                if zona.estado == EstadoZona.CHARGING:
                    logger.debug(f"[CANCELADO] Zona '{zona.etiqueta}' interrumpida antes de tiempo.")
                zona.estado = EstadoZona.IDLE
                zona.progreso_dwell = 0.0
                zona.tiempo_inicio_carga = None
                zona.tipo_fuente_actual = None

        # Preparar diccionario resumen para la transmisión por WebSocket
        resumen = []
        for z in self.zonas:
            resumen.append({
                "id": z.id,
                "name": z.nombre,
                "key": z.tecla,
                "label": z.etiqueta,
                "state": z.estado,
                "progress": round(z.progreso_dwell, 3),
                "source": z.tipo_fuente_actual,
                "color": z.color_hex,
                "rect": z.rect_norm
            })
            
        return resumen

    def dibujar_zonas(self, frame_mesa):
        """
        Dibuja las zonas interactivas y su barra de progreso sobre el fotograma aplanado.
        """
        alto, ancho = frame_mesa.shape[:2]
        lienzo = frame_mesa.copy()

        for z in self.zonas:
            x_min, y_min, x_max, y_max = z.rect_norm
            p1 = (int(x_min * ancho), int(y_min * alto))
            p2 = (int(x_max * ancho), int(y_max * alto))

            # Definir color del borde según el estado actual
            if z.estado == EstadoZona.TRIGGERED:
                color_borde = (0, 255, 0)      # Verde brillante (Éxito)
                grosor = 4
            elif z.estado == EstadoZona.CHARGING:
                color_borde = (0, 200, 255)    # Amarillo / Naranja (Cargando)
                grosor = 3
            elif z.estado == EstadoZona.COOLDOWN:
                color_borde = (128, 128, 128)  # Gris (Enfriando)
                grosor = 2
            else:
                color_borde = (220, 220, 220)  # Blanco / Gris claro (Reposo)
                grosor = 2

            # Dibujar rectángulo delimitador de la zona
            cv2.rectangle(lienzo, p1, p2, color_borde, grosor)

            # Dibujar barra de progreso del Dwell Time en la base de la zona
            if z.estado == EstadoZona.CHARGING and z.progreso_dwell > 0:
                ancho_total_zona = p2[0] - p1[0]
                ancho_progreso = int(ancho_total_zona * z.progreso_dwell)
                alto_barra = 12
                y_barra = p2[1] - alto_barra - 4
                # Fondo gris de la barra
                cv2.rectangle(lienzo, (p1[0] + 4, y_barra), (p2[0] - 4, y_barra + alto_barra), (50, 50, 50), -1)
                # Barra de progreso activa
                cv2.rectangle(lienzo, (p1[0] + 4, y_barra), (p1[0] + 4 + ancho_progreso, y_barra + alto_barra), (0, 255, 0), -1)

            # Etiqueta de texto de la tecla
            texto = f"{z.etiqueta} ({int(z.progreso_dwell * 100)}%)" if z.estado == EstadoZona.CHARGING else z.etiqueta
            cv2.putText(lienzo, texto, (p1[0] + 10, p1[1] + 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, color_borde, 2, cv2.LINE_AA)

        return lienzo
