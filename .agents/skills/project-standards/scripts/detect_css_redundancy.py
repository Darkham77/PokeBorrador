import os
import re
import sys
from collections import defaultdict

# Configuración
SEARCH_PATH = 'src'
EXTENSIONS = ('.scss', '.vue', '.css')
# Regex para encontrar selectores de clase simples (ej: .map-card, .btn-primary)
# Ignora selectores anidados complejos para evitar falsos positivos masivos,
# enfocándose en redefiniciones de bloques raíz.
CLASS_PATTERN = re.compile(r'^\s*\.([a-zA-Z0-9\-_]+)\s*\{', re.MULTILINE)

def audit_css_redundancy():
    class_map = defaultdict(list)
    
    for root, _, files in os.walk(SEARCH_PATH):
        for file in files:
            if file.endswith(EXTENSIONS):
                full_path = os.path.join(root, file)
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                        # Si es .vue, solo procesamos lo que esté dentro de <style>
                        if file.endswith('.vue'):
                            style_blocks = re.findall(r'<style.*?> (.*?) </style>', content, re.DOTALL | re.IGNORECASE)
                            content = "\n".join(style_blocks)
                        
                        matches = CLASS_PATTERN.finditer(content)
                        for match in matches:
                            class_name = match.group(1)
                            line_num = content.count('\n', 0, match.start()) + 1
                            class_map[class_name].append({
                                'file': full_path,
                                'line': line_num
                            })
                except Exception as e:
                    print(f"[ERROR] No se pudo leer {full_path}: {e}")

    # Filtrar solo las que tienen más de una definición
    redundancies = {k: v for k, v in class_map.items() if len(v) > 1}
    
    if not redundancies:
        print("\n✅ No se detectaron redefiniciones de clases críticas.")
        return 0

    print("\n⚠️ [AUDITORÍA DE REDUNDANCIA CSS] ⚠️")
    print("| Clase | Archivo | Línea |")
    print("| :--- | :--- | :--- |")
    
    for class_name, locations in sorted(redundancies.items()):
        for i, loc in enumerate(locations):
            # Formato optimizado para lectura de IA y humanos
            name_display = f"**{class_name}**" if i == 0 else ""
            print(f"| {name_display} | {loc['file']} | {loc['line']} |")
            
    print(f"\nSe encontraron {len(redundancies)} clases con definiciones múltiples.")
    return 1

if __name__ == "__main__":
    sys.exit(audit_css_redundancy())
