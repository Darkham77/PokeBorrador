#!/usr/bin/env python3
import os
import re
import sys

# Script to automatically map hardcoded z-indexes to standardized CSS variables.

EXTENSIONS = ['.vue', '.scss', '.css']
IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backup_legacy_code', 'core', 'tokens']

def load_z_standards():
    vars_path = 'src/styles/core/_variables.scss'
    standards = []
    try:
        # Fallback defaults if file is missing
        defaults = [
            (15000, 'var(--z-tooltip)'),
            (13000, 'var(--z-modal)'),
            (10000, 'var(--z-overlay)'),
            (5000, 'var(--z-navigation)'),
            (1000, 'var(--z-hud)'),
            (0, 'var(--z-base)')
        ]
        
        if not os.path.exists(vars_path):
            return defaults

        with open(vars_path, 'r', encoding='utf-8') as f:
            content = f.read()
            matches = re.findall(r'--z-([a-z-]+):\s*(\d+);', content)
            if not matches:
                return defaults
            
            # Convert to list of (value, variable_name)
            raw_standards = []
            for name, val in matches:
                if name in ['max', 'critical', 'max-value']: continue # Skip extreme values
                raw_standards.append((int(val), f'var(--z-{name})'))
            
            # Sort by value descending to create ranges
            raw_standards.sort(key=lambda x: x[0], reverse=True)
            return raw_standards
    except Exception as e:
        print(f"[WARNING] Error parsing variables: {e}")
        return defaults

Z_STANDARDS = load_z_standards()

def map_z_index(value):
    try:
        val = int(value)
        # Find the highest standard that is <= to the given value
        for std_val, var_name in Z_STANDARDS:
            if val >= std_val:
                return var_name
    except:
        pass
    return None

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original_content = content
        
        # Pattern to find z-index: 123;
        # We use a lambda to replace based on the value found
        def replacer(match):
            z_val = match.group(1)
            mapped = map_z_index(z_val)
            if mapped:
                return f"z-index: {mapped};"
            return match.group(0)

        content = re.sub(r'z-index:\s*(\d+);', replacer, content)
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
    except Exception as e:
        print(f"[ERROR] Could not process {filepath}: {e}")
    return False

def main():
    print("Starting Z-Index Standardization...")
    files_fixed = 0
    # Files and directories to NEVER touch with automated repair
    IGNORE_PATHS = ['src/styles/core', 'src/styles/tokens']

    for root, dirs, files in os.walk('src'):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            if any(file.endswith(ext) for ext in EXTENSIONS):
                path = os.path.join(root, file)
                normalized_path = path.replace('\\', '/')
                if any(normalized_path.startswith(p) for p in IGNORE_PATHS):
                    continue

                if fix_file(path):
                    print(f"[FIXED] {path}")
                    files_fixed += 1
    
    print(f"Z-Index Repair complete. Fixed {files_fixed} files.")

if __name__ == "__main__":
    main()
