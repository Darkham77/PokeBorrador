import os
import re

root_dir = r"c:\Users\franc\Insync\francogpellegrini@gmail.com\Google Drive\.agent\skills"

def fix_content_pipes(content):
    lines = content.splitlines()
    new_lines = []
    
    for line in lines:
        if line.strip().startswith('|') and line.strip().endswith('|'):
            if re.match(r'^\s*\|(\s*[:\s]*-+\s*[:\s]*\|)+\s*$', line):
                new_lines.append(line)
                continue
            
            # Find all backtick blocks and escape any | inside them
            def escape_pipes(match):
                code = match.group(1)
                # Escape any | that isn't already escaped
                escaped_code = re.sub(r'(?<!\\)\|', r'\|', code)
                return f'`{escaped_code}`'
            
            # Use a more careful non-greedy regex for backticks
            new_line = re.sub(r'`([^`\n]+)`', escape_pipes, line)
            
            # Also handle || outside of backticks but in tables (common in Bash)
            # User specifically asked for | inside "comillas" (quotes/backticks)
            # but unescaped || and | break the table columns regardless.
            # However, if I escape everything, I might break the table structure if the pipe WAS a separator.
            # So we only escape if it's INSIDE backticks as requested.
            
            if new_line != line:
                new_lines.append(new_line)
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
            
    result = '\n'.join(new_lines)
    if content.endswith('\n') and not result.endswith('\n'):
        result += '\n'
    return result

fixed_files = []
for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.md'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                new_content = fix_content_pipes(content)
                if new_content != content:
                    fixed_files.append(path)
                    print(f"Fixing: {path}")
                    with open(path, 'w', encoding='utf-8', newline='\n') as f:
                        f.write(new_content)
            except Exception as e:
                print(f"Error processing {path}: {e}")

print(f"Total files fixed: {len(fixed_files)}")
