#!/usr/bin/env python3
import re
import os
from pathlib import Path

# GPU & Performance Repair Script
# Standardizes backdrop-filter syntax and applies GPU layer promotion (@include gpu-layer).

SEARCH_DIRS = ["src"]
EXTENSIONS = {".vue", ".scss", ".css"}

def fix_file(filepath):
    content = filepath.read_text(encoding='utf-8')
    lines = content.splitlines()
    new_lines = []
    modified = False
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # 1. Detect backdrop-filter with Blur
        if "backdrop-filter" in line.lower() and "blur" in line.lower():
            # Check if it already has GPU promotion nearby (next 3 lines)
            has_gpu = False
            for j in range(i, min(i + 4, len(lines))):
                if "@include gpu-layer" in lines[j] or "transform: TranslateZ(0)" in lines[j]:
                    has_gpu = True
                    break
            
            # Extract blur value
            blur_match = re.search(r'Blur\(([^)]+)\)', line, re.IGNORECASE)
            if blur_match:
                blur_val = blur_match.group(1)
                indent = line[:line.find(line.strip())]
                
                # We only replace if the line is primarily about the filter
                if line.strip().startswith("-webkit-backdrop-filter") or line.strip().startswith("backdrop-filter"):
                    new_lines.append(f"{indent}-webkit-backdrop-filter: Blur({blur_val});")
                    new_lines.append(f"{indent}backdrop-filter: Blur({blur_val});")
                    if not has_gpu:
                        new_lines.append(f"{indent}@include gpu-layer;")
                    
                    modified = True
                    i += 1
                    # Skip adjacent redundant filter lines
                    while i < len(lines) and (lines[i].strip().startswith("backdrop-filter") or lines[i].strip().startswith("-webkit-backdrop-filter")):
                        i += 1
                    continue

        # 2. Detect Quad Drop-Shadow (Expensive Outline)
        if "Drop-Shadow" in line and line.count("Drop-Shadow") >= 4:
            indent = line[:line.find(line.strip())]
            if "filter:" in line:
                new_lines.append(f"{indent}filter: pokemon-outline-optimized();")
                modified = True
                i += 1
                continue
        
        new_lines.append(line)
        i += 1
    
    if modified:
        filepath.write_text("\n".join(new_lines), encoding='utf-8')
        return True
    return False

def main():
    fixed_count = 0
    for start_dir in SEARCH_DIRS:
        root = Path(start_dir)
        if not root.exists(): continue
        
        for filepath in root.rglob("*"):
            if filepath.is_file() and filepath.suffix in EXTENSIONS:
                if fix_file(filepath):
                    print(f"FIXED GPU: {filepath}")
                    fixed_count += 1
                    
    print(f"\n[GPU REPAIR COMPLETE] Optimized {fixed_count} files.")

if __name__ == "__main__":
    main()
