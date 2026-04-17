import os
import sys
from PIL import Image
from pathlib import Path

def convert_to_webp(directory, quality=80, lossless_patterns=None):
    """
    Recorre el directorio buscando .png, .jpg, .jpeg y los convierte a .webp.
    - lossless_patterns: lista de strings. Si el path contiene alguno, usa modo lossless.
    """
    if lossless_patterns is None:
        lossless_patterns = ['sprites', 'icons', 'badges', 'items']
    
    converted_count = 0
    skipped_count = 0
    errors = []

    # Extensiones a buscar
    target_exts = {'.png', '.jpg', '.jpeg'}

    for root, dirs, files in os.walk(directory):
        for file in files:
            file_path = Path(root) / file
            if file_path.suffix.lower() in target_exts:
                output_path = file_path.with_suffix('.webp')
                
                # Decidir si usar lossless (Pixel Art) o lossy (Visuales complejos)
                is_lossless = any(pattern in str(file_path).lower() for pattern in lossless_patterns)
                
                try:
                    with Image.open(file_path) as img:
                        if is_lossless:
                            img.save(output_path, 'WEBP', lossless=True)
                        else:
                            img.save(output_path, 'WEBP', quality=quality, method=6)
                    
                    # Eliminar el original tras conversión exitosa
                    os.remove(file_path)
                    print(f"✅ Converted: {file_path.name} -> {output_path.name} ({'Lossless' if is_lossless else 'Lossy'})")
                    converted_count += 1
                except Exception as e:
                    print(f"❌ Error converting {file_path}: {e}")
                    errors.append(f"{file_path}: {e}")
            elif file_path.suffix.lower() == '.webp':
                skipped_count += 1

    return converted_count, skipped_count, errors

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 convert_to_webp.py <directory>")
        sys.exit(1)
    
    target_dir = sys.argv[1]
    if not os.path.exists(target_dir):
        print(f"Error: Directory {target_dir} not found.")
        sys.exit(1)

    print(f"🚀 Iniciando conversión a WebP en: {target_dir}")
    c, s, e = convert_to_webp(target_dir)
    print("\n--- RESUMEN ---")
    print(f"Convertidos: {c}")
    print(f"Ya eran WebP: {s}")
    print(f"Errores: {len(e)}")
    if e:
        print("\nDetalle de errores:")
        for err in e:
            print(f" - {err}")
