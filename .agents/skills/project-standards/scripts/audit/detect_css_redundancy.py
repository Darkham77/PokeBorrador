import re
import sys
from pathlib import Path
from collections import defaultdict

# Configuración
SEARCH_PATH = 'src'
EXTENSIONS = {'.scss', '.vue', '.css'}
# Regex para encontrar selectores de clase simples (ej: .map-card, .btn-primary)
CLASS_PATTERN = re.compile(r'^\s*\.([a-zA-Z0-9\-_]+)\s*\{', re.MULTILINE)

def audit_css_redundancy():
    class_map = defaultdict(list)
    root_path = Path(SEARCH_PATH)
    
    if not root_path.exists():
        print(f"[ERROR] Path {SEARCH_PATH} does not exist.")
        return 1

    for filepath in root_path.rglob("*"):
        if filepath.is_file() and filepath.suffix in EXTENSIONS:
            try:
                content = filepath.read_text(encoding='utf-8')
                
                # Si es .vue, solo procesamos lo que esté dentro de <style>
                if filepath.suffix == '.vue':
                    style_blocks = re.findall(r'<style.*?> (.*?) </style>', content, re.DOTALL | re.IGNORECASE)
                    content = "\n".join(style_blocks)
                
                matches = CLASS_PATTERN.finditer(content)
                for match in matches:
                    class_name = match.group(1)
                    line_num = content.count('\n', 0, match.start()) + 1
                    class_map[class_name].append({
                        'file': str(filepath),
                        'line': line_num
                    })
            except Exception as e:
                print(f"[ERROR] No se pudo leer {filepath}: {e}")

    # Filtrar solo las que tienen más de una definición
    redundancies = {k: v for k, v in class_map.items() if len(v) > 1}
    
    if not redundancies:
        print("\n[OK] No se detectaron redefiniciones de clases críticas.")
        return 0

    print("\n[AUDIT: CSS REDUNDANCY]")
    print("| Clase | Archivo | Línea |")
    print("| :--- | :--- | :--- |")
    
    for class_name, locations in sorted(redundancies.items()):
        for i, loc in enumerate(locations):
            name_display = f"**{class_name}**" if i == 0 else ""
            print(f"| {name_display} | {loc['file']} | {loc['line']} |")
            
    print(f"\nFound {len(redundancies)} classes with multiple definitions.")
    return 1

if __name__ == "__main__":
    sys.exit(audit_css_redundancy())
