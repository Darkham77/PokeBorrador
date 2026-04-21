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

# Regex to find lowercase filter/transform functions that collide with SASS built-ins
# We specifically target common collisions: scale, grayscale, invert, brightness, opacity
TRAP_REGEX = re.compile(r'(?<![a-zA-Z-\.\$])(scale|grayscale|invert|brightness|opacity)\(([\d\.]+)\)')

def capitalize_match(match):
    func = match.group(1)
    val = match.group(2)
    return f"{func.capitalize()}({val})"

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = TRAP_REGEX.sub(capitalize_match, content)
    
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
