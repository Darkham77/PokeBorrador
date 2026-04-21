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

    lod_dir = base_path / "lod"
    original_dir = base_path / "original"

    converted_count = 0
    errors = []

    def cleanup_managed_folders():
        print("🧹 Cleaning managed asset folders...")
        import shutil
        
        folders_to_delete = set()
        for source_dir in [lod_dir, original_dir]:
            if not source_dir.exists(): continue
            for item in source_dir.iterdir():
                if item.is_dir():
                    # Scan for 'assets' folders within the mirrored roots
                    for sub_item in item.rglob('*'):
                        if sub_item.is_dir() and sub_item.name == 'assets':
                            rel_path = sub_item.relative_to(source_dir)
                            folders_to_delete.add(Path.cwd() / rel_path)
                    
                    # Also consider the item itself if it's 'assets' (less common but possible)
                    if item.name == 'assets':
                        folders_to_delete.add(Path.cwd() / 'assets')
        
        for folder in folders_to_delete:
            if folder.exists():
                print(f"   Removing stale directory: {folder.relative_to(Path.cwd())}")
                try:
                    shutil.rmtree(folder)
                except Exception as e:
                    print(f"      Error deleting {folder.name}: {e}")
        print("✨ Cleanup complete.")

    # Processing function
    def process_directory(source_dir, use_lod):
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
                    
                    print(f"📦 [ATLAS] Compiling: {rel_atlas_path} -> {dest_atlas_path.relative_to(Path.cwd())}")
                    
                    lod_scales = [1.0, 0.5, 0.25] if use_lod else [1.0]
                    success = generate_atlas(atlas_path, dest_atlas_path, atlas_name, lod_scales=lod_scales)
                    
                    if success:
                        converted_count += len(lod_scales)
                    
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
                        
                        # Generate sizes
                        sizes_to_generate = [(1.0, f"{base_name}.webp")] # Default @1x
                        
                        if use_lod:
                            # Apply Smart Scaling Breakpoints from project-standards:
                            # < 500px: No LOD (always 100%)
                            # 500-999px: @1x (100%), @0.5x (50%), @0.25x (now 50% to avoid extreme blur)
                            # >= 1000px: @1x (100%), @0.5x (50%), @0.25x (25%)
                            
                            scale_05 = 0.5 if width >= 500 else 1.0
                            scale_025 = 0.25 if width >= 1000 else (0.5 if width >= 500 else 1.0)
                            
                            sizes_to_generate.append((scale_05, f"{base_name}@0.5x.webp"))
                            sizes_to_generate.append((scale_025, f"{base_name}@0.25x.webp"))
                        
                        for scale, out_name in sizes_to_generate:
                            out_file = dest_path / out_name
                            if scale == 1.0:
                                img.save(out_file, 'WEBP', **save_kwargs)
                            else:
                                # Safe Resize: Ensure we don't shrink small images
                                new_width = max(1, int(width * scale))
                                new_height = max(1, int(height * scale))
                                resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                                resized_img.save(out_file, 'WEBP', **save_kwargs)
                            
                            print(f"✅ Generated: {out_file.relative_to(Path.cwd())} ({'Lossless' if is_lossless else 'Lossy'})")
                            converted_count += 1
                
                except Exception as e:
                    print(f"❌ Error processing {file_path}: {e}")
                    errors.append(f"{file_path}: {e}")

    print("🚀 Initiating Zero-Config LOD Asset Pipeline...")
    
    # Clean destinations first to remove stale assets
    # cleanup_managed_folders() 
    
    print("\n--- Processing /lod/ (Dynamic Scaling) ---")
    process_directory(lod_dir, use_lod=True)
    
    print("\n--- Processing /original/ (1:1 WebP only) ---")
    process_directory(original_dir, use_lod=False)
    
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
        print("\n✨ All assets processed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    process_assets()
