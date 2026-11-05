"""
=============================================================================
PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
Controlador de Emulación de Teclado en el Sistema Operativo (Windows Nativo)
=============================================================================
Este módulo convierte los disparos confirmados por visión artificial en pulsaciones
físicas reales en el Sistema Operativo Windows usando inyección nativa dual:
1) user32.keybd_event con Scan Code de hardware real (MapVirtualKeyA)
2) Controlador pynput de bajo nivel
Garantiza que la tecla se mantenga durante 65ms para que Windows, navegadores,
juegos, Bloc de notas y formularios reconozcan la acción como pulsación humana real.
=============================================================================
"""

import sys
import time
import threading
import logging

logger = logging.getLogger("KeyboardController")

# Mapeo de códigos de teclas virtuales nativas de Windows (Virtual-Key Codes)
VK_MAP = {
    "space": 0x20,
    "espacio": 0x20,
    "enter": 0x0D,
    "intro": 0x0D,
    "return": 0x0D,
    "esc": 0x1B,
    "escape": 0x1B,
    "tab": 0x09,
    "tabulador": 0x09,
    "backspace": 0x08,
    "retroceso": 0x08,
    "delete": 0x2E,
    "supr": 0x2E,
    "up": 0x26,
    "arriba": 0x26,
    "down": 0x28,
    "abajo": 0x28,
    "left": 0x25,
    "izq": 0x25,
    "right": 0x27,
    "der": 0x27,
    "pagedown": 0x22,
    "pageup": 0x21,
    "avpag": 0x22,
    "repag": 0x21,
}

# 1. Preparar API nativa de Windows (user32.dll)
ES_WINDOWS = sys.platform == "win32"
user32 = None
if ES_WINDOWS:
    try:
        import ctypes
        user32 = ctypes.windll.user32
        KEYEVENTF_KEYUP = 0x0002
    except Exception as e:
        logger.warning(f"No se pudo cargar user32.dll: {e}")

# 2. Respaldo pynput
try:
    from pynput.keyboard import Controller as PynputController, Key as PynputKey
    pynput_ctrl = PynputController()
    MAPA_PYNPUT = {
        "space": PynputKey.space,
        "espacio": PynputKey.space,
        "enter": PynputKey.enter,
        "intro": PynputKey.enter,
        "return": PynputKey.enter,
        "esc": PynputKey.esc,
        "escape": PynputKey.esc,
        "tab": PynputKey.tab,
        "backspace": PynputKey.backspace,
        "delete": PynputKey.delete,
        "up": PynputKey.up,
        "down": PynputKey.down,
        "left": PynputKey.left,
        "right": PynputKey.right,
        "page_up": PynputKey.page_up,
        "page_down": PynputKey.page_down,
    }
except Exception:
    pynput_ctrl = None
    MAPA_PYNPUT = {}

# 3. Respaldo PyAutoGUI
try:
    import pyautogui
    pyautogui.FAILSAFE = False
except Exception:
    pass

class TecladoVirtual:
    """
    Gestiona la pulsación y liberación de teclas del sistema operativo
    utilizando inyección nativa de Windows no bloqueante.
    """

    def __init__(self):
        logger.info("Controlador de teclado nativo Windows (user32 + pynput) inicializado.")

    def presionar_tecla(self, nombre_tecla: str):
        """
        Ejecuta la pulsación en un hilo separado para no demorar el bucle de visión.
        """
        hilo = threading.Thread(target=self._ejecutar_pulsacion, args=(nombre_tecla,), daemon=True)
        hilo.start()

    def _ejecutar_pulsacion(self, nombre_tecla: str):
        tecla_limpia = str(nombre_tecla).strip().lower()
        exito = False

        # Inyección dual de alta fiabilidad en Windows:
        # 1. user32 con Virtual Key Code y Scan Code mapeado por hardware
        if user32 is not None:
            vk_code = VK_MAP.get(tecla_limpia, None)
            if vk_code is None and len(tecla_limpia) == 1:
                vk_code = ord(tecla_limpia.upper())
                
            if vk_code is not None:
                try:
                    scan_code = user32.MapVirtualKeyA(vk_code, 0)
                    user32.keybd_event(vk_code, scan_code, 0, 0) # Key DOWN
                    time.sleep(0.065)                             # Mantener 65ms
                    user32.keybd_event(vk_code, scan_code, KEYEVENTF_KEYUP, 0) # Key UP
                    exito = True
                    logger.info(f"[TECLA EMULADA] user32 inyectó: '{nombre_tecla}' (VK: {hex(vk_code)}, Scan: {hex(scan_code)})")
                except Exception as e:
                    logger.warning(f"Fallo en user32 keybd_event: {e}")

        # 2. Inyección paralela vía pynput para aplicaciones que leen raw input
        if pynput_ctrl is not None:
            try:
                tecla_pynput = MAPA_PYNPUT.get(tecla_limpia, None)
                if tecla_pynput is not None:
                    pynput_ctrl.press(tecla_pynput)
                    time.sleep(0.04)
                    pynput_ctrl.release(tecla_pynput)
                    exito = True
                elif len(tecla_limpia) == 1:
                    pynput_ctrl.press(tecla_limpia)
                    time.sleep(0.04)
                    pynput_ctrl.release(tecla_limpia)
                    exito = True
                else:
                    pynput_ctrl.type(tecla_limpia)
                    exito = True
                logger.info(f"[TECLA EMULADA] pynput sincronizó: '{nombre_tecla}'")
            except Exception as e:
                logger.warning(f"Fallo en pynput: {e}")

        # 3. Fallback PyAutoGUI
        if not exito:
            try:
                pyautogui.press(tecla_limpia)
                exito = True
                logger.info(f"[TECLA EMULADA] pyautogui inyectó: '{nombre_tecla}'")
            except Exception as e:
                logger.error(f"[ERROR CRÍTICO] No se pudo emular la tecla '{nombre_tecla}': {e}")

# Instancia global reutilizable
teclado = TecladoVirtual()
