#!/usr/bin/env python3
import os
import re
import sys

# Script to normalize typography usage.
# Replaces direct font-family declarations with standardized mixins.
# Does NOT enforce specific font sizes to allow aesthetic flexibility.

IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backup_legacy_code', 'core', 'tokens']
EXTENSIONS = ['.vue', '.scss']

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original_content = content
        
        # 1. Replace Press Start 2P with @include pixelated;
        pattern = re.compile(r"font-family:\s*(['\"]Press Start 2P['\"]|var\(--font-pixel\))[^;]*;")
        
        def safe_sub(match):
            return "@include pixelated;"

        content = pattern.sub(safe_sub, content)
        
        if content != original_content:
            # 2. Ensure mixins are imported if we added an include
            has_mixin = re.search(r'@(use|import).+(_mixins|mixins)', content)
            
            if "@include pixelated;" in content and not has_mixin:
                if filepath.endswith('.vue'):
                    content = re.sub(r'(<style[^>]*>)', r'\1\n@use "@/styles/core/_mixins" as *;', content)
                elif filepath.endswith('.scss'):
                    content = '@use "@/styles/core/mixins" as *;\n' + content

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
    except Exception as e:
        print(f"[ERROR] Could not process {filepath}: {e}")
    return False

def main():
    print("Starting Typography Normalization...")
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
    
    print(f"Typography Repair complete. Fixed {files_fixed} files.")

if __name__ == "__main__":
    main()
