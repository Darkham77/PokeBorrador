import os
import re
import sys

# Patterns to detect hybrid/legacy code
HYBRID_PATTERNS = [
    {
        "id": "direct_dom_query",
        "regex": r"document\.(querySelector|getElementById|getElementsByClassName|getElementsByTagName)",
        "message": "Direct DOM query detected. Use Vue refs or Pinia state instead.",
        "severity": "high"
    },
    {
        "id": "dom_manipulation",
        "regex": r"document\.createElement|\.innerHTML\s*=|\.innerText\s*=|\.textContent\s*=|\.appendChild\(",
        "message": "Direct DOM manipulation detected. Use Vue template and reactivity.",
        "severity": "critical"
    },
    {
        "id": "class_toggle",
        "regex": r"\.classList\.(add|remove|toggle)",
        "message": "Manual class manipulation. Use :class binding in Vue.",
        "severity": "medium"
    },
    {
        "id": "legacy_window_hook",
        "regex": r"window\.(showTab|toggleSettings|toggleProfile|showInventory|showFishingIntro|triggerRivalSequence)",
        "message": "Usage of legacy window hooks. Use uiStore or modalStore.",
        "severity": "high"
    },
    {
        "id": "mutation_observer",
        "regex": r"new MutationObserver",
        "message": "MutationObserver detected on UI elements. Use Vue watch or lifecycle hooks.",
        "severity": "medium"
    },
    {
        "id": "raw_event_listener",
        "regex": r"\.addEventListener\((['\"])(click|scroll|resize|wheel|touchmove)\1",
        "message": "Raw event listener detected. Ensure it's inside onMounted and cleaned up in onUnmounted, or use @click.",
        "severity": "medium"
    },
    {
        "id": "image_rendering_auto",
        "regex": r"image-rendering:\s*auto",
        "message": "Non-pixelated image rendering detected. Use 'pixelated' for game assets.",
        "severity": "medium"
    },
    {
        "id": "body_attribute_mutation",
        "regex": r"document\.body\.(className|id)\s*=",
        "message": "Direct body attribute manipulation detected. Use 'useBodyClass' composable.",
        "severity": "high"
    },
    {
        "id": "phaser_dom_injection",
        "regex": r"\.add\.dom\(",
        "message": "Phaser-DOM injection detected. Use Vue overlays instead.",
        "severity": "critical"
    },
    {
        "id": "extreme_z_index",
        "regex": r"z-index:\s*[0-9]{4,}",
        "message": "Extreme z-index detected (>999). Use Teleport or standardized layers.",
        "severity": "medium"
    },
    {
        "id": "blurry_pixel_text",
        "regex": r"text-shadow:.*?\d+px\s+\d+px\s+[1-9]\d*px",
        "message": "Blur detected in text-shadow. Use hard offsets (0px blur) for pixel fonts.",
        "severity": "medium"
    },
    {
        "id": "scoped_scrollbar_styling",
        "regex": r"::-webkit-scrollbar",
        "message": "Scrollbar styling detected. Ensure this is NOT in a <style scoped> block.",
        "severity": "high"
    },
    {
        "id": "flex_scroll_collapse",
        "regex": r"overflow-y:\s*auto",
        "message": "Overflow detected. Ensure the flex parent has 'min-height: 0' to avoid layout collapse.",
        "severity": "medium"
    },
    {
        "id": "missing_img_fallback",
        "regex": r"<img(?!.*?@error).*?>",
        "message": "Image tag missing @error fallback handler. Every game asset MUST have a fallback.",
        "severity": "high"
    },
    {
        "id": "hardcoded_color",
        "regex": r":\s*#(?:[0-9a-fA-F]{3,6})\b",
        "message": "Hardcoded hex color detected. Use standardized SASS variables ($yellow) or CSS tokens.",
        "severity": "medium"
    },
    {
        "id": "sass_url_safety",
        "regex": r"url\(.*?\#\{.*?\}\)",
        "message": "SASS interpolation detected inside url() without unquote(). This may cause build errors.",
        "severity": "high"
    },
    {
        "id": "blurry_pixel_font",
        "regex": r"font-size:\s*(\d+)px",
        "message": "Pixel font size detected that is NOT a multiple of 8. Use 8px, 16px, 24px, or 32px for pixel-perfect rendering.",
        "severity": "medium",
        "condition": "lambda size: int(size) % 8 != 0"
    },
    {
        "id": "button_depth_loss",
        "regex": r"(\.active|:active).*?box-shadow:\s*none",
        "message": "Button depth loss detected. Active states MUST NOT strip bottom shadows. Maintain 3D volume.",
        "severity": "medium"
    },
    {
        "id": "native_title_attribute",
        "regex": r'<(?!PVTooltip\b|BaseModal\b)\w+\b[^>]*?\btitle\s*=\s*["\'].*?["\']',
        "message": "Native 'title' attribute detected on a non-tooltip component. Use PVTooltip component instead for consistent visual standards.",
        "severity": "medium"
    },
    {
        "id": "negative_margin_stacking",
        "regex": r"margin-(left|right):\s*-\d+px",
        "message": "Negative margin detected for stacking. Use Flexbox 'gap' or absolute positioning with relative containers to ensure responsive legibility.",
        "severity": "medium"
    },
    {
        "id": "missing_dynamic_variable",
        "regex": r':style="\{.*?(color|background|glow).*?\}".*?(?!--[a-z\-]+)',
        "message": "Dynamic style detected without CSS variable. Use dynamic variables (e.g., --type-color) to keep SCSS decoupled.",
        "severity": "low"
    },
    {
        "id": "safari_backdrop_prefix",
        "regex": r"(?<!-webkit-)backdrop-filter:",
        "message": "Missing -webkit- prefix for backdrop-filter. Mandatory for Safari compatibility.",
        "severity": "high"
    },
    {
        "id": "raw_rgba_color",
        "regex": r"rgba\(\d+,\s*\d+,\s*\d+",
        "message": "Raw RGBA color detected. Use standardized SASS variables or CSS tokens.",
        "severity": "medium"
    },
    {
        "id": "hardcoded_z_index",
        "regex": r"z-index:\s*[0-9]+;",
        "message": "Hardcoded z-index detected. Use CSS variables (e.g., var(--z-modal)) for consistent layering.",
        "severity": "medium"
    },
    {
        "id": "missing_webkit_clip",
        "regex": r"background-clip:\s*text",
        "message": "Verify background-clip: text has -webkit- prefix. Required for Safari compatibility.",
        "severity": "high"
    },
    {
        "id": "direct_store_state",
        "regex": r"\w+Store\.state\.",
        "message": "Direct Pinia state access detected. Use storeToRefs or the store instance directly for better reactivity.",
        "severity": "low"
    },
    {
        "id": "modal_click_propagation",
        "regex": r"@click(?!\.stop)=\"[^\"]+\"",
        "message": "Potential missing .stop modifier on click handler. Critical for deep-stacked modal interactions.",
        "severity": "medium"
    }
]

