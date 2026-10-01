"""
=============================================================================
PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
Módulo de Captura de Cámara y Transformación de Perspectiva (Homografía)
=============================================================================
Este módulo captura video desde la cámara cenital y aplica una transformación
de perspectiva ortogonal para aplanar la superficie de la mesa de trabajo.
=============================================================================
"""

import cv2
import numpy as np
import logging

logger = logging.getLogger("CamaraCenital")

class CamaraCenital:
    """
    Controla la cámara web y la corrección de perspectiva de la mesa.
    """
    
    def __init__(self, indice_camara=0, ancho=1280, alto=720, esquinas_mesa=None, ancho_salida=800, alto_salida=600):
        """
        Inicializa la cámara y calcula la matriz de homografía.
        
        Parámetros:
            indice_camara (int): Índice de dispositivo de la webcam (usualmente 0).
            ancho (int): Ancho de captura deseado.
            alto (int): Alto de captura deseado.
            esquinas_mesa (list): Coordenadas de los 4 puntos [superior-izq, superior-der, inferior-der, inferior-izq].
            ancho_salida (int): Ancho del lienzo aplanado en píxeles.
            alto_salida (int): Alto del lienzo aplanado en píxeles.
        """
        self.indice = indice_camara
        self.ancho = ancho
        self.alto = alto
        self.ancho_salida = ancho_salida
        self.alto_salida = alto_salida
        
        # Puntos de destino para la vista aplanada (rectángulo perfecto)
        self.puntos_destino = np.array([
            [0, 0],
            [self.ancho_salida - 1, 0],
            [self.ancho_salida - 1, self.alto_salida - 1],
            [0, self.alto_salida - 1]
        ], dtype=np.float32)
        
        # Establecer esquinas por defecto si no se especifican
        if esquinas_mesa is None or len(esquinas_mesa) != 4:
            self.esquinas_mesa = np.array([
                [0, 0],
                [self.ancho - 1, 0],
                [self.ancho - 1, self.alto - 1],
                [0, self.alto - 1]
            ], dtype=np.float32)
        else:
            self.esquinas_mesa = np.array(esquinas_mesa, dtype=np.float32)
            
        # Calcular matriz de transformación de perspectiva (Homografía)
        self.matriz_homografia = cv2.getPerspectiveTransform(self.esquinas_mesa, self.puntos_destino)
        
        # Inicializar dispositivo de captura OpenCV
        self.cap = cv2.VideoCapture(self.indice, cv2.CAP_DSHOW) # CAP_DSHOW acelera la apertura en Windows
        if not self.cap.isOpened():
            # Intentar sin DSHOW si falla
            self.cap = cv2.VideoCapture(self.indice)
            
        if self.cap.isOpened():
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.ancho)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.alto)
            logger.info(f"Cámara abierta exitosamente en índice {self.indice} ({self.ancho}x{self.alto})")
        else:
            logger.warning(f"No se pudo acceder a la cámara física en índice {self.indice}. Se usará modo sintético de prueba.")

    def actualizar_esquinas(self, nuevas_esquinas):
        """
        Actualiza los 4 puntos de calibración y recalcula la homografía.
        """
        self.esquinas_mesa = np.array(nuevas_esquinas, dtype=np.float32)
        self.matriz_homografia = cv2.getPerspectiveTransform(self.esquinas_mesa, self.puntos_destino)
        logger.info("Matriz de homografía recalculada con nuevos puntos de calibración.")

    def leer_frame(self):
        """
        Captura un fotograma y devuelve:
            (ret, frame_original, frame_aplanado)
        """
        if self.cap is not None and self.cap.isOpened():
            ret, frame = self.cap.read()
            if not ret or frame is None:
                frame = self._generar_frame_sintetico()
                ret = True
        else:
            frame = self._generar_frame_sintetico()
            ret = True

        # Aplicar corrección de perspectiva usando la matriz de homografía calculada
        frame_aplanado = cv2.warpPerspective(frame, self.matriz_homografia, (self.ancho_salida, self.alto_salida))
        
        return ret, frame, frame_aplanado

    def _generar_frame_sintetico(self):
        """
        Genera un fotograma sintético cuando no hay cámara física conectada,
        para permitir pruebas de software y desarrollo sin hardware.
        """
        lienzo = np.ones((self.alto, self.ancho, 3), dtype=np.uint8) * 40
        # Dibujar una cuadrícula tenue
        for x in range(0, self.ancho, 80):
            cv2.line(lienzo, (x, 0), (x, self.alto), (60, 60, 60), 1)
        for y in range(0, self.alto, 80):
            cv2.line(lienzo, (0, y), (self.ancho, y), (60, 60, 60), 1)
            
        cv2.putText(lienzo, "MODO DE PRUEBA: SIN CAMARA FISICA", (50, 100), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 200, 255), 2)
        cv2.putText(lienzo, "Conecta una webcam o ajusta camera_index en config.json", (50, 140), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)
        return lienzo

    def liberar(self):
        """
        Libera el recurso de la cámara.
        """
        if self.cap is not None and self.cap.isOpened():
            self.cap.release()
            logger.info("Recurso de cámara liberado.")
