"""
=============================================================================
PROYECTO TUI-A: Interfaz de Escritorio Tangible Accesible
Controlador de Emulación de Teclado en el Sistema Operativo (Windows Nativo)
=============================================================================
Este módulo convierte los disparos confirmados por visión artificial en pulsaciones
físicas reales en el Sistema Operativo Windows.

CARACTERÍSTICAS TÉCNICAS:
1) Enlace dinámico al escritorio interactivo de usuario (Desktop 'default') para
   garantizar que los procesos en segundo plano inyecten eventos en la sesión gráfica.
2) Inyección de bajo nivel mediante la API oficial Windows SendInput y user32.keybd_event
   con mapeo de hardware Scan Code (MapVirtualKeyA).
3) Respaldo no bloqueante multihilo con registro de la ventana activa en primer plano.
=============================================================================
"""

import sys
import time
import threading
import logging
import ctypes
from ctypes import wintypes

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

ES_WINDOWS = sys.platform == "win32"
user32 = None

if ES_WINDOWS:
    try:
        user32 = ctypes.windll.user32
    except Exception as e:
        logger.warning(f"No se pudo cargar user32.dll: {e}")

# Definición de estructuras de bajo nivel para SendInput en Windows (32 y 64 bits)
class KeyBdInput(ctypes.Structure):
    _fields_ = [
        ("wVk", wintypes.WORD),
        ("wScan", wintypes.WORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_size_t)
    ]

class HardwareInput(ctypes.Structure):
    _fields_ = [
        ("uMsg", wintypes.DWORD),
        ("wParamL", wintypes.WORD),
        ("wParamH", wintypes.WORD)
    ]

class MouseInput(ctypes.Structure):
    _fields_ = [
        ("dx", wintypes.LONG),
        ("dy", wintypes.LONG),
        ("mouseData", wintypes.DWORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_size_t)
    ]

class Input_I(ctypes.Union):
    _fields_ = [
        ("ki", KeyBdInput),
        ("mi", MouseInput),
        ("hi", HardwareInput)
    ]

class INPUT(ctypes.Structure):
    _fields_ = [
        ("type", wintypes.DWORD),
        ("ii", Input_I)
    ]

class TecladoVirtual:
    """
    Gestiona la pulsación y liberación de teclas del sistema operativo
    utilizando inyección nativa de Windows con enlace a la sesión gráfica del usuario.
    """

    def __init__(self):
        logger.info("Controlador de teclado nativo Windows (SendInput + user32) inicializado.")

    def _enlazar_escritorio_interactivo(self):
        """
        Enlaza el hilo actual al escritorio interactivo real del usuario ('default'),
        permitiendo que procesos en segundo plano o servicios inyecten teclas en la GUI.
        """
        if not ES_WINDOWS or user32 is None:
            return None
        try:
            DESKTOP_ALL = 0x01FF
            hDesk = user32.OpenDesktopW("default", 0, False, DESKTOP_ALL)
            if hDesk:
                user32.SetThreadDesktop(hDesk)
                return hDesk
        except Exception as e:
            logger.debug(f"Aviso al enlazar escritorio: {e}")
        return None

    def _obtener_titulo_ventana_activa(self):
        """Retorna el título de la ventana de Windows que tiene el foco en este momento."""
        if not ES_WINDOWS or user32 is None:
            return "Desconocido"
        try:
            hFore = user32.GetForegroundWindow()
            if hFore:
                length = user32.GetWindowTextLengthW(hFore)
                buff = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hFore, buff, length + 1)
                return buff.value or f"Ventana HWND:{hFore}"
        except Exception:
            pass
        return "Sin Foco / Escritorio"

    def presionar_tecla(self, nombre_tecla: str):
        """
        Ejecuta la pulsación en un hilo separado para no demorar el bucle de visión.
        """
        hilo = threading.Thread(target=self._ejecutar_pulsacion, args=(nombre_tecla,), daemon=True)
        hilo.start()

    def _ejecutar_pulsacion(self, nombre_tecla: str):
        tecla_limpia = str(nombre_tecla).strip().lower()

        # 1. Enlazar hilo al escritorio interactivo del usuario
        self._enlazar_escritorio_interactivo()
        ventana_destino = self._obtener_titulo_ventana_activa()

        # 2. Obtener código de tecla virtual (VK) y Scan Code
        vk_code = VK_MAP.get(tecla_limpia, None)
        if vk_code is None and len(tecla_limpia) == 1:
            vk_code = ord(tecla_limpia.upper())

        if vk_code is None:
            logger.warning(f"Tecla no reconocida para emulación: '{nombre_tecla}'")
            return

        scan_code = user32.MapVirtualKeyA(vk_code, 0) if user32 else 0
        exito = False

        # 3. Inyección primaria: SendInput (Estándar oficial de Windows)
        if user32 is not None:
            try:
                # Key DOWN vía SendInput
                inp_down = INPUT()
                inp_down.type = 1 # INPUT_KEYBOARD
                inp_down.ii.ki.wVk = vk_code
                inp_down.ii.ki.wScan = scan_code
                inp_down.ii.ki.dwFlags = 0
                inp_down.ii.ki.time = 0
                inp_down.ii.ki.dwExtraInfo = 0
                res_down = user32.SendInput(1, ctypes.byref(inp_down), ctypes.sizeof(INPUT))

                # Key DOWN dual vía keybd_event
                user32.keybd_event(vk_code, scan_code, 0, 0)

                # Mantener pulsada la tecla 65 milisegundos (duración natural de pulsación humana)
                time.sleep(0.065)

                # Key UP vía SendInput
                inp_up = INPUT()
                inp_up.type = 1
                inp_up.ii.ki.wVk = vk_code
                inp_up.ii.ki.wScan = scan_code
                inp_up.ii.ki.dwFlags = 2 # KEYEVENTF_KEYUP
                inp_up.ii.ki.time = 0
                inp_up.ii.ki.dwExtraInfo = 0
                res_up = user32.SendInput(1, ctypes.byref(inp_up), ctypes.sizeof(INPUT))

                # Key UP dual vía keybd_event
                user32.keybd_event(vk_code, scan_code, 2, 0)

                exito = True
                logger.info(
                    f"[TECLA EMULADA] '{nombre_tecla.upper()}' (VK:{hex(vk_code)}, Scan:{hex(scan_code)}) "
                    f"-> Entregada a ventana: '{ventana_destino}'"
                )
            except Exception as e:
                logger.error(f"Fallo en inyección Windows SendInput/keybd_event: {e}")

        # 4. Fallback pynput en caso extremo
        if not exito:
            try:
                from pynput.keyboard import Controller as PynputController, Key as PynputKey
                ctrl = PynputController()
                mapeo = {
                    "space": PynputKey.space,
                    "enter": PynputKey.enter,
                    "esc": PynputKey.esc,
                    "tab": PynputKey.tab,
                    "backspace": PynputKey.backspace
                }
                k = mapeo.get(tecla_limpia, tecla_limpia)
                ctrl.press(k)
                time.sleep(0.05)
                ctrl.release(k)
                logger.info(f"[TECLA EMULADA pynput] '{nombre_tecla}' -> '{ventana_destino}'")
            except Exception as e:
                logger.error(f"Fallo en pynput: {e}")

# Instancia global reutilizable
teclado = TecladoVirtual()
