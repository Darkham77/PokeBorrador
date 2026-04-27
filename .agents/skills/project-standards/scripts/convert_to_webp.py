import os
import sys
try:
    from PIL import Image
except ImportError:
    print("[PYTHON_DEPENDENCY_ERROR] Missing library: Pillow. Run 'pip install Pillow' to fix.")
    import sys
    sys.exit(1)
from pathlib import Path

# Ensure the script can import local dependencies when run from the project root
import sys
sys.path.append(str(Path(__file__).parent))

from generate_atlas import generate_atlas

def process_assets(base_dir="_raw-assets"):
    """
    Processes the Zero-Config Asset Pipeline.
    Reads images from _raw-assets/lod and _raw-assets/original,
    converts them to WebP, applies dynamic LOD scaling, and
    outputs them to the mirrored destination path.
    """
    base_path = Path.cwd() / base_dir
    if not base_path.exists():
        print(f"Error: Source directory '{base_dir}' not found at {base_path}.")
        sys.exit(1)

    # Source and destination roots
    source_root = base_path
    converted_count = 0
    errors = []

    # Processing function
    def process_directory(source_dir):
        nonlocal converted_count
        if not source_dir.exists():
            return

        for root, dirs, files in os.walk(source_dir):
            # Check for atlas directories
            for d in list(dirs):
                if d.endswith('.atlas'):
                    atlas_path = Path(root) / d
                    atlas_name = d.replace('.atlas', '')
                    
                    # Destination is mirrored to root
                    rel_atlas_path = atlas_path.relative_to(source_dir)
                    dest_atlas_path = Path.cwd() / rel_atlas_path.parent
                    os.makedirs(dest_atlas_path, exist_ok=True)
                    
                    print(f"[ATLAS] Compiling: {rel_atlas_path} -> {dest_atlas_path.relative_to(Path.cwd())}")
                    
                    success = generate_atlas(atlas_path, dest_atlas_path, atlas_name)
                    
                    if success:
                        converted_count += 1
                    
                    # Remove from walk so we don't process internal files individually
                    dirs.remove(d)

            for file in files:
                file_path = Path(root) / file
                
                # Only process PNGs and JPEGs
                if file_path.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp'}:
                    continue
                
                # Calculate relative destination path
                try:
                    rel_path = file_path.relative_to(source_dir)
                except ValueError:
                    continue
                
                # The destination is exactly the relative path applied to the project root
                dest_path = Path.cwd() / rel_path.parent
                os.makedirs(dest_path, exist_ok=True)
                
                # Output filename base (without extension)
                base_name = file_path.stem
                
                try:
                    with Image.open(file_path) as img:
                        width, height = img.size
                        
                        # We use lossless by default for Pixel Art, but we can detect 'sprites', 'icons' etc.
                        is_lossless = any(pattern in str(file_path).lower() for pattern in ['sprites', 'icons', 'badges', 'items', 'pixel'])
                        
                        if is_lossless:
                            save_kwargs = {'lossless': True}
                        elif width < 250 or height < 250:
                            save_kwargs = {'quality': 98, 'method': 6} # High quality for small images
                        else:
                            save_kwargs = {'quality': 80, 'method': 6}
                        
                        # Only generate original @1x
                        out_file = dest_path / f"{base_name}.webp"
                        img.save(out_file, 'WEBP', **save_kwargs)
                        
                        print(f"[OK] Generated: {out_file.relative_to(Path.cwd())} ({'Lossless' if is_lossless else 'Lossy'})")
                        converted_count += 1
                
                except Exception as e:
                    print(f"[ERROR] Error processing {file_path}: {e}")
                    errors.append(f"{file_path}: {e}")

    print(">>> Initiating Zero-Config Asset Pipeline...")
    
    # Process the entire _raw-assets folder structure
    process_directory(source_root)
    
    print("\n--- SUMMARY ---")
    print(f"Total WebP files generated: {converted_count}")
    print(f"Errors: {len(errors)}")
    
    report_file = Path.cwd() / "lod_errors_report.txt"
    if errors:
        print("\n" + "!" * 60)
        print("!!! [CRITICAL_FAILURE] ASSET PIPELINE ENCOUNTERED ERRORS !!!")
        print(f"!!! [ACTION_REQUIRED] Review {report_file.name} immediately.")
        print("!" * 60 + "\n")
        
        with open(report_file, "w", encoding="utf-8") as f:
            f.write("LOD Conversion Errors Report\n")
            f.write("============================\n\n")
            for err in errors:
                f.write(f"- {err}\n")
        
        # Mandatory non-zero exit code for failures
        sys.exit(1)
    else:
        # Si no hubo errores y el archivo existe de una ejecución anterior, lo limpiamos
        if report_file.exists():
            report_file.unlink()
        print("\n[FINISH] All assets processed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    process_assets()