# Files/Directories to ignore
IGNORE_PATHS = [
    "node_modules",
    "backup_legacy_code",
    "dist",
    ".git",
    "scripts",
    "tests",           # Tests naturally use DOM
    "assetService.js",
    "phaserBridge.js",
    "baseBridge.js",    # Authorized legacy bridge
    "dbRouter.js",
    "useWindowListener.js", # Authorized event manager
    "useBodyClass.js"       # Authorized class manager
]

# Extensions to scan
EXTENSIONS = [".vue", ".js", ".ts", ".scss", ".css"]

def scan_file(filepath):
    findings = []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            lines = content.splitlines()
            
            # 1. Line-by-line checks (standard)
            in_scoped_style = False
            has_pixel_font_context = False
            for i, line in enumerate(lines):
                if "<style" in line and "scoped" in line:
                    in_scoped_style = True
                if "</style>" in line:
                    in_scoped_style = False
                
                # Check for pixel font context in the current block or file
                if "Press Start 2P" in line or "@include pixelated" in line or "pixel-perfect" in line:
                    has_pixel_font_context = True
                
                # Heuristic to ignore comments or explicit ignores
                if line.strip().startswith("//") or line.strip().startswith("/*") or line.strip().startswith("*"):
                    continue
                
                if "[PureVue-Ignore]" in line:
                    continue
                
                for pattern in HYBRID_PATTERNS:
                    # Skip multi-line patterns in line-by-line loop
                    if pattern["id"] == "native_title_attribute":
                        continue

                    if re.search(pattern["regex"], line):
                        # Specific exception for common safe uses
                        if "canvas" in line.lower() or "getElementById('game-container')" in line:
                            continue
                        if "document.title =" in line:
                            continue
                        
                        # Special case: scoped_scrollbar_styling should ONLY trigger if inside <style scoped>
                        if pattern["id"] == "scoped_scrollbar_styling":
                            if not in_scoped_style:
                                continue
                        
                        # Special case: flex_scroll_collapse is hard to detect correctly in scss/css files (mixins)
                        if pattern["id"] == "flex_scroll_collapse":
                            if filepath.endswith(".scss") or filepath.endswith(".css"):
                                continue
                            
                            # Smart check: If min-height: 0 is in the same or surrounding lines, it's likely fixed
                            is_fixed = False
                            context_range = range(max(0, i-5), min(len(lines), i+6))
                            for idx in context_range:
                                if idx < len(lines) and "min-height: 0" in lines[idx]:
                                    is_fixed = True
                                    break
                            if is_fixed:
                                continue

                        # General condition check (if regex matched)
                        if "condition" in pattern:
                            match = re.search(pattern["regex"], line)
                            if match and match.groups():
                                try:
                                    val = match.group(1)
                                    # Context-aware pixel font check
                                    if pattern["id"] == "blurry_pixel_font" and not has_pixel_font_context:
                                        # If not in pixel context, allow intermediate sizes (smooth fonts)
                                        continue
                                        
                                    condition_fn = eval(pattern["condition"])
                                    if not condition_fn(val):
                                        continue
                                except:
                                    continue

                        findings.append({
                            "line": i + 1,
                            "content": line.strip(),
                            "message": pattern["message"],
                            "severity": pattern["severity"],
                            "id": pattern["id"]
                        })

            # 2. Multi-line checks (Native Title)
            # Match entire tags to check for native title usage
            title_matches = re.finditer(r'<([a-zA-Z0-9\-]+)\b[^>]*?(?<![:\-])\btitle\s*=\s*["\'](.*?)["\']', content, re.DOTALL)
            for match in title_matches:
                tag_name = match.group(1)
                
                # Exclude Vue components (PascalCase or explicitly allowed components)
                # Native HTML tags are always lowercase.
                if tag_name[0].isupper() or tag_name in ["BaseModal", "UnifiedCard"]:
                    continue
                
                # Calculate line number
                line_no = content.count('\n', 0, match.start()) + 1
                findings.append({
                    "line": line_no,
                    "content": match.group(0).strip().split('\n')[0] + "...",
                    "message": f"Native 'title' attribute detected on <{tag_name}>. Use PVTooltip instead.",
                    "severity": "medium",
                    "id": "native_title_attribute"
                })

    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    
    return findings

