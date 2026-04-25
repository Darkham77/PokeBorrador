#!/usr/bin/env python3
import os
import re
import sys

def load_color_map():
    vars_path = 'src/styles/core/_variables.scss'
    color_map = {}
    try:
        if not os.path.exists(vars_path):
            return {}

        with open(vars_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Match $variable: #hex;
            matches = re.findall(r'\$([a-zA-Z0-9_-]+):\s*(#(?:[0-9a-fA-F]{3,6}));', content)
            for name, hex_code in matches:
                # We prefer SASS variables in .scss files
                color_map[hex_code.lower()] = f'${name}'
            
            # Special manual mappings for common aliases
            color_map['#ffffff'] = '$white'
            color_map['#fff'] = '$white'
            color_map['#000000'] = '$black'
            color_map['#000'] = '$black'
            
        return color_map
    except Exception as e:
        print(f"[WARNING] Error parsing colors: {e}")
        return {}

COLOR_MAP = load_color_map()

# Files and directories to NEVER touch with automated repair
EXCLUDE_FILES = ['_variables.scss', '_colors.scss', '_z-index.scss', '_mixins.scss', '_typography.scss']
IGNORE_PATHS = ['src/styles/core', 'src/styles/tokens']

def inject_error_handler(match):
    """
    Injects @error handler into <img> tags that don't have it.
    Uses a more robust check to handle multi-line tags and inline SVGs.
    """
    tag = match.group(0)
    
    # If it already has an @error handler (case insensitive), return as is
    if '@error' in tag.lower():
        return tag
        
    # Find the last closing bracket of the tag
    # We look for the '>' that is NOT followed by another part of an attribute
    # but since it's an <img> tag, we just find the last '>'
    parts = tag.rsplit('>', 1)
    if len(parts) == 2:
        return parts[0].rstrip() + ' @error="e => e.target.style.display = \'none\'">' + parts[1]
    return tag

def fix_file(filepath):
    filename = os.path.basename(filepath)
    if filename in EXCLUDE_FILES:
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 1. Fix Image fallbacks (only in .vue)
    if filepath.endswith('.vue'):
        # Match <img ... > handling multi-line and quotes correctly
        # We match from <img to the corresponding >
        # This is a bit tricky with regex for all cases, but for Vue templates it's usually okay
        content = re.sub(r'<img\s+[^>]*?>', inject_error_handler, content, flags=re.DOTALL | re.IGNORECASE)
        # Fix previous buggy injection if present
        content = content.replace(r"\'none\'", "'none'")

    # 2. Fix Hardcoded Colors (in .scss and inside <style> in .vue)
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        if line.strip().startswith('$') and ':' in line:
            new_lines.append(line)
            continue
        new_lines.append(line)
    
    content = '\n'.join(new_lines)
    sorted_colors = sorted(COLOR_MAP.items(), key=lambda x: len(x[0]), reverse=True)
    for hex_code, var in sorted_colors:
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
                    normalized_path = path.replace('\\', '/')
                    if any(normalized_path.startswith(p) for p in IGNORE_PATHS):
                        continue
                        
                    if fix_file(path):
                        print(f"FIXED: {path}")
                        fixed_count += 1

    print(f"\n[HYBRID REPAIR COMPLETE] Modified {fixed_count} files.")

if __name__ == "__main__":
    main()
