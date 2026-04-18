#!/usr/bin/env python3
import os
import re

# Regex to find scale(number), grayscale(number), opacity(number) NOT already interpolated
TRAP_REGEX = re.compile(r'(scale|grayscale|opacity)\((?!\#\{)([\d\.]+)\)')
LANG_SCSS_REGEX = re.compile(r'<style([^>]*)>') # To find the style tag and inject lang="scss"

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = TRAP_REGEX.sub(r'\1(#{\2})', content)
    
    # If we are in a .vue file and we applied interpolation, ensure lang="scss"
    if filepath.endswith('.vue') and new_content != content:
        if 'lang="scss"' not in new_content and "lang='scss'" not in new_content:
            # Inject lang="scss" into the <style> tag
            new_content = LANG_SCSS_REGEX.sub(r'<style\1 lang="scss">', new_content)
    
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
                        fixed_count += 1
                        print(f"Fixed: {path}")

    print(f"\nTotal files fixed: {fixed_count}")

if __name__ == "__main__":
    main()
