import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("[PYTHON_DEPENDENCY_ERROR] Missing library: Pillow. Run 'pip install Pillow' to fix image processing.")
    sys.exit(1)

# Ensure the script can import local dependencies when run from the project root
sys.path.append(str(Path(__file__).parent))

from generate_atlas import generate_atlas

def process_assets(base_dir="_raw-assets"):
    """
    Processes the Zero-Config Asset Pipeline.
    Reads images from _raw-assets,
    converts them to WebP, applies dynamic LOD scaling, and
    outputs them to the mirrored destination path.
    """
    base_path = Path.cwd() / base_dir
    if not base_path.exists():
        print(f"Error: Source directory '{base_dir}' not found at {base_path}.")
        sys.exit(1)

    converted_count = 0
    errors = []

    # Processing function using pathlib rglob
    print(">>> Initiating Zero-Config Asset Pipeline...")
    
    # We first look for .atlas folders to compile them
    for atlas_path in base_path.rglob("*.atlas"):
        if not atlas_path.is_dir():
            continue
            
        atlas_name = atlas_path.name.replace('.atlas', '')
        rel_atlas_path = atlas_path.relative_to(base_path)
        dest_atlas_path = Path.cwd() / rel_atlas_path.parent
        dest_atlas_path.mkdir(parents=True, exist_ok=True)
        
        print(f"[ATLAS] Compiling: {rel_atlas_path} -> {dest_atlas_path.relative_to(Path.cwd())}")
        
        if generate_atlas(atlas_path, dest_atlas_path, atlas_name):
            converted_count += 1

    # Then we process individual files, skipping those inside .atlas folders
    for file_path in base_path.rglob("*"):
        if not file_path.is_file():
            continue
            
        # Only process PNGs and JPEGs
        if file_path.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp'}:
            continue
            
        # Skip files inside .atlas directories
        if any(part.endswith('.atlas') for part in file_path.parts):
            continue
            
        try:
            rel_path = file_path.relative_to(base_path)
            dest_path = Path.cwd() / rel_path.parent
            dest_path.mkdir(parents=True, exist_ok=True)
            
            base_name = file_path.stem
            
            with Image.open(file_path) as img:
                width, height = img.size
                
                # We use lossless by default for Pixel Art
                is_lossless = any(pattern in str(file_path).lower() for pattern in ['sprites', 'icons', 'badges', 'items', 'pixel'])
                
                if is_lossless:
                    save_kwargs = {'lossless': True}
                elif width < 250 or height < 250:
                    save_kwargs = {'quality': 98, 'method': 6} # High quality for small images
                else:
                    save_kwargs = {'quality': 80, 'method': 6}
                
                out_file = dest_path / f"{base_name}.webp"
                img.save(out_file, 'WEBP', **save_kwargs)
                
                print(f"[OK] Generated: {out_file.relative_to(Path.cwd())} ({'Lossless' if is_lossless else 'Lossy'})")
                converted_count += 1
        
        except Exception as e:
            print(f"[ERROR] Error processing {file_path}: {e}")
            errors.append(f"{file_path}: {e}")

    print("\n--- SUMMARY ---")
    print(f"Total WebP files generated: {converted_count}")
    print(f"Errors: {len(errors)}")
    
    report_file = Path.cwd() / "lod_errors_report.txt"
    if errors:
        print("\n" + "!" * 60)
        print("!!! [CRITICAL_FAILURE] ASSET PIPELINE ENCOUNTERED ERRORS !!!")
        print(f"!!! [ACTION_REQUIRED] Review {report_file.name} immediately.")
        print("!" * 60 + "\n")
        
        report_file.write_text("LOD Conversion Errors Report\n============================\n\n" + "\n".join([f"- {err}" for err in errors]), encoding='utf-8')
        sys.exit(1)
    else:
        if report_file.exists():
            report_file.unlink()
        print("\n[FINISH] All assets processed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    process_assets()
