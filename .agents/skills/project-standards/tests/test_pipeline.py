import unittest
import os
import shutil
import sys
from pathlib import Path
from PIL import Image

# Add scripts directory to path
scripts_path = Path(__file__).parent.parent / "scripts"
sys.path.append(str(scripts_path))

from convert_to_webp import process_assets

class TestAssetPipeline(unittest.TestCase):
    def setUp(self):
        self.base_dir = "test_raw_assets"
        self.test_dir = Path.cwd() / self.base_dir
        
        # Cleanup any previous runs
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
            
        self.test_dir.mkdir(exist_ok=True)
        (self.test_dir / "lod").mkdir(exist_ok=True)
        (self.test_dir / "original").mkdir(exist_ok=True)
        
        # Create a fake atlas directory
        # Important: The destination will be MIRRORED to the project root.
        # So we create it inside lod/assets/ui/ to see if it ends up in assets/ui/
        self.atlas_target_dir = self.test_dir / "lod" / "assets" / "ui"
        self.atlas_target_dir.mkdir(parents=True, exist_ok=True)
        
        self.atlas_dir = self.atlas_target_dir / "vfx.atlas"
        self.atlas_dir.mkdir(exist_ok=True)
        
        # Create a real small image
        img = Image.new('RGBA', (16, 16), (255, 0, 0, 255))
        img.save(self.atlas_dir / "particle.png")
        
        # Create an individual image
        individual_target_dir = self.test_dir / "original" / "assets"
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
            Path("assets/ui/vfx@0.5x.webp"),
            Path("assets/ui/vfx@0.5x.json"),
            Path("assets/ui/vfx@0.25x.webp"),
            Path("assets/ui/vfx@0.25x.json"),
            Path("assets/background.webp")
        ]
        for p in generated_paths:
            if p.exists():
                p.unlink()
        
        # Cleanup empty generated directories
        for d in [Path("assets/ui"), Path("assets")]:
            if d.exists() and not any(d.iterdir()):
                d.rmdir()

    def test_atlas_and_image_generation(self):
        """Should detect atlas folder and individual images, generating WebP and JSON files."""
        process_assets(base_dir=self.base_dir)
        
        # Verify Atlas LODs
        self.assertTrue(Path("assets/ui/vfx.webp").exists(), "Base atlas image missing")
        self.assertTrue(Path("assets/ui/vfx.json").exists(), "Base atlas JSON missing")
        self.assertTrue(Path("assets/ui/vfx@0.5x.webp").exists(), "LOD 0.5x atlas image missing")
        self.assertTrue(Path("assets/ui/vfx@0.25x.webp").exists(), "LOD 0.25x atlas image missing")
        
        # Verify individual image
        self.assertTrue(Path("assets/background.webp").exists(), "Individual background missing")

if __name__ == "__main__":
    unittest.main()
