import unittest
import shutil
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("[PYTHON_DEPENDENCY_ERROR] Missing library: Pillow. Tests cannot run without image processing.")
    sys.exit(1)

# Add scripts directory to path
scripts_path = Path(__file__).parent.parent / "scripts"
sys.path.append(str(scripts_path))

class TestAssetPipeline(unittest.TestCase):
    def setUp(self):
        # Local import to avoid static analysis warnings before sys.path is modified
        from convert_to_webp import process_assets
        self.process_assets = process_assets
        
        self.base_dir = "test_raw_assets"
        self.test_dir = Path.cwd() / self.base_dir
        
        # Cleanup any previous runs
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
            
        self.test_dir.mkdir(parents=True, exist_ok=True)
        
        # Create a fake atlas directory
        # Important: The destination will be MIRRORED to the project root.
        self.atlas_target_dir = self.test_dir / "assets" / "ui"
        self.atlas_target_dir.mkdir(parents=True, exist_ok=True)
        
        self.atlas_dir = self.atlas_target_dir / "vfx.atlas"
        self.atlas_dir.mkdir(exist_ok=True)
        
        # Create a real small image
        img = Image.new('RGBA', (16, 16), (255, 0, 0, 255))
        img.save(self.atlas_dir / "particle.png")
        
        # Create an individual image
        individual_target_dir = self.test_dir / "assets" / "backgrounds"
        individual_target_dir.mkdir(parents=True, exist_ok=True)
        
        img2 = Image.new('RGBA', (32, 32), (0, 255, 0, 255))
        img2.save(individual_target_dir / "background.png")

    def tearDown(self):
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
        
        # Cleanup generated assets
        generated_paths = [
            Path("assets/ui/vfx.webp"),
            Path("assets/ui/vfx.json"),
            Path("assets/backgrounds/background.webp")
        ]
        for p in generated_paths:
            if p.exists():
                p.unlink()
        
        # Cleanup empty generated directories (bottom-up)
        for d in [Path("assets/ui"), Path("assets/backgrounds"), Path("assets")]:
            if d.exists() and d.is_dir() and not any(d.iterdir()):
                d.rmdir()

    def test_atlas_and_image_generation(self):
        """Should detect atlas folder and individual images, generating WebP and JSON files."""
        self.process_assets(base_dir=self.base_dir)
        
        # Verify Atlas
        self.assertTrue(Path("assets/ui/vfx.webp").exists(), "Base atlas image missing")
        self.assertTrue(Path("assets/ui/vfx.json").exists(), "Base atlas JSON missing")
        
        # Verify individual image
        self.assertTrue(Path("assets/backgrounds/background.webp").exists(), "Individual background missing")

if __name__ == "__main__":
    unittest.main()
