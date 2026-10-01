"""
=============================================================================
PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
Detector de Marcadores Fiduciales ArUco
=============================================================================
Este módulo detecta los bloques tangibles con marcadores ArUco sobre
la superficie de la mesa corregida y extrae sus centroides en coordenadas
normalizadas (0.0 a 1.0).
=============================================================================
"""

import cv2
import numpy as np

class DetectorArUco:
    """
    Gestiona la detección de marcadores ArUco usando OpenCV.
    """

    def __init__(self, tipo_diccionario=cv2.aruco.DICT_4X4_50):
        # 1. Cargar el diccionario ArUco especificado
        if hasattr(cv2.aruco, 'getPredefinedDictionary'):
            self.diccionario = cv2.aruco.getPredefinedDictionary(tipo_diccionario)
        else:
            self.diccionario = cv2.aruco.Dictionary_get(tipo_diccionario)
            
        # 2. Configurar los parámetros del detector
        if hasattr(cv2.aruco, 'DetectorParameters'):
            self.parametros = cv2.aruco.DetectorParameters()
        else:
            self.parametros = cv2.aruco.DetectorParameters_create()
            
        # 3. Soporte para OpenCV 4.7+ (ArucoDetector) y versiones anteriores
        self.usar_nuevo_detector = hasattr(cv2.aruco, 'ArucoDetector')
        if self.usar_nuevo_detector:
            self.detector = cv2.aruco.ArucoDetector(self.diccionario, self.parametros)

    def detectar(self, frame_mesa):
        """
        Detecta marcadores en la imagen de la mesa.
        
        Retorna:
            lista_marcadores (list of dict): Cada elemento contiene:
                - 'id': Identificador entero del marcador.
                - 'centro_px': Tupla (x, y) en píxeles.
                - 'centro_norm': Tupla (x_norm, y_norm) normalizada entre 0.0 y 1.0.
                - 'esquinas': Coordenadas de las 4 esquinas del marcador.
        """
        alto, ancho = frame_mesa.shape[:2]
        gray = cv2.cvtColor(frame_mesa, cv2.COLOR_BGR2GRAY)
        
        # Ejecutar detección según la versión de OpenCV instalada
        if self.usar_nuevo_detector:
            esquinas, ids, rechazados = self.detector.detectMarkers(gray)
        else:
            esquinas, ids, rechazados = cv2.aruco.detectMarkers(
                gray, self.diccionario, parameters=self.parametros
            )

        marcadores_detectados = []
        
        if ids is not None and len(ids) > 0:
            for i in range(len(ids)):
                id_actual = int(ids[i][0])
                pts_esquinas = esquinas[i][0]
                
                # Calcular el centroide geométrico del marcador ArUco
                centro_x = int(np.mean(pts_esquinas[:, 0]))
                centro_y = int(np.mean(pts_esquinas[:, 1]))
                
                # Normalizar coordenadas de 0.0 a 1.0 respecto al tamaño de la mesa
                norm_x = float(np.clip(centro_x / ancho, 0.0, 1.0))
                norm_y = float(np.clip(centro_y / alto, 0.0, 1.0))
                
                marcadores_detectados.append({
                    "id": id_actual,
                    "centro_px": (centro_x, centro_y),
                    "centro_norm": (norm_x, norm_y),
                    "esquinas": pts_esquinas
                })

        return marcadores_detectados

    def dibujar_marcadores(self, frame_mesa, marcadores_detectados):
        """
        Dibuja los contornos y los IDs de los marcadores detectados sobre el fotograma.
        """
        lienzo = frame_mesa.copy()
        for m in marcadores_detectados:
            pts = np.int32(m["esquinas"]).reshape((-1, 1, 2))
            # Contorno verde brillante alrededor del marcador
            cv2.polylines(lienzo, [pts], isClosed=True, color=(0, 255, 0), thickness=2)
            
            # Dibujar el centroide con un círculo azul
            cx, cy = m["centro_px"]
            cv2.circle(lienzo, (cx, cy), 5, (255, 0, 0), -1)
            
            # Etiqueta con el ID del marcador
            cv2.putText(lienzo, f"ArUco ID:{m['id']}", (cx - 30, cy - 15),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)
                        
        return lienzo
