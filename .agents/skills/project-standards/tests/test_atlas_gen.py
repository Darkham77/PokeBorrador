import unittest
import sys
import os
from pathlib import Path

# Fix path to find generate_atlas.py in the scripts folder
script_dir = Path(__file__).parent.parent / "scripts"
if str(script_dir) not in sys.path:
    sys.path.insert(0, str(script_dir))

from generate_atlas import ShelfPacker

class TestShelfPacker(unittest.TestCase):
    def test_packing_first_item(self):
        """Should pack the first item at (0,0) with padding."""
        packer = ShelfPacker(max_width=100, max_height=100)
        padding = 2
        pos = packer.pack(10, 10, padding=padding)
        # Coordinates should be (padding, padding)
        self.assertEqual(pos, (padding, padding))
        self.assertEqual(packer.used_width, 10 + padding * 2)
        self.assertEqual(packer.used_height, 10 + padding * 2)

    def test_horizontal_fit(self):
        """Should fit multiple items on the same shelf if width allows."""
        packer = ShelfPacker(max_width=100, max_height=100)
        # First item
        p1 = packer.pack(20, 20, padding=0)
        # Second item same height
        p2 = packer.pack(20, 20, padding=0)
        
        self.assertEqual(p1, (0, 0))
        self.assertEqual(p2, (20, 0))
        self.assertEqual(packer.used_width, 40)

    def test_new_shelf_trigger(self):
        """Should start a new shelf if an item doesn't fit horizontally."""
        packer = ShelfPacker(max_width=50, max_height=100)
        # Fills most of the first shelf
        packer.pack(30, 20, padding=0)
        # Second item (30) doesn't fit horizontally (30+30 > 50)
        p2 = packer.pack(30, 20, padding=0)
        
        self.assertEqual(p2, (0, 20))
        self.assertEqual(packer.used_height, 40)

    def test_oversize_rejection(self):
        """Should return None if item is larger than max dimensions."""
        packer = ShelfPacker(max_width=50, max_height=50)
        pos = packer.pack(60, 10)
        self.assertIsNone(pos)
        
        pos2 = packer.pack(10, 60)
        self.assertIsNone(pos2)

    def test_padding_isolation(self):
        """Should ensure padding prevents overlap."""
        packer = ShelfPacker(max_width=100, max_height=100)
        p1 = packer.pack(10, 10, padding=5)
        # x=5, y=5. Next item on same shelf should be at x=10+5+5=20
        p2 = packer.pack(10, 10, padding=5)
        self.assertEqual(p1, (5, 5))
        self.assertEqual(p2, (25, 5)) # 20 (end of p1 including padding) + 5 (p2 padding)

if __name__ == "__main__":
    unittest.main()
