import re
import sys
from pathlib import Path

# Script to detect the "Quad Drop-Shadow Outline" anti-pattern.
# This pattern uses 4+ drop-shadows to simulate an outline, which is expensive.
# Recommended fix: Use SVG feMorphology (dilate) via PVSpriteFX or similar.

IGNORE_DIRS = {'node_modules', '.git', 'dist', 'backup_legacy_code', 'public'}
EXTENSIONS = {'.vue', '.scss'}

# Regex to find 4 or more drop-shadow calls in a single filter property.
# Usually: drop-shadow(1px 0 0 white) drop-shadow(-1px 0 0 white) ...
OUTLINE_TRAP_REGEX = r'(Drop-Shadow\s*\(\s*[^,)]+[^)]+\)\s*){4,}'

def scan_file(filepath: Path):
    traps = []
    try:
        content = filepath.read_text(encoding='utf-8')
        
        matches = re.finditer(OUTLINE_TRAP_REGEX, content, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            line_no = content.count('\n', 0, match.start()) + 1
            
            traps.append({
                'file': str(filepath),
                'line': line_no,
                'context': match.group(0).strip(),
                'message': 'Expensive Outline Detected: 4+ Drop-Shadows found. Use SVG feMorphology (dilate) for 1-pass outlines.'
            })
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    return traps

def main(root_dir):
    all_traps = []
    root_path = Path(root_dir)
    
    for filepath in root_path.rglob("*"):
        if not filepath.is_file() or filepath.suffix not in EXTENSIONS:
            continue
            
        if any(part in IGNORE_DIRS for part in filepath.parts):
            continue
            
        all_traps.extend(scan_file(filepath))

    if not all_traps:
        print("No expensive outline anti-patterns detected!")
        return

    print(f"Found {len(all_traps)} potential outline anti-patterns:\n")
    for trap in all_traps:
        print(f"[!] {trap['file']}:{trap['line']}")
        print(f"    Reason: {trap['message']}")
        print(f"    Context: {trap['context'][:150]}...")
        print("-" * 40)

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    main(target)
