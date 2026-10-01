"""
=============================================================================
PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
Generador de Marcadores ArUco Imprimibles
=============================================================================
Este script genera imágenes PNG de marcadores ArUco listas para imprimir
y pegar sobre bloques de madera, cartón o plástico.
=============================================================================
"""

import os
import cv2
import numpy as np

def generar_marcadores_aruco(cantidad=4, tamano_px=600):
    """
    Genera y guarda marcadores ArUco del diccionario DICT_4X4_50.
    
    Parámetros:
        cantidad (int): Número de marcadores a generar (IDs del 0 al cantidad-1).
        tamano_px (int): Dimensión en píxeles del marcador cuadrado.
    """
    # 1. Definir carpeta de salida para las imágenes generadas
    carpeta_salida = os.path.join(os.path.dirname(__file__), "markers")
    os.makedirs(carpeta_salida, exist_ok=True)
    
    # 2. Seleccionar el diccionario de ArUco (4x4 con 50 combinaciones posibles)
    # Los marcadores 4x4 son ideales porque tienen patrones simples fáciles de detectar
    # incluso a distancia o con baja resolución de cámara (720p).
    if hasattr(cv2.aruco, 'getPredefinedDictionary'):
        diccionario = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    else:
        diccionario = cv2.aruco.Dictionary_get(cv2.aruco.DICT_4X4_50)
        
    print(f"[INFO] Generando {cantidad} marcadores ArUco en la carpeta: {carpeta_salida}")
    
    # Mapeo sugerido de teclas para cada ID de marcador
    sugerencias_teclas = {
        0: "TECLA 1 (Espacio)",
        1: "TECLA 2 (Enter)",
        2: "TECLA 3 (Flecha Izq)",
        3: "TECLA 4 (Flecha Der)"
    }
    
    # 3. Iterar y crear cada marcador
    for marker_id in range(cantidad):
        # Crear imagen base del marcador ArUco
        if hasattr(cv2.aruco, 'generateImageMarker'):
            img_marker = cv2.aruco.generateImageMarker(diccionario, marker_id, tamano_px, 1)
        else:
            img_marker = cv2.aruco.drawMarker(diccionario, marker_id, tamano_px)
            
        # Convertir a imagen BGR de 3 canales para poder agregar bordes y texto en color
        img_bgr = cv2.cvtColor(img_marker, cv2.COLOR_GRAY2BGR)
        
        # Agregar un margen blanco alrededor para asegurar alto contraste al imprimir
        margen = 80
        alto_pie = 70
        alto_total = tamano_px + (margen * 2) + alto_pie
        ancho_total = tamano_px + (margen * 2)
        
        lienzo = np.ones((alto_total, ancho_total, 3), dtype=np.uint8) * 255
        
        # Insertar el marcador centrado en el lienzo blanco
        lienzo[margen:margen + tamano_px, margen:margen + tamano_px] = img_bgr
        
        # Dibujar una línea guía para recortar con tijera
        cv2.rectangle(lienzo, (margen - 5, margen - 5), 
                      (margen + tamano_px + 5, margen + tamano_px + 5), (180, 180, 180), 2)
        
        # Agregar texto identificador y sugerencia de función
        texto_id = f"TUI-A | ArUco ID: {marker_id}"
        texto_tecla = sugerencias_teclas.get(marker_id, f"TECLA {marker_id + 1}")
        
        cv2.putText(lienzo, texto_id, (margen, margen + tamano_px + 35), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2, cv2.LINE_AA)
        cv2.putText(lienzo, texto_tecla, (margen, margen + tamano_px + 65), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (60, 60, 60), 2, cv2.LINE_AA)
        
        # Guardar archivo PNG de alta resolución
        nombre_archivo = os.path.join(carpeta_salida, f"aruco_id_{marker_id}.png")
        cv2.imwrite(nombre_archivo, lienzo)
        print(f" -> Creado: {nombre_archivo} ({texto_tecla})")
        
    print("\n[ÉXITO] Marcadores listos. Imprímelos y pégalos sobre cubos o bloques planos.")

if __name__ == "__main__":
    generar_marcadores_aruco()
