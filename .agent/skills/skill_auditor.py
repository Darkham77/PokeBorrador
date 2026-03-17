import os
import re
import yaml
from pathlib import Path

def audit_skill(skill_path):
    skill_md_path = skill_path / "SKILL.md"
    if not skill_md_path.exists():
        return {"error": "Missing SKILL.md"}
    
    try:
        content = skill_md_path.read_text(encoding='utf-8')
    except Exception as e:
        return {"error": f"Error reading file: {e}"}
    
    # Check YAML frontmatter
    frontmatter_match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not frontmatter_match:
        # Try a more relaxed match for frontmatter
        frontmatter_match = re.match(r'^---\s*\r?\n(.*?)\r?\n---\s*\r?\n', content, re.DOTALL)
        if not frontmatter_match:
            return {"error": "Missing or malformed YAML frontmatter"}
    
    try:
        frontmatter = yaml.safe_load(frontmatter_match.group(1))
    except Exception as e:
        return {"error": f"Invalid YAML: {e}"}
    
    issues = []
    
    if not frontmatter:
        issues.append("Empty frontmatter")
        return {"issues": issues}

    if 'name' not in frontmatter:
        issues.append("Missing 'name' in frontmatter")
    if 'description' not in frontmatter:
        issues.append("Missing 'description' in frontmatter")
    elif len(str(frontmatter.get('description', ''))) < 50:
        issues.append("Description might be too short for accurate triggering")
    
    # Check for @[skills/...] syntax
    if "@[skills/" in content:
        issues.append("Found @[skills/...] syntax - check if intentional/supported")
    
    # Check for line count
    lines = content.splitlines()
    if len(lines) > 500:
        issues.append(f"Skill file is {len(lines)} lines (max 500 recommended)")
    
    # Check for imperative mood (basic check for common verbs at start of lines)
    instructions = content[frontmatter_match.end():]
    imperative_verbs = ["Run", "Check", "Create", "Use", "Read", "Update", "Fix", "Ask", "Stop", "Wait", "Verify", "Ensure", "Follow", "Implement", "Analyze"]
    found_imperative = False
    for line in instructions.splitlines():
        trimmed = line.lstrip(" -*1234567890.>")
        if any(trimmed.casefold().startswith(v.casefold()) for v in imperative_verbs):
            found_imperative = True
            break
    if not found_imperative:
        issues.append("Instructions might not be using enough imperative verbs")

    # Check for local markdown links
    links = re.findall(r'\[.*?\]\((?!http)(.*?)\)', content)
    for link in links:
        # Ignore anchor links
        if link.startswith("#"):
            continue
        # Clean up link path (remove query params or anchors)
        clean_link = link.split("#")[0].split("?")[0]
        if not clean_link:
            continue
        link_path = skill_path / clean_link
        if not link_path.exists():
            issues.append(f"Broken markdown link: {link}")

    return {"issues": issues, "frontmatter": frontmatter}

def main():
    root = Path('.').resolve()
    report = f"# Skill Audit Report for {root}\n\n"
    results = {}
    for item in root.iterdir():
        if item.is_dir() and (item / "SKILL.md").exists():
            results[item.name] = audit_skill(item)
    
    # Output report
    for name, data in sorted(results.items()):
        if "error" in data:
            report += f"## {name}: ❌ {data['error']}\n"
        elif data.get("issues"):
            report += f"## {name}: ⚠️ {len(data['issues'])} issues found\n"
            for issue in data["issues"]:
                report += f"- {issue}\n"
        else:
            report += f"## {name}: ✅ OK\n"
    
    Path("audit_report.md").write_text(report, encoding='utf-8')
    print("Report written to audit_report.md")

if __name__ == "__main__":
    main()
