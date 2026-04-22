#!/usr/bin/env python3
import os
import re
import sys

# Functions to capitalize
TRAPS = [
    'scale', 'grayscale', 'invert', 'opacity', 'brightness', 
    'blur', 'rotate', 'translate', 'saturate', 'drop-shadow'
]

# Regex explanation:
# (?<![a-zA-Z-\.\$]) -> Not preceded by a letter, dash, dot (color.scale) or dollar sign
# ({}) -> One of our trap functions
# \( -> Followed by an opening parenthesis
FIX_REGEX = re.compile(r'(?<![a-zA-Z-\.\$])(' + '|'.join(TRAPS) + r')\(')

def capitalize_match(match):
    func = match.group(1)
    # Handle kebab-case like drop-shadow -> Drop-shadow
    if '-' in func:
        parts = func.split('-')
        return '-'.join(p.capitalize() for p in parts) + '('
    return func.capitalize() + '('

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We only fix .scss files or .vue files (which might have style blocks)
    new_content = FIX_REGEX.sub(capitalize_match, content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
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

    print(f"\n[SASS REPAIR COMPLETE] Modified {fixed_count} files.")

if __name__ == "__main__":
    main()
