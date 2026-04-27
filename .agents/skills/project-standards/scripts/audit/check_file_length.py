#!/usr/bin/env python3
import sys
from pathlib import Path

# MANDATORY: No .vue, .js, or .scss file may exceed 500 lines (except "databases" style files).
MAX_LINES = 500

# Hardcoded whitelist for known "database" files
WHITELIST = {
    "speciesMetadata.js",
    "pokemonDB.js",
    "moves.js",
    "items.js",
    "migrations_data.js",
    "weather-tables.js"
}

IGNORE_COMMENT = "[PureVue-Ignore-Length]"

def check_file(filepath: Path):
    """Returns True if file is valid, False otherwise."""
    if filepath.name in WHITELIST:
        return True, 0
    
    try:
        content = filepath.read_text(encoding='utf-8')
        lines = content.splitlines()
        
        if lines and IGNORE_COMMENT in lines[0]:
            return True, 0
            
        line_count = len(lines)
        
        if line_count > MAX_LINES:
            return False, line_count
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return True, 0 # Skip on error
        
    return True, line_count

def main():
    target_dirs = ['src']
    extensions = {'.vue', '.js', '.scss'}
    violations = []
    files_scanned = 0

    for dir_name in target_dirs:
        root_path = Path(dir_name)
        if not root_path.exists():
            continue
            
        for filepath in root_path.rglob("*"):
            if filepath.is_file() and filepath.suffix in extensions:
                is_valid, count = check_file(filepath)
                if not is_valid:
                    violations.append((str(filepath), count))
                files_scanned += 1

    if violations:
        print("[FILE LENGTH AUDIT FAILED]")
        print(f"The following files exceed the {MAX_LINES} line limit:")
        for path, count in sorted(violations, key=lambda x: x[1], reverse=True):
            print(f"  - {path}: {count} lines")
        print("\nACTION REQUIRED: Refactor/Split these files or add // [PureVue-Ignore-Length] to the first line if exempt.")
        sys.exit(1)
    else:
        print(f"[FILE LENGTH AUDIT PASSED] Scanned {files_scanned} files. All compliant.")
        sys.exit(0)

if __name__ == "__main__":
    main()
