"""
=============================================================================
PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
Herramienta Interactiva de Calibración de Mesa (Homografía de 4 Puntos)
=============================================================================
Este script permite hacer clic sobre las 4 esquinas del área de trabajo
en la mesa física. Calcula la matriz de homografía para corregir la perspectiva
y guarda la calibración en 'config.json'.

Instrucciones de uso:
1. Ejecuta: python calibration.py
2. Haz clic en las 4 esquinas de tu mesa en este orden:
   [1] Esquina Superior Izquierda
   [2] Esquina Superior Derecha
   [3] Esquina Inferior Derecha
   [4] Esquina Inferior Izquierda
3. Presiona 'S' para guardar en config.json.
4. Presiona 'R' para reiniciar puntos si te equivocaste.
5. Presiona 'Q' para salir.
=============================================================================
"""

import os
import json
import cv2
import numpy as np

# Ruta al archivo de configuración
RUTA_CONFIG = os.path.join(os.path.dirname(__file__), "config.json")

# Lista global para almacenar los puntos seleccionados por el usuario
puntos_seleccionados = []

def manejar_clic_mouse(evento, x, y, flags, param):
    """
    Captura los clics del mouse para registrar las 4 esquinas de la mesa.
    """
    global puntos_seleccionados
    if evento == cv2.EVENT_LBUTTONDOWN:
        if len(puntos_seleccionados) < 4:
            puntos_seleccionados.append([x, y])
            print(f"[CLIC] Punto {len(puntos_seleccionados)}: ({x}, {y})")

def cargar_configuracion():
    """Carga los parámetros actuales desde config.json"""
    if os.path.exists(RUTA_CONFIG):
        with open(RUTA_CONFIG, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def guardar_configuracion(config):
    """Guarda la configuración actualizada con las nuevas esquinas de la mesa"""
    with open(RUTA_CONFIG, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    print(f"\n[ÉXITO] Calibración guardada exitosamente en: {RUTA_CONFIG}")

def ejecutar_calibrador():
    global puntos_seleccionados
    config = cargar_configuracion()
    cam_cfg = config.get("camera", {})
    
    fuente_camara = cam_cfg.get("source", cam_cfg.get("index", 0))
    if isinstance(fuente_camara, str) and fuente_camara.strip().isdigit():
        fuente_camara = int(fuente_camara.strip())
        
    ancho_cam = cam_cfg.get("width", 1280)
    alto_cam = cam_cfg.get("height", 720)
    ancho_warp = cam_cfg.get("warped_width", 800)
    alto_warp = cam_cfg.get("warped_height", 600)
    
    # Iniciar captura de video (soporta índice numérico o URL de celular)
    if isinstance(fuente_camara, int):
        cap = cv2.VideoCapture(fuente_camara, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap = cv2.VideoCapture(fuente_camara)
    else:
        cap = cv2.VideoCapture(fuente_camara)
        
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, ancho_cam)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, alto_cam)
    
    nombre_ventana = "TUI-A: Calibracion de Mesa (Presiona 'S' para Guardar, 'R' Reiniciar, 'Q' Salir)"
    cv2.namedWindow(nombre_ventana)
    cv2.setMouseCallback(nombre_ventana, manejar_clic_mouse)
    
    # Cargar esquinas previas si existen
    esquinas_guardadas = cam_cfg.get("desk_corners", [])
    if len(esquinas_guardadas) == 4:
        puntos_seleccionados = [list(pt) for pt in esquinas_guardadas]

    puntos_destino = np.array([
        [0, 0],
        [ancho_warp - 1, 0],
        [ancho_warp - 1, alto_warp - 1],
        [0, alto_warp - 1]
    ], dtype=np.float32)

    print("\n" + "="*70)
    print(" INICIANDO CALIBRADOR INTERACTIVO DE MESA")
    print("="*70)
    print(" Haz clic en las 4 esquinas de tu mesa (Sup-Izq, Sup-Der, Inf-Der, Inf-Izq)")
    print(" Presiona 'S' para GUARDAR y 'Q' para SALIR.")
    print("="*70 + "\n")

    while True:
        ret, frame = cap.read()
        if not ret or frame is None:
            # Fotograma simulado si no hay cámara
            frame = np.ones((alto_cam, ancho_cam, 3), dtype=np.uint8) * 40
            cv2.putText(frame, "Cámara no disponible. Simulación activa.", (50, 100),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 200, 255), 2)
            
        lienzo = frame.copy()
        
        # 1. Dibujar los puntos seleccionados y líneas de conexión
        for i, pt in enumerate(puntos_seleccionados):
            cv2.circle(lienzo, tuple(pt), 7, (0, 0, 255), -1)
            cv2.putText(lienzo, f"P{i+1}", (pt[0] + 10, pt[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                        
        if len(puntos_seleccionados) == 4:
            pts_poligono = np.array(puntos_seleccionados, dtype=np.int32).reshape((-1, 1, 2))
            cv2.polylines(lienzo, [pts_poligono], isClosed=True, color=(0, 255, 0), thickness=2)
            
            # Calcular y mostrar la vista aplanada en tiempo real
            pts_origen = np.array(puntos_seleccionados, dtype=np.float32)
            matriz = cv2.getPerspectiveTransform(pts_origen, puntos_destino)
            vista_aplanada = cv2.warpPerspective(frame, matriz, (ancho_warp, alto_warp))
            cv2.imshow("TUI-A: Vista Aplanada (Mesa Corregida)", vista_aplanada)

        # Instrucciones en pantalla
        cv2.putText(lienzo, f"Puntos seleccionados: {len(puntos_seleccionados)}/4", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(lienzo, "[S] Guardar  [R] Reiniciar  [Q] Salir", (20, 80),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        cv2.imshow(nombre_ventana, lienzo)
        
        tecla = cv2.waitKey(20) & 0xFF
        if tecla == ord('q') or tecla == 27: # Q o ESC
            break
        elif tecla == ord('r'): # R para reiniciar
            puntos_seleccionados = []
            print("[INFO] Puntos reiniciados. Vuelve a hacer clic en las 4 esquinas.")
        elif tecla == ord('s'): # S para guardar
            if len(puntos_seleccionados) == 4:
                config["camera"]["desk_corners"] = puntos_seleccionados
                guardar_configuracion(config)
                break
            else:
                print("[AVISO] Debes seleccionar exactamente 4 esquinas antes de guardar.")

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    ejecutar_calibrador()
