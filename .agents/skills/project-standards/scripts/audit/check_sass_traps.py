#!/usr/bin/env python3
import re
import sys
from pathlib import Path

# Regex to find lowercase filter/transform functions that collide with SASS built-ins
# We specifically look for lowercase versions. Capitalized versions (Scale, Grayscale) are SAFE.
FILTER_COLLISION_REGEX = re.compile(r'(?<![a-zA-Z-\.\$])(?:scale|grayscale|invert|opacity|brightness|blur|rotate|translate|saturate|drop-shadow|translatex|translatey|translatez|skewx|skewy|matrix)\(')

# Regex to find filter: ... opacity() which is inefficient compared to opacity: property
OPACITY_FILTER_PROPERTY_REGEX = re.compile(r'filter:.*(?:opacity|Opacity)\(')

# Regex to find string.unquote() being used for filters (bloated pattern)
UNQUOTE_FILTER_REGEX = re.compile(r'string\.unquote\(["\'].*(?:scale|grayscale|invert|opacity|brightness).*["\']\)', re.I)

SCSS_INTERPOLATION_REGEX = re.compile(r'\#\{')
LANG_SCSS_REGEX = re.compile(r'<style[^>]*lang=["\']scss["\'][^>]*>')

# Regex to find deprecated global functions (not prefixed by math. or string.)
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

# Regex to find legacy if() function calls
LEGACY_IF_REGEX = re.compile(r'(?<![\w\.])if\(')

# Regex to find SASS color functions processing CSS variables
COLOR_VAR_COLLISION_REGEX = re.compile(r'(?:scale-color|color\.scale|lighten|darken|saturate|desaturate|adjust-hue|rgba|mix)\([^)]*var\(--')

# Regex to find deprecated @import (excluding CSS url imports)
IMPORT_DEPRECATION_REGEX = re.compile(r'@import\s+(?!url\()["\']([^"\']+)["\'];?')

def check_file(filepath: Path):
    errors = []
    
    try:
        content = filepath.read_text(encoding='utf-8')
        lines = content.splitlines()
        
        has_interpolation = bool(SCSS_INTERPOLATION_REGEX.search(content))
        has_lang_scss = bool(LANG_SCSS_REGEX.search(content))
        
        is_sass_context = filepath.suffix == '.scss' or has_lang_scss
        
        for i, line in enumerate(lines, 1):
            if not is_sass_context:
                continue

            if "[PureVue-Ignore]" in line:
                continue
            if i > 1 and "[PureVue-Ignore]" in lines[i-2]: # lines is 0-indexed, i is 1-indexed
                continue

            # 1. Lowercase collision check
            if FILTER_COLLISION_REGEX.search(line):
                errors.append(f"L{i}: Lowercase filter/transform collision detected: {line.strip()}. Use Capitalization (e.g., Grayscale(1)) instead.")
            
            # 2. Unquote misuse check
            if UNQUOTE_FILTER_REGEX.search(line):
                errors.append(f"L{i}: Bloated string.unquote() used for filter: {line.strip()}. Use Capitalization instead.")

            # 3. Opacity optimization check
            if OPACITY_FILTER_PROPERTY_REGEX.search(line):
                errors.append(f"L{i}: Inefficient filter: opacity() detected: {line.strip()}. Use 'opacity: X' property instead for GPU efficiency.")
            
            # 4. Check for deprecated global functions
            for func, replacement in DEPRECATED_FUNCTIONS.items():
                pattern = rf'(?<![\w\.])({func})\('
                if re.search(pattern, line):
                    errors.append(f"L{i}: Deprecated global '{func}()' found. Use '{replacement}()' instead.")

            # 5. Legacy if() check
            if LEGACY_IF_REGEX.search(line):
                # We skip @if, just looking for if() function
                if not line.strip().startswith('@if'):
                    errors.append(f"L{i}: Legacy if() function detected: {line.strip()}. Use modern @if / @else control blocks.")

            # 6. SASS Color + CSS Var check
            if COLOR_VAR_COLLISION_REGEX.search(line):
                errors.append(f"L{i}: SASS color function cannot process CSS variables: {line.strip()}. Use a static SASS fallback for calculations.")

            # 7. Deprecated @import check
            if IMPORT_DEPRECATION_REGEX.search(line):
                errors.append(f"L{i}: Deprecated @import detected: {line.strip()}. Use modern @use or @forward instead.")

        # Check for interpolation in non-SCSS block (only for .vue)
        if filepath.suffix == '.vue' and has_interpolation and not has_lang_scss:
            errors.append("CRITICAL: SASS Interpolation #{...} detected in a Vue file missing lang=\"scss\"")
            
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
            
    return errors

def main():
    target_dirs = ['src']
    extensions = {'.scss', '.vue'}
    all_errors = {}

    for dir_name in target_dirs:
        root_path = Path(dir_name)
        if not root_path.exists():
            continue
            
        for filepath in root_path.rglob("*"):
            if filepath.is_file() and filepath.suffix in extensions:
                errors = check_file(filepath)
                if errors:
                    all_errors[str(filepath)] = errors

    if all_errors:
        print("[SASS VALIDATION FAILED]")
        for path, errors in all_errors.items():
            print(f"File: {path}")
            for err in errors:
                print(f"  - {err}")
        sys.exit(1)
    else:
        print("[SASS CHECK PASSED] No technical SASS traps found.")
        sys.exit(0)

if __name__ == "__main__":
    main()
