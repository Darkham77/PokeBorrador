#!/usr/bin/env python3
import os
import sys

# MANDATORY: No .vue, .js, or .scss file may exceed 500 lines (except "databases" style files).
MAX_LINES = 500

# Hardcoded whitelist for known "database" files
WHITELIST = [
    "speciesMetadata.js",
    "pokemonDB.js",
    "moves.js",
    "items.js",
    "migrations_data.js",
    "weather-tables.js"
]

IGNORE_COMMENT = "[PureVue-Ignore-Length]"

def check_file(filepath):
    """Returns True if file is valid, False otherwise."""
    filename = os.path.basename(filepath)
    
    if filename in WHITELIST:
        return True, 0
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            first_line = f.readline()
            if IGNORE_COMMENT in first_line:
                return True, 0
            
            # Reset to count all lines
            f.seek(0)
            line_count = sum(1 for _ in f)
            
            if line_count > MAX_LINES:
                return False, line_count
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return True, 0 # Skip on error
        
    return True, line_count

def main():
    target_dirs = ['src']
    extensions = ['.vue', '.js', '.scss']
    violations = []
    files_scanned = 0

    for root_dir in target_dirs:
        for root, _, files in os.walk(root_dir):
            for file in files:
                if any(file.endswith(ext) for ext in extensions):
                    path = os.path.join(root, file)
                    is_valid, count = check_file(path)
                    if not is_valid:
                        violations.append((path, count))
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
