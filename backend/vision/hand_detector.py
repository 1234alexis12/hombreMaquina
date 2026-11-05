"""
=============================================================================
PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
Detector de Manos, Palmas y Puños (MediaPipe HandLandmarker Oficial)
=============================================================================
Este módulo localiza la presencia de la mano o puño del usuario sobre la mesa.
Utiliza la red neuronal oficial de MediaPipe HandLandmarker para extraer los
landmarks anatómicos (muñeca y nudillos), eliminando falsos positivos en mesas.
=============================================================================
"""

import os
import cv2
import numpy as np
import logging

logger = logging.getLogger("DetectorManos")

# Ruta al modelo oficial de MediaPipe HandLandmarker
RUTA_MODELO_MANOS = os.path.join(os.path.dirname(__file__), "hand_landmarker.task")

try:
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    TIENE_MEDIAPIPE_TASKS = True
except ImportError:
    TIENE_MEDIAPIPE_TASKS = False
    logger.warning("MediaPipe Tasks no disponible.")

class DetectorManos:
    """
    Detecta la posición anatómica de manos o puños apoyados sobre la superficie.
    """

    def __init__(self, confianza_minima=0.35, max_manos=2):
        self.confianza_minima = confianza_minima
        self.max_manos = max_manos
        self.detector_tasks = None
        
        # 1. Configurar MediaPipe Tasks con el modelo oficial hand_landmarker.task
        if TIENE_MEDIAPIPE_TASKS and os.path.exists(RUTA_MODELO_MANOS):
            try:
                base_options = python.BaseOptions(model_asset_path=RUTA_MODELO_MANOS)
                options = vision.HandLandmarkerOptions(
                    base_options=base_options,
                    num_hands=self.max_manos,
                    min_hand_detection_confidence=self.confianza_minima,
                    min_hand_presence_confidence=self.confianza_minima,
                    min_tracking_confidence=self.confianza_minima
                )
                self.detector_tasks = vision.HandLandmarker.create_from_options(options)
                logger.info(f"MediaPipe HandLandmarker (Red Neuronal) inicializado exitosamente (conf={self.confianza_minima}).")
            except Exception as e:
                logger.warning(f"Error al inicializar HandLandmarker Tasks: {e}")
                self.detector_tasks = None
        else:
            logger.warning(f"Modelo hand_landmarker.task no encontrado en {RUTA_MODELO_MANOS}.")

    def detectar(self, frame_mesa):
        """
        Detecta manos reales mediante la red neuronal de MediaPipe y devuelve centroides normalizados.
        
        Retorna:
            lista_manos (list of dict): Cada elemento contiene:
                - 'centro_px': Tupla (x, y) en píxeles sobre la mesa.
                - 'centro_norm': Tupla (x_norm, y_norm) entre 0.0 y 1.0.
                - 'metodo': 'MEDIAPIPE'
                - 'landmarks_px': Lista de puntos clave de la mano.
        """
        alto, ancho = frame_mesa.shape[:2]
        manos_detectadas = []

        if self.detector_tasks is not None:
            try:
                # MediaPipe requiere imagen en espacio RGB
                frame_rgb = cv2.cvtColor(frame_mesa, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
                
                # Inferencia con la red neuronal
                resultado = self.detector_tasks.detect(mp_image)
                
                if resultado and resultado.hand_landmarks:
                    for landmarks in resultado.hand_landmarks:
                        # Extraer puntos clave de la palma de la mano:
                        # 0: Muñeca (Wrist)
                        # 5: Nudillo Índice (Index MCP)
                        # 9: Nudillo Medio (Middle MCP)
                        # 17: Nudillo Meñique (Pinky MCP)
                        indices_palma = [0, 5, 9, 17]
                        pts_palma_x = [landmarks[idx].x for idx in indices_palma]
                        pts_palma_y = [landmarks[idx].y for idx in indices_palma]
                        
                        # Centroide geométrico de la palma
                        cx_norm = float(np.mean(pts_palma_x))
                        cy_norm = float(np.mean(pts_palma_y))
                        
                        cx_px = int(cx_norm * ancho)
                        cy_px = int(cy_norm * alto)
                        
                        puntos_todos = [(int(lm.x * ancho), int(lm.y * alto)) for lm in landmarks]
                        
                        manos_detectadas.append({
                            "centro_px": (cx_px, cy_px),
                            "centro_norm": (cx_norm, cy_norm),
                            "metodo": "MEDIAPIPE",
                            "landmarks_px": puntos_todos
                        })
            except Exception as e:
                logger.error(f"Error durante inferencia de MediaPipe: {e}")

        return manos_detectadas

    def dibujar_manos(self, frame_mesa, manos_detectadas):
        """
        Dibuja los puntos anatómicos y centroides de la mano sobre el fotograma para depuración visual.
        """
        lienzo = frame_mesa.copy()
        for m in manos_detectadas:
            cx, cy = m["centro_px"]
            
            # Dibujar el centroide de la palma
            cv2.circle(lienzo, (cx, cy), 10, (0, 140, 255), -1)
            cv2.circle(lienzo, (cx, cy), 16, (0, 200, 255), 2)
            
            # Etiqueta con el método empleado
            cv2.putText(lienzo, f"Mano ({m['metodo']})", (cx - 40, cy - 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 140, 255), 2)
                        
            # Si hay puntos de MediaPipe, dibujar líneas de conexión
            if m.get("landmarks_px"):
                for px, py in m["landmarks_px"]:
                    cv2.circle(lienzo, (px, py), 3, (255, 255, 0), -1)
                    
        return lienzo
