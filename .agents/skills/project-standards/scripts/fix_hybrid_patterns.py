#!/usr/bin/env python3
import os
import re
import sys

# Color Mapping: Hex -> SASS Variable
COLOR_MAP = {
    r'#ffd60a': '$yellow',
    r'#ff453a': '$red',
    r'#0a84ff': '$blue',
    r'#32d74b': '$green',
    r'#bf5af2': '$purple',
    r'#0a0a0a': '$dark',
    r'#000000': '$darker',
    r'#f5f5f7': '$text',
    r'#86868b': '$gray',
    r'#64748b': '$muted',
    r'#1c2128': '$card-dark',
    r'#fff': '$white',
    r'#ffffff': '$white',
    r'#000': '$black',
}

# Regex for img tag without @error
IMG_REGEX = re.compile(r'(<img\s+)(?![^>]*@error)([^>]*>)')

# Files to NEVER touch with color replacement
EXCLUDE_FILES = ['_variables.scss', '_colors.scss', '_z-index.scss', '_mixins.scss']

def fix_file(filepath):
    filename = os.path.basename(filepath)
    if filename in EXCLUDE_FILES:
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 1. Fix Image fallbacks (only in .vue)
    if filepath.endswith('.vue'):
        # Inject @error handler. Clean single quotes.
        content = IMG_REGEX.sub(r'\1@error="e => e.target.style.display = \'none\'" \2', content)
        # Fix previous buggy injection if present
        content = content.replace(r"\'none\'", "'none'")

    # 2. Fix Hardcoded Colors (in .scss and inside <style> in .vue)
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        # Don't replace if it's a variable definition (e.g. $red: #ff453a;)
        if line.strip().startswith('$') and ':' in line:
            new_lines.append(line)
            continue
            
        new_line = line
        new_lines.append(new_line)
    
    content = '\n'.join(new_lines)
    # Fix colors with safety: Sort by length descending to match #ffffff before #fff
    sorted_colors = sorted(COLOR_MAP.items(), key=lambda x: len(x[0]), reverse=True)
    for hex_code, var in sorted_colors:
        # Strict hex regex: matches #hex only if not followed by more hex chars
        # Using negative lookahead to ensure we don't match #fff inside #ffff00
        pattern = re.escape(hex_code) + r'(?![0-9a-fA-F])'
        content = re.sub(pattern, var, content, flags=re.IGNORECASE)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    target_dirs = ['src']
    extensions = ['.scss', '.vue']
    fixed_count = 0

    for root_dir in target_dirs:
        for root, _, files in os.walk(root_dir):
            for file in files:
                if any(file.endswith(ext) for ext in extensions):
                    path = os.path.join(root, file)
                    if fix_file(path):
                        print(f"FIXED: {path}")
                        fixed_count += 1

    print(f"\n[HYBRID REPAIR COMPLETE] Modified {fixed_count} files.")

if __name__ == "__main__":
    main()
