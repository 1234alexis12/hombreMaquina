"""
=============================================================================
PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
Controlador de Emulación de Teclado en el Sistema Operativo
=============================================================================
Este módulo se encarga de convertir los disparos confirmados por visión
artificial en pulsaciones físicas de teclado reconocidas por Windows/OS.
=============================================================================
"""

import threading
import logging
from pynput.keyboard import Controller, Key

# Configuración básica de logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("KeyboardController")

class TecladoVirtual:
    """
    Gestiona la pulsación y liberación de teclas del sistema operativo
    utilizando pynput de manera no bloqueante.
    """
    
    def __init__(self):
        # 1. Inicializar el controlador nativo de teclado de pynput
        self.controlador = Controller()
        
        # 2. Diccionario de mapeo para teclas especiales comunes
        self.mapa_teclas_especiales = {
            "space": Key.space,
            "espacio": Key.space,
            "enter": Key.enter,
            "intro": Key.enter,
            "tab": Key.tab,
            "backspace": Key.backspace,
            "esc": Key.esc,
            "escape": Key.esc,
            "left": Key.left,
            "izq": Key.left,
            "izquierda": Key.left,
            "right": Key.right,
            "der": Key.right,
            "derecha": Key.right,
            "up": Key.up,
            "arriba": Key.up,
            "down": Key.down,
            "abajo": Key.down,
        }
        logger.info("Controlador de teclado inicializado correctamente.")

    def presionar_tecla(self, nombre_tecla: str):
        """
        Ejecuta la pulsación de una tecla en un hilo separado (no bloqueante).
        
        Parámetros:
            nombre_tecla (str): Identificador de la tecla (ej. 'space', 'enter', 'a', 'left').
        """
        hilo = threading.Thread(target=self._ejecutar_pulsacion, args=(nombre_tecla,), daemon=True)
        hilo.start()

    def _ejecutar_pulsacion(self, nombre_tecla: str):
        """
        Lógica interna que presiona y libera la tecla a nivel de SO.
        """
        tecla_limpia = str(nombre_tecla).strip().lower()
        tecla_a_presionar = self.mapa_teclas_especiales.get(tecla_limpia, None)
        
        try:
            if tecla_a_presionar is not None:
                # Caso: Tecla especial (Space, Enter, Flechas, etc.)
                self.controlador.press(tecla_a_presionar)
                self.controlador.release(tecla_a_presionar)
            elif len(tecla_limpia) == 1:
                # Caso: Carácter alfanumérico individual ('a', 'b', '1', etc.)
                self.controlador.press(tecla_limpia)
                self.controlador.release(tecla_limpia)
            else:
                # Caso: Secuencia no mapeada, intentar como texto
                self.controlador.type(tecla_limpia)
                
            logger.info(f"[TECLA EMULADA] Pulsación exitosa: '{nombre_tecla}'")
        except Exception as e:
            logger.error(f"[ERROR TECLADO] No se pudo presionar '{nombre_tecla}': {e}")

# Instancia global reutilizable
teclado = TecladoVirtual()
