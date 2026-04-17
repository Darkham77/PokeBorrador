#!/usr/bin/env python3
import os
import re
import sys

# Regex to find transform: scale(x) without interpolation #{x}
SCALE_TRAP_REGEX = re.compile(r'scale\((?!\#\{)([\d\.]+)\)')
SCSS_INTERPOLATION_REGEX = re.compile(r'\#\{')
LANG_SCSS_REGEX = re.compile(r'<style[^>]*lang=["\']scss["\'][^>]*>')

def check_file(filepath):
    errors = []
    has_interpolation = False
    has_lang_scss = False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.splitlines()
        
        has_interpolation = bool(SCSS_INTERPOLATION_REGEX.search(content))
        has_lang_scss = bool(LANG_SCSS_REGEX.search(content))
        
        # Check for naked scale()
        for i, line in enumerate(lines, 1):
            if SCALE_TRAP_REGEX.search(line):
                errors.append(f"L{i}: Naked scale() detected: {line.strip()}")
        
        # Check for interpolation in non-SCSS block (only for .vue)
        if filepath.endswith('.vue') and has_interpolation and not has_lang_scss:
            errors.append("CRITICAL: SASS Interpolation #{...} detected in a Vue file missing lang=\"scss\"")
            
    return errors

def main():
    target_dirs = ['src']
    extensions = ['.scss', '.vue']
    all_errors = {}

    for root_dir in target_dirs:
        for root, _, files in os.walk(root_dir):
            for file in files:
                if any(file.endswith(ext) for ext in extensions):
                    path = os.path.join(root, file)
                    errors = check_file(path)
                    if errors:
                        all_errors[path] = errors

    if all_errors:
        print("\033[91m[SASS VALIDATION FAILED]\033[0m")
        for path, errors in all_errors.items():
            print(f"File: {path}")
            for err in errors:
                print(f"  - {err}")
        sys.exit(1)
    else:
        print("\033[92m[SASS CHECK PASSED]\033[0m No technical SASS traps found.")
        sys.exit(0)

if __name__ == "__main__":
    main()
