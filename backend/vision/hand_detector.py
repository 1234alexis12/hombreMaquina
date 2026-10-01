"""
=============================================================================
PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
Detector de Manos, Palmas y Puños (MediaPipe + Fallback por Color/Contorno)
=============================================================================
Este módulo localiza la presencia de la mano o puño del usuario sobre la mesa.
Combina la red neuronal de MediaPipe Hands con un algoritmo de respaldo
basado en segmentación de piel para garantizar robustez en vista cenital.
=============================================================================
"""

import cv2
import numpy as np
import logging

logger = logging.getLogger("DetectorManos")

try:
    import mediapipe as mp
    TIENE_MEDIAPIPE = True
except ImportError:
    TIENE_MEDIAPIPE = False
    logger.warning("MediaPipe no disponible. Se utilizará el detector alternativo por contornos.")

class DetectorManos:
    """
    Detecta la posición de manos o puños apoyados sobre la superficie.
    """

    def __init__(self, confianza_minima=0.5, max_manos=2):
        self.confianza_minima = confianza_minima
        self.max_manos = max_manos
        
        # 1. Configurar MediaPipe Hands si la librería está presente
        if TIENE_MEDIAPIPE:
            self.mp_hands = mp.solutions.hands
            self.detector_mp = self.mp_hands.Hands(
                static_image_mode=False,
                max_num_hands=self.max_manos,
                min_detection_confidence=self.confianza_minima,
                min_tracking_confidence=0.5
            )
            self.mp_draw = mp.solutions.drawing_utils
        else:
            self.detector_mp = None

    def detectar(self, frame_mesa):
        """
        Detecta manos o puños y devuelve una lista de centroides detectados.
        
        Retorna:
            lista_manos (list of dict): Cada elemento contiene:
                - 'centro_px': Tupla (x, y) en píxeles sobre la mesa.
                - 'centro_norm': Tupla (x_norm, y_norm) entre 0.0 y 1.0.
                - 'metodo': 'MEDIAPIPE' o 'CONTORNO_PIEL'.
                - 'landmarks_px': Lista de puntos clave (solo si usó MediaPipe).
        """
        alto, ancho = frame_mesa.shape[:2]
        manos_detectadas = []

        # Intentar detección con MediaPipe
        if self.detector_mp is not None:
            # MediaPipe requiere imagen en espacio de color RGB
            frame_rgb = cv2.cvtColor(frame_mesa, cv2.COLOR_BGR2RGB)
            resultados = self.detector_mp.process(frame_rgb)
            
            if resultados.multi_hand_landmarks:
                for hand_landmarks in resultados.multi_hand_landmarks:
                    # Extraer puntos clave de la palma:
                    # 0: Muñeca (Wrist)
                    # 5: Nudillo Índice (Index MCP)
                    # 9: Nudillo Medio (Middle MCP)
                    # 17: Nudillo Meñique (Pinky MCP)
                    indices_palma = [0, 5, 9, 17]
                    pts_palma_x = [hand_landmarks.landmark[idx].x for idx in indices_palma]
                    pts_palma_y = [hand_landmarks.landmark[idx].y for idx in indices_palma]
                    
                    # El centroide de la palma es el promedio de estos puntos clave
                    cx_norm = float(np.mean(pts_palma_x))
                    cy_norm = float(np.mean(pts_palma_y))
                    
                    cx_px = int(cx_norm * ancho)
                    cy_px = int(cy_norm * alto)
                    
                    puntos_todos = [(int(lm.x * ancho), int(lm.y * alto)) for lm in hand_landmarks.landmark]
                    
                    manos_detectadas.append({
                        "centro_px": (cx_px, cy_px),
                        "centro_norm": (cx_norm, cy_norm),
                        "metodo": "MEDIAPIPE",
                        "landmarks_px": puntos_todos
                    })

        # Si MediaPipe no detectó manos (por ejemplo, si el puño está cerrado o la vista
        # cenital no muestra los dedos extendidos), aplicamos el detector de respaldo
        if len(manos_detectadas) == 0:
            manos_respaldo = self._detectar_por_piel_y_masa(frame_mesa)
            manos_detectadas.extend(manos_respaldo)

        return manos_detectadas

    def _detectar_por_piel_y_masa(self, frame_mesa):
        """
        Método de respaldo: segmentación de color de piel en espacio HSV y detección
        de contornos significativos para puño o palma apoyada.
        """
        alto, ancho = frame_mesa.shape[:2]
        manos = []
        
        # Convertir a espacio HSV para aislar tonos de piel
        hsv = cv2.cvtColor(frame_mesa, cv2.COLOR_BGR2HSV)
        
        # Rango general de tono de piel humana en HSV
        bajo_piel = np.array([0, 25, 50], dtype=np.uint8)
        alto_piel = np.array([25, 255, 255], dtype=np.uint8)
        
        mascara = cv2.inRange(hsv, bajo_piel, alto_piel)
        
        # Filtro morfológico para eliminar ruido pequeño
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        mascara = cv2.morphologyEx(mascara, cv2.MORPH_OPEN, kernel, iterations=2)
        mascara = cv2.dilate(mascara, kernel, iterations=2)
        
        # Encontrar contornos
        contornos, _ = cv2.findContours(mascara, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Área mínima en píxeles para considerar una mano/puño apoyado (aprox. 50x50 px)
        area_minima = 2500
        
        for c in contornos:
            area = cv2.contourArea(c)
            if area >= area_minima:
                # Calcular momentos espaciales para obtener el centroide
                M = cv2.moments(c)
                if M["m00"] != 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                    
                    norm_x = float(np.clip(cx / ancho, 0.0, 1.0))
                    norm_y = float(np.clip(cy / alto, 0.0, 1.0))
                    
                    manos.append({
                        "centro_px": (cx, cy),
                        "centro_norm": (norm_x, norm_y),
                        "metodo": "CONTORNO_PIEL",
                        "landmarks_px": []
                    })
                    if len(manos) >= self.max_manos:
                        break
                        
        return manos

    def dibujar_manos(self, frame_mesa, manos_detectadas):
        """
        Dibuja los puntos y centroides de la mano sobre el fotograma para depuración visual.
        """
        lienzo = frame_mesa.copy()
        for m in manos_detectadas:
            cx, cy = m["centro_px"]
            
            # Dibujar el centroide de la palma o puño
            cv2.circle(lienzo, (cx, cy), 10, (0, 140, 255), -1)
            cv2.circle(lienzo, (cx, cy), 16, (0, 200, 255), 2)
            
            # Etiqueta con el método empleado
            cv2.putText(lienzo, f"Mano ({m['metodo']})", (cx - 40, cy - 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 140, 255), 2)
                        
            # Si hay puntos de MediaPipe, dibujar líneas de conexión
            if m["landmarks_px"]:
                for px, py in m["landmarks_px"]:
                    cv2.circle(lienzo, (px, py), 3, (255, 255, 0), -1)
                    
        return lienzo
