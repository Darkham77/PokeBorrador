#!/usr/bin/env python3
try:
    import os
except ImportError:
    print("[PYTHON_DEPENDENCY_ERROR] Missing library: os. Run 'pip install os' to fix.")
    import sys
    sys.exit(1)
try:
    import re
except ImportError:
    print("[PYTHON_DEPENDENCY_ERROR] Missing library: re. Run 'pip install re' to fix.")
    import sys
    sys.exit(1)
try:
    import sys
except ImportError:
    print("[PYTHON_DEPENDENCY_ERROR] Missing library: sys. Run 'pip install sys' to fix.")
    import sys
    sys.exit(1)

# Regex to find lowercase filter/transform functions that collide with SASS built-ins
# We specifically look for lowercase versions. Capitalized versions (Scale, Grayscale) are SAFE.
# We exclude names prefixed by a dot (e.g., color.scale) to avoid false positives with built-in modules.
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

def check_file(filepath):
    errors = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.splitlines()
        
        has_interpolation = bool(SCSS_INTERPOLATION_REGEX.search(content))
        has_lang_scss = bool(LANG_SCSS_REGEX.search(content))
        
        is_sass_context = filepath.endswith('.scss') or has_lang_scss
        
        for i, line in enumerate(lines, 1):
            if not is_sass_context:
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
