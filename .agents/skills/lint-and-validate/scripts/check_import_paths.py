import os
import re
import sys
from pathlib import Path

# Patterns for imports
IMPORT_PATTERNS = [
    r"import\s+.*?\s+from\s+['\"](.*?)['\"]",
    r"import\(['\"](.*?)['\"]\)",
    r"export\s+.*?\s+from\s+['\"](.*?)['\"]"
]

IGNORE_EXTENSIONS = ['.scss', '.css', '.png', '.jpg', '.webp', '.svg']

def resolve_path(current_file, import_path, root_dir):
    if import_path.startswith('@/'):
        return root_dir / 'src' / import_path[2:]
    
    if import_path.startswith('.'):
        return (Path(current_file).parent / import_path).resolve()
    
    # External or node_modules - ignore for now
    return None

def check_file(filepath, root_dir):
    findings = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.splitlines()
            
        for pattern in IMPORT_PATTERNS:
            for i, line in enumerate(lines):
                # Ignore commented lines
                if line.strip().startswith('//') or line.strip().startswith('/*') or line.strip().startswith('*'):
                    continue
                
                matches = re.finditer(pattern, line)
                for match in matches:
                    path_str = match.group(1)
                    
                    # Ignore external libraries and non-code assets
                    if not path_str.startswith(('.', '@')):
                        continue
                    if any(path_str.endswith(ext) for ext in IGNORE_EXTENSIONS):
                        continue
                    
                    resolved = resolve_path(filepath, path_str, root_dir)
                    if resolved:
                        # Check common extensions if not provided
                        possible_paths = [resolved]
                        if not resolved.suffix:
                            possible_paths = [
                                resolved.with_suffix('.vue'),
                                resolved.with_suffix('.js'),
                                resolved.with_suffix('.ts'),
                                resolved / 'index.js',
                                resolved / 'index.vue'
                            ]
                        
                        if not any(p.exists() for p in possible_paths):
                            findings.append({
                                "line": i + 1,
                                "path": path_str,
                                "message": f"Broken import path: '{path_str}' does not exist."
                            })
    except Exception as e:
        pass
    
    return findings

def main():
    root_dir = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    src_dir = root_dir / 'src'
    
    if not src_dir.exists():
        print(f"Error: src directory not found at {src_dir}")
        sys.exit(1)

    print(f"\n[IMPORT PATH CHECKER] Scanning {src_dir}...")
    
    total_errors = 0
    for root, _, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.vue', '.js', '.ts')):
                filepath = Path(root) / file
                errors = check_file(filepath, root_dir)
                for err in errors:
                    rel_path = filepath.relative_to(root_dir)
                    print(f"[FAIL] {rel_path}:{err['line']} | {err['message']}")
                    total_errors += 1

    if total_errors > 0:
        print(f"\nFound {total_errors} broken import paths.")
        sys.exit(1)
    else:
        print("All internal import paths are valid.")
        sys.exit(0)

if __name__ == "__main__":
    main()
