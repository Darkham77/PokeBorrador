import re
import sys
from pathlib import Path

# Script to detect legacy viewport units (vw/vh).
# Project Standards mandate the use of Dynamic Viewport units (dvw/dvh)
# to ensure correct rendering on mobile devices with dynamic toolbars.

IGNORE_DIRS = {'node_modules', '.git', 'dist', 'backup_legacy_code', 'public'}
EXTENSIONS = {'.vue', '.scss', '.css'}

# Regex to find numbers followed by vw or vh, ensuring they aren't dvw or dvh.
# \b ensures we start at a word boundary (like the start of a number).
# \d+(?:\.\d+)? matches the numeric value.
# (vw|vh) matches the unit.
# \b at the end ensures no trailing characters.
VIEWPORT_UNIT_REGEX = r'\b\d+(?:\.\d+)?(vw|vh)\b'

def scan_file(filepath: Path, fix: bool = False):
    violations = []
    try:
        content = filepath.read_text(encoding='utf-8')
        
        matches = list(re.finditer(VIEWPORT_UNIT_REGEX, content, re.IGNORECASE | re.MULTILINE))
        if not matches:
            return []

        if fix:
            # Automatic replacement: replace vw with dvw and vh with dvh
            # We use a lambda to handle the replacement logic based on the matched unit
            new_content = re.sub(
                VIEWPORT_UNIT_REGEX,
                lambda m: f"{m.group(0)[:-2]}d{m.group(1).lower()}",
                content,
                flags=re.IGNORECASE | re.MULTILINE
            )
            if new_content != content:
                filepath.write_text(new_content, encoding='utf-8')
                print(f"✅ Fixed legacy units in: {filepath}")
                return [] # No violations left after fixing

        for match in matches:
            line_no = content.count('\n', 0, match.start()) + 1
            unit = match.group(1).lower()
            suggested = f"d{unit}"
            
            violations.append({
                'file': str(filepath),
                'line': line_no,
                'context': match.group(0).strip(),
                'message': f"Legacy Viewport Unit Detected: '{unit}' found. Use '{suggested}' instead for dynamic mobile toolbar support."
            })
    except Exception as e:
        print(f"Error reading/writing {filepath}: {e}")
    return violations

def main(root_dir, fix=False):
    all_violations = []
    root_path = Path(root_dir)
    
    for filepath in root_path.rglob("*"):
        if not filepath.is_file() or filepath.suffix not in EXTENSIONS:
            continue
            
        if any(part in IGNORE_DIRS for part in filepath.parts):
            continue
            
        all_violations.extend(scan_file(filepath, fix))

    if fix:
        print("\n✨ Automatic fix completed!")
        return

    if not all_violations:
        print("✅ No legacy viewport units (vw/vh) detected!")
        return

    print(f"Found {len(all_violations)} legacy viewport unit violations:\n")
    for violation in all_violations:
        print(f"[!] {violation['file']}:{violation['line']}")
        print(f"    Reason: {violation['message']}")
        print(f"    Context: {violation['context']}")
        print("-" * 40)
    
    print("\n💡 Run with --fix to automatically migrate these units.")

if __name__ == "__main__":
    fix_mode = "--fix" in sys.argv
    args = [a for a in sys.argv if a != "--fix"]
    target = args[1] if len(args) > 1 else "."
    main(target, fix_mode)
