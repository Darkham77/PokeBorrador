import os
import shutil
from pathlib import Path

def backup_js_files():
    # Configuration
    ROOT_DIR = Path(__file__).resolve().parent.parent
    BACKUP_DIR = ROOT_DIR / "docs" / "_js_backup"
    
    # Directories to ignore
    IGNORE_DIRS = {
        "node_modules",
        "dist",
        "dev-dist",
        ".git",
        "docs",
        "backup_legacy_code",
        ".agents",
        ".replit",
        "venv",
        ".venv"
    }

    print(f"Starting backup of .js and .vue files to {BACKUP_DIR}...")
    
    # Ensure backup directory exists
    if BACKUP_DIR.exists():
        print(f"Cleaning existing backup directory: {BACKUP_DIR}")
        shutil.rmtree(BACKUP_DIR)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    copied_count = 0

    for root, dirs, files in os.walk(ROOT_DIR):
        # Convert root to Path object
        root_path = Path(root)
        
        # Check if we should ignore this directory
        relative_path = root_path.relative_to(ROOT_DIR)
        parts = relative_path.parts
        
        if any(part in IGNORE_DIRS for part in parts):
            continue

        for file in files:
            if file.endswith((".js", ".vue")):
                src_file = root_path / file
                dest_file = BACKUP_DIR / relative_path / file
                
                # Create destination subdirectories
                dest_file.parent.mkdir(parents=True, exist_ok=True)
                
                # Copy the file
                shutil.copy2(src_file, dest_file)
                copied_count += 1
                # print(f"Copied: {relative_path / file}")

    print(f"\nBackup complete!")
    print(f"Total files copied: {copied_count}")
    print(f"Destination: {BACKUP_DIR}")

if __name__ == "__main__":
    backup_js_files()
