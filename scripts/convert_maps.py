"""
Script para procesar mapas del juego.
Recorta un margen lateral derecho y redimensiona usando LANCZOS para preservar la calidad del pixel art.
"""

import os
import argparse
from PIL import Image

# Configuración por defecto (Mapas originales)
DEFAULT_DIR = r"c:\Users\Franco\Trabajos\Juegos\PokeBorrador\_raw-assets\original\public\assets\maps"
DEFAULT_CROP_RIGHT = 81
DEFAULT_TARGET_WIDTH = 1000

def process_maps(directory, crop_right, target_width):
    """
    Recorre las imágenes en el directorio, las recorta y las redimensiona.
    """
    directory = os.path.abspath(directory)
    
    if not os.path.exists(directory):
        print(f"❌ Error: La carpeta no existe: {directory}")
        return

    # Extensiones permitidas
    extensions = (".png", ".jpg", ".jpeg", ".webp")
    files = [f for f in os.listdir(directory) if f.lower().endswith(extensions)]

    if not files:
        print(f"⚠️ No se encontraron imágenes en: {directory}")
        return

    print(f"🚀 Iniciando procesamiento de {len(files)} imágenes...")
    print(f"   Carpeta: {directory}")
    print(f"   Configuración: Recorte derecho={crop_right}px, Ancho objetivo={target_width}px")
    print(f"   Algoritmo: LANCZOS (Máxima calidad)")

    count = 0
    for filename in files:
        path = os.path.join(directory, filename)
        try:
            with Image.open(path) as img:
                # 1. Recorte derecho
                w, h = img.size
                if w <= crop_right:
                    print(f"   ⏩ Saltando {filename}: Ancho insuficiente ({w}px)")
                    continue

                # Recortar: (izquierda, arriba, derecha, abajo)
                # El 'derecha' del crop es el ancho deseado, por lo que width - crop_right
                cropped_img = img.crop((0, 0, w - crop_right, h))

                # 2. Reducción manteniendo relación de aspecto
                cw, ch = cropped_img.size
                ratio = target_width / cw
                target_height = int(ch * ratio)

                # Resampling.LANCZOS es el estándar de oro para reducciones de alta calidad.
                resized_img = cropped_img.resize(
                    (target_width, target_height), 
                    resample=Image.Resampling.LANCZOS
                )

                # 3. Sobreescribir
                # Mantenemos el formato original
                resized_img.save(path, quality=95, optimize=True)
                count += 1
                print(f"   ✅ {filename} -> {target_width}x{target_height}")

        except Exception as e:
            print(f"   ❌ Error en {filename}: {e}")

    print(f"\n✨ Proceso finalizado. Se actualizaron {count} archivos.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Procesador de mapas para Poke Vicio.")
    parser.add_argument("--dir", default=DEFAULT_DIR, help="Ruta de la carpeta de mapas")
    parser.add_argument("--crop", type=int, default=DEFAULT_CROP_RIGHT, help="Pixeles a recortar de la derecha")
    parser.add_argument("--width", type=int, default=DEFAULT_TARGET_WIDTH, help="Ancho final deseado")

    args = parser.parse_args()
    process_maps(args.dir, args.crop, args.width)
