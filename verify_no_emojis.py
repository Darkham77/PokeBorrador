import os
import re

# Define patterns that likely represent emoji placeholders for Pokemon sprites
PATTERNS = [
    r"\$\{.*emoji\s*\|\|\s*'❓'\}",
    r"this\.nextElementSibling\.style\.display\s*=\s*'block'",
    r"onerror=.*p\.emoji",
    r"onerror=.*pokemon\.emoji",
    r"battle-sprite-emoji",
    r"player-sprite-emoji",
    r"enemy-sprite-emoji",
    r"team-emoji-",
]

# Files to exclude from verification (e.g., constants, item shops, or non-sprite logic)
EXCLUDE_FILES = [
    "01_data.js",  # Contains the actual database with emoji definitions
    "23_market.js", # Item/Type icons
]

def verify_files(directory):
    found_issues = []
    
    for root, _, files in os.walk(directory):
        for file in files:
            if not file.endswith('.js') or file in EXCLUDE_FILES:
                continue
                
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                for i, line in enumerate(lines):
                    for pattern in PATTERNS:
                        if re.search(pattern, line):
                            # Special case: allow reputation shop icons (items)
                            if "item.icon" in line or "item.sprite" in line:
                                continue
                            if "stoneIcon" in line:
                                continue
                            found_issues.append((file, i + 1, line.strip()))
                            
    return found_issues

if __name__ == "__main__":
    js_dir = "d:\\Documentos\\GitHub\\PokeBorrador\\js\\"
    issues = verify_files(js_dir)
    
    if issues:
        print(f"Found {len(issues)} potential emoji placeholders:")
        for file, line_num, content in issues:
            print(f"[{file}:{line_num}] {content}")
        exit(1)
    else:
        print("Success: No Pokemon emoji placeholders found in JS files.")
        exit(0)