import argparse

def main():
    parser = argparse.ArgumentParser(description="Scan for hybrid/legacy patterns in PokeVicio codebase.")
    parser.add_argument("path", nargs="?", default=".", help="Path to a file or directory to scan.")
    args = parser.parse_args()

    root_dir = os.path.abspath(args.path)
    total_findings = 0
    files_scanned = 0
    problematic_files = set()

    if not os.path.exists(root_dir):
        print(f"Error: Path {root_dir} does not exist.")
        sys.exit(1)

    print(f"\n[HYBRID PATTERN SCANNER] Scanning {root_dir}...")
    print("-" * 60)
    print("FORMAT: [SEVERITY] File:Line | TAG | Description")
    print("-" * 60)

    if os.path.isfile(root_dir):
        findings = scan_file(root_dir)
        if findings:
            problematic_files.add(root_dir)
            for f in findings:
                print(f"[{f['severity'].upper()}] {os.path.basename(root_dir)}:{f['line']} | {f['id']} | {f['message']}")
                total_findings += 1
        files_scanned = 1
    else:
        for root, dirs, files in os.walk(root_dir):
            # Filter directories
            dirs[:] = [d for d in dirs if d not in IGNORE_PATHS]
            
            for file in files:
                if any(file.endswith(ext) for ext in EXTENSIONS):
                    filepath = os.path.join(root, file)
                    rel_path = os.path.relpath(filepath, root_dir)
                    
                    # Double check path ignore
                    if any(ignored in rel_path for ignored in IGNORE_PATHS):
                        continue

                    findings = scan_file(filepath)
                    if findings:
                        problematic_files.add(rel_path)
                        for f in findings:
                            print(f"[{f['severity'].upper()}] {rel_path}:{f['line']} | {f['id']} | {f['message']}")
                            total_findings += 1
                    files_scanned += 1

    print("-" * 60)
    print(f"Scan complete. Scanned {files_scanned} files.")
    
    if total_findings > 0:
        print(f"\n[PLANNING SUMMARY] Found {total_findings} patterns in {len(problematic_files)} files:")
        for pf in sorted(list(problematic_files)):
            print(f" - {pf}")
        print("\nACTION REQUIRED: Refactor the files above to comply with Pure Vue standards.")
        sys.exit(1)
    else:
        print("No hybrid patterns detected. Code is looking Pure Vue!")
        sys.exit(0)

if __name__ == "__main__":
    main()
