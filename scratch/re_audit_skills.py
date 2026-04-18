import os
import re
import yaml
import json

SKILLS_DIR = r"c:\Users\Franco\Trabajos\Juegos\PokeBorrador\.agents\skills"
PROJECT_ROOT = r"c:\Users\Franco\Trabajos\Juegos\PokeBorrador"

results = {
    "passed": [],
    "failed": {}
}

def is_absolute(path):
    if re.match(r'^[a-zA-Z]:\\', path) or path.startswith("/") or path.startswith("\\"):
        return True
    return False

def check_path(path, skill_dir):
    if path.startswith("http"):
        return True, "web"
    
    if is_absolute(path):
        return False, "absolute"
    
    # Check relative to skill_dir
    full_path_skill = os.path.join(skill_dir, path)
    if os.path.exists(full_path_skill):
        return True, "relative_skill"
    
    # Check relative to project root
    full_path_root = os.path.join(PROJECT_ROOT, path)
    if os.path.exists(full_path_root):
        return True, "relative_root"
    
    return False, "missing"

for skill_name in os.listdir(SKILLS_DIR):
    skill_path = os.path.join(SKILLS_DIR, skill_name)
    if not os.path.isdir(skill_path):
        continue
    
    skill_file = os.path.join(skill_path, "SKILL.md")
    if not os.path.exists(skill_file):
        results["failed"][skill_name] = ["SKILL.md missing"]
        continue
    
    with open(skill_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    errors = []
    
    # 1. Check for absolute paths
    abs_matches = re.findall(r'[a-zA-Z]:\\[^ \n`"\'\)]+', content)
    for match in abs_matches:
        errors.append(f"Absolute path found: {match}")

    # 2. Check frontmatter
    fm_match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if not fm_match:
        errors.append("Invalid frontmatter")
    else:
        try:
            fm = yaml.safe_load(fm_match.group(1))
            if not isinstance(fm, dict) or "name" not in fm or "description" not in fm:
                errors.append("Missing name/description in frontmatter")
        except:
            errors.append("YAML parse error")

    # 3. Check Markdown Links
    links = re.findall(r'\]\((.*?)\)', content)
    for link in links:
        clean_link = link.split("#")[0].strip()
        if not clean_link or "<" in clean_link: continue
        ok, reason = check_path(clean_link, skill_path)
        if not ok:
            errors.append(f"Broken link: {link} ({reason})")

    # 4. Check Script Commands
    script_commands = re.findall(r'(node|python|sh|bash|npx)\s+([^ \n`"\'\)]+)', content)
    for cmd, path in script_commands:
        if path.startswith("-") or "<" in path or "." not in path: continue
        ok, reason = check_path(path, skill_path)
        if not ok:
            errors.append(f"Script path not found: {path}")

    if errors:
        results["failed"][skill_name] = errors
    else:
        results["passed"].append(skill_name)

print(json.dumps(results, indent=2))
