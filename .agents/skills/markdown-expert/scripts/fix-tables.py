import os
import re
import sys
import argparse

def fix_markdown_tables(content):
    """
    Fixes markdown table separator rows to use the ':---' format.
    Example: '|---|---|' becomes '| :--- | :--- |'
    """
    lines = content.splitlines()
    new_lines = []
    
    # Regex to identify a table separator row.
    # It must contain at least one pipe and only characters used in separators: | - : space tab
    # Also ensures it's not just a horizontal rule (which doesn't have pipes).
    separator_regex = re.compile(r'^\s*\|?\s*(:?-+:?\s*\|)+\s*(:?-+:?\s*\|?)?\s*$')
    
    for i, line in enumerate(lines):
        if separator_regex.match(line):
            # We found a potential separator row.
            # We should check if it's preceded by a header row (contains pipes).
            # But the requirement is specifically to fix the separator format.
            
            # Split by pipes, fix each cell, and join back.
            cells = line.split('|')
            fixed_cells = []
            for cell in cells:
                stripped = cell.strip()
                if not stripped:
                    fixed_cells.append(cell) # Keep empty cells (like at start/end of row)
                    continue
                
                # If it's a separator cell (contains only - and :)
                if re.match(r'^:?-+:?$', stripped):
                    # Enforce :--- format (left alignment by default in this request)
                    # If it already has right alignment (---:), should we preserve it?
                    # The user example shows |---| -> | :--- |
                    # If it was |---:| -> | :---: |? Or just | :--- |?
                    # Usually, :--- is the most common fix for unaligned.
                    
                    if stripped.endswith(':'):
                        if stripped.startswith(':'):
                            fixed_cell = ' :---: '
                        else:
                            fixed_cell = ' ---: '
                    else:
                        fixed_cell = ' :--- '
                    fixed_cells.append(fixed_cell)
                else:
                    fixed_cells.append(cell)
            
            new_lines.append('|'.join(fixed_cells))
        else:
            new_lines.append(line)
            
    return '\n'.join(new_lines)

def process_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        fixed_content = fix_markdown_tables(content)
        
        if content != fixed_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            print(f"Fixed tables in: {file_path}")
        else:
            print(f"No table formatting issues found in: {file_path}")
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def main():
    parser = argparse.ArgumentParser(description="Repair Markdown table formatting.")
    parser.add_argument("path", help="File or directory to scan.")
    args = parser.parse_args()
    
    if os.path.isfile(args.path):
        process_file(args.path)
    elif os.path.isdir(args.path):
        for root, _, files in os.walk(args.path):
            for file in files:
                if file.endswith('.md'):
                    process_file(os.path.join(root, file))
    else:
        print(f"Error: {args.path} is not a valid file or directory.")
        sys.exit(1)

if __name__ == "__main__":
    main()
