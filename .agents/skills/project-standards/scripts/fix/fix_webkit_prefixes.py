#!/usr/bin/env python3
import os
import re
import sys

# Script to automatically add -webkit- prefixes for Safari compatibility.
# Currently targets: backdrop-filter, background-clip: text.

EXTENSIONS = ['.vue', '.scss', '.css']
IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backup_legacy_code', 'core', 'tokens']

PATTERNS = [
    {
        'id': 'backdrop_filter',
        'regex': r'(?<!-webkit-)backdrop-filter:\s*([^;]+);',
        'replacement': r'-webkit-backdrop-filter: \1; backdrop-filter: \1;'
    },
    {
        'id': 'background_clip_text',
        'regex': r'(?<!-webkit-)background-clip:\s*text(?![^;]*-webkit-background-clip:\s*text)',
        'replacement': r'-webkit-background-clip: text; background-clip: text;'
    }
]

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original_content = content
        changes_made = 0
        
        for p in PATTERNS:
            # Check if we already have the -webkit- version for this property
            prefix = "-webkit-" + p['id'].replace('_', '-')
            if prefix in content:
                # If prefix exists, we skip this pattern to avoid duplicates
                # This is a simple but effective check for these specific properties
                continue
                
            new_content = re.sub(p['regex'], p['replacement'], content)
            if new_content != content:
                changes_made += 1
                content = new_content
        
        if changes_made > 0:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[FIXED] {filepath} ({changes_made} prefixes added)")
            return True
    except Exception as e:
        print(f"[ERROR] Could not process {filepath}: {e}")
    return False

def main():
    print("Starting Safari Compatibility Auto-Repair...")
    files_fixed = 0
    for root, dirs, files in os.walk('src'):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            if any(file.endswith(ext) for ext in EXTENSIONS):
                if fix_file(os.path.join(root, file)):
                    files_fixed += 1
    
    print(f"Repair complete. Fixed {files_fixed} files.")

if __name__ == "__main__":
    main()
