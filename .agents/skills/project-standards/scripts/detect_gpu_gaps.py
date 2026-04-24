import os
import re
import sys

# Utility to detect GPU optimization gaps in the project.
# It scans .vue and .scss files for patterns that should be optimized for hardware acceleration.

IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backup_legacy_code', 'public']
EXTENSIONS = ['.vue', '.scss']

# Patterns to detect
PATTERNS = {
    'missing_sprite_render': {
        'regex': r'<img[^>]+class="[^"]*(poke-sprite|item-sprite|faction-icon)[^"]*"[^>]*>(?![^<]*@include sprite-render)',
        'message': 'Potential missing @include sprite-render on a game sprite/icon.',
        'severity': 'MEDIUM'
    },
    'raw_pixelated': {
        'regex': r'image-rendering:\s*pixelated',
        'message': 'Use @include sprite-render instead of raw image-rendering: pixelated for GPU benefits.',
        'severity': 'LOW'
    },
    'raw_overflow_scroll': {
        'regex': r'overflow-y:\s*(auto|scroll)(?![^}]*@include smooth-scroll)',
        'message': 'Scrollable container might be missing @include smooth-scroll (GPU-accelerated scroll).',
        'severity': 'MEDIUM'
    },
    'heavy_filter_no_gpu': {
        'regex': r'backdrop-filter:\s*Blur\([^)]+\)(?![^}]*(@include gpu-layer|transform:\s*TranslateZ\(0\)))',
        'message': 'Expensive backdrop-filter Blur detected without GPU layer promotion (@include gpu-layer).',
        'severity': 'HIGH'
    },
    'transition_no_will_change': {
        'regex': r'transition:\s*[^;]+(?![^}]*(@include\s+will-animate|will-change))',
        'message': 'Animation/Transition detected without will-change hint or @include will-animate.',
        'severity': 'LOW'
    },
    'sass_capitalization_trap': {
        'regex': r'(?<!-)(translate[xyz]|scale|blur|grayscale|brightness|saturate|drop-shadow)\(',
        'message': 'SASS 2.0 Trap: Use Capitalized functions (e.g., Blur(), Scale()) to prevent compilation/rendering issues.',
        'severity': 'MEDIUM'
    },
    'legacy_scrollbar_class': {
        'regex': r'class="[^"]*(custom-scrollbar-vicio|custom-scrollbar-premium)[^"]*"',
        'message': 'Legacy scrollbar class detected. Scrollbars are now handled globally in _scrollbars.scss. Remove manual classes.',
        'severity': 'LOW'
    },
    'scrollbar_gutter_trap': {
        'regex': r'scrollbar-gutter:\s*stable',
        'message': 'Avoid scrollbar-gutter: stable; it creates an unwanted empty gap on the right. Layout should be fluid.',
        'severity': 'MEDIUM'
    },
    'missing_scroll_padding': {
        'regex': r'overflow-y:\s*(auto|scroll)(?![^}]*padding:)',
        'message': 'Scrollable containers should have internal padding to prevent clipping of visual effects (glows/neon).',
        'severity': 'MEDIUM'
    }
}

def scan_file(filepath):
    gaps = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
            for key, config in PATTERNS.items():
                # For CSS blocks, we need to be more careful about the context
                # This is a simplified regex approach
                # Using re.MULTILINE and not IGNORECASE for capitalization trap
                flags = re.MULTILINE
                if key != 'sass_capitalization_trap':
                    flags |= re.IGNORECASE
                
                matches = re.finditer(config['regex'], content, flags)
                for match in matches:
                    line_no = content.count('\n', 0, match.start()) + 1
                    gaps.append({
                        'file': filepath,
                        'line': line_no,
                        'pattern': key,
                        'message': config['message'],
                        'severity': config['severity'],
                        'context': match.group(0).strip()
                    })
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    return gaps

def main(root_dir):
    all_gaps = []
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            if any(file.endswith(ext) for ext in EXTENSIONS):
                filepath = os.path.join(root, file)
                all_gaps.extend(scan_file(filepath))

    if not all_gaps:
        print("No GPU optimization gaps detected!")
        return

    print(f"Found {len(all_gaps)} potential GPU optimization gaps:\n")
    
    # Sort by severity
    severity_order = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
    all_gaps.sort(key=lambda x: severity_order.get(x['severity'], 3))

    for gap in all_gaps:
        icon = ""
        if gap['severity'] == 'HIGH': icon = "[!]"
        elif gap['severity'] == 'MEDIUM': icon = "[?]"
        else: icon = "[i]"
        
        print(f"{icon} [{gap['severity']}] {gap['file']}:{gap['line']}")
        print(f"   Reason: {gap['message']}")
        print(f"   Context: {gap['context'][:100]}...")
        print("-" * 40)

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    main(target)
