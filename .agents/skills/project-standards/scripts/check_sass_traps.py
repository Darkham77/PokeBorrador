#!/usr/bin/env python3
import os
import re
import sys

# Regex to find transform: scale(x) without interpolation #{x}
SCALE_TRAP_REGEX = re.compile(r'scale\((?!\#\{)([\d\.]+)\)')
SCSS_INTERPOLATION_REGEX = re.compile(r'\#\{')
LANG_SCSS_REGEX = re.compile(r'<style[^>]*lang=["\']scss["\'][^>]*>')

# Regex to find deprecated global functions (not prefixed by math. or string.)
# We look for the function name preceded by whitespace, parenthesis, or start of line, 
# and NOT preceded by "math." or "string."
DEPRECATED_FUNCTIONS = {
    'random': 'math.random',
    'unquote': 'string.unquote',
    'unit': 'math.unit',
    'percentage': 'math.percentage',
    'abs': 'math.abs',
    'round': 'math.round',
    'ceil': 'math.ceil',
    'floor': 'math.floor'
}

def check_file(filepath):
    errors = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.splitlines()
        
        has_interpolation = bool(SCSS_INTERPOLATION_REGEX.search(content))
        has_lang_scss = bool(LANG_SCSS_REGEX.search(content))
        
        is_sass_context = filepath.endswith('.scss') or has_lang_scss
        
        for i, line in enumerate(lines, 1):
            # Only check for naked scale() if we are in SASS
            if is_sass_context and SCALE_TRAP_REGEX.search(line):
                errors.append(f"L{i}: Naked scale() detected in SASS context: {line.strip()}")
            
            # Check for deprecated global functions (ALWAYS forbidden in this project)
            for func, replacement in DEPRECATED_FUNCTIONS.items():
                pattern = rf'(?<![\w\.])({func})\('
                if re.search(pattern, line):
                    errors.append(f"L{i}: Deprecated global '{func}()' found. Use '{replacement}()' instead.")

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
