#!/usr/bin/env python3
import os
import re
import sys

# Script to remove empty <style scoped> blocks from .vue files.

IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backup_legacy_code']

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original_content = content
        
        # Match <style scoped ...> and then only whitespace or nothing until </style>
        # We handle potential attributes like lang="scss"
        pattern = re.compile(r'<style\s+[^>]*?scoped[^>]*?>\s*</style>', re.DOTALL)
        content = pattern.sub('', content)
        
        # Also handle non-scoped empty styles if they are purely empty
        pattern_non_scoped = re.compile(r'<style\s*>\s*</style>', re.DOTALL)
        content = pattern_non_scoped.sub('', content)

        if content != original_content:
            # Clean up double newlines that might be left
            content = content.replace('\n\n\n', '\n\n')
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content.strip() + '\n')
            return True
    except Exception as e:
        print(f"[ERROR] Could not process {filepath}: {e}")
    return False

def main():
    print("Starting Empty Style Cleanup...")
    files_fixed = 0
    for root, dirs, files in os.walk('src'):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            if file.endswith('.vue'):
                if fix_file(os.path.join(root, file)):
                    print(f"[CLEANED] {os.path.join(root, file)}")
                    files_fixed += 1
    
    print(f"Cleanup complete. Fixed {files_fixed} files.")

if __name__ == "__main__":
    main()
