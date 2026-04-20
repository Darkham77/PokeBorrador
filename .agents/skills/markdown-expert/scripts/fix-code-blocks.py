import os
import re
import sys
import argparse

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False

    in_code_block = False
    changed = False
    block_marker = ""
    
    for i in range(len(lines)):
        line = lines[i]
        stripped = line.lstrip()
        match = re.match(r'^(`{3,})(.*)', stripped)
        
        if match:
            marker = match.group(1)
            rest = match.group(2).strip()
            
            if not in_code_block:
                in_code_block = True
                block_marker = marker
                # If there's no language specified, default to 'text'
                if not rest:
                    leading_spaces = line[:len(line) - len(stripped)]
                    lines[i] = leading_spaces + marker + 'text\n'
                    changed = True
            else:
                # If we hit the matching closing marker, close the block
                if marker == block_marker:
                    in_code_block = False
                    
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f"Updated {filepath}")
        return True
    return False

def main():
    parser = argparse.ArgumentParser(description="Fix missing languages on markdown code blocks (defaults to 'text')")
    parser.add_argument("path", nargs='?', default='.', help="Path to a file or directory to process")
    args = parser.parse_args()
    
    target_path = os.path.abspath(args.path)
    if not os.path.exists(target_path):
        print(f"Path not found: {target_path}")
        sys.exit(1)
        
    updated_count = 0
    if os.path.isdir(target_path):
        for root, dirs, files in os.walk(target_path):
            for file in files:
                if file.endswith('.md'):
                    if process_file(os.path.join(root, file)):
                        updated_count += 1
    else:
        if target_path.endswith('.md'):
            if process_file(target_path):
                updated_count += 1
                
    print(f"Done. Updated {updated_count} file(s).")

if __name__ == "__main__":
    main()
