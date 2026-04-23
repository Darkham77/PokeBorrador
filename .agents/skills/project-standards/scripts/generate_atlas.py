import os
import json
from PIL import Image
from pathlib import Path

class ShelfPacker:
    """
    Simple Shelf Bin Packing algorithm for Texture Atlases.
    Optimized for pixel art and icons of varying sizes.
    """
    def __init__(self, max_width=2048, max_height=2048):
        self.max_width = max_width
        self.max_height = max_height
        self.shelves = [] # List of [y, height, current_x]
        self.used_width = 0
        self.used_height = 0

    def pack(self, width, height, padding=2):
        w = width + padding * 2
        h = height + padding * 2

        # Try to fit in existing shelves
        for shelf in self.shelves:
            if shelf[1] >= h and (self.max_width - shelf[2]) >= w:
                x = shelf[2] + padding
                y = shelf[0] + padding
                shelf[2] += w
                self.used_width = max(self.used_width, shelf[2])
                return x, y
        
        # Create new shelf
        y_start = 0
        if self.shelves:
            last_shelf = self.shelves[-1]
            y_start = last_shelf[0] + last_shelf[1]
        
        if y_start + h > self.max_height or w > self.max_width:
            return None # Out of space or too wide
        
        self.shelves.append([y_start, h, w])
        self.used_height = max(self.used_height, y_start + h)
        self.used_width = max(self.used_width, w)
        
        return padding, y_start + padding

def generate_atlas(source_dir, output_base_path, atlas_name, lod_scales=[1.0, 0.5, 0.25]):
    """
    Generates a Texture Atlas (JSON + WebP) from a directory of images.
    Supports multiple LOD scales automatically.
    """
    source_path = Path(source_dir)
    images = []
    
    # Load and sort images by height (descending) for better packing
    for img_path in source_path.glob("*"):
        if img_path.suffix.lower() in {'.png', '.jpg', '.jpeg', '.webp'}:
            try:
                img = Image.open(img_path)
                images.append({
                    'name': img_path.stem,
                    'img': img,
                    'width': img.width,
                    'height': img.height
                })
            except Exception as e:
                print(f"   [ATLAS] Error opening {img_path.name}: {e}")

    if not images:
        print(f"   [ATLAS_ERROR] No valid images found in {source_dir}")
        return False

    # Sort by height descending
    images.sort(key=lambda x: x['height'], reverse=True)

    # Initial packing at 1x
    packer = ShelfPacker()
    frames = {}
    
    for item in images:
        pos = packer.pack(item['width'], item['height'])
        if pos:
            frames[item['name']] = {
                'frame': {'x': pos[0], 'y': pos[1], 'w': item['width'], 'h': item['height']},
                'rotated': False,
                'trimmed': False,
                'spriteSourceSize': {'x': 0, 'y': 0, 'w': item['width'], 'h': item['height']},
                'sourceSize': {'w': item['width'], 'h': item['height']}
            }
        else:
            print(f"   [ATLAS] Warning: {item['name']} did not fit in atlas.")

    # Generate the Atlas files for each LOD
    for scale in lod_scales:
        suffix = ""
        if scale == 0.5: suffix = "@0.5x"
        elif scale == 0.25: suffix = "@0.25x"
        
        atlas_img_name = f"{atlas_name}{suffix}.webp"
        atlas_json_name = f"{atlas_name}{suffix}.json"
        
        scaled_width = int(packer.used_width * scale)
        scaled_height = int(packer.used_height * scale)
        
        # Create destination image
        atlas_img = Image.new('RGBA', (scaled_width, scaled_height), (0, 0, 0, 0))
        
        scaled_frames = {}
        for name, data in frames.items():
            f = data['frame']
            # Scale coordinates and dimensions
            sx = int(f['x'] * scale)
            sy = int(f['y'] * scale)
            # Apply Smart Scaling logic for individual sprites in the atlas
            sprite_scale = scale
            if f['w'] < 500:
                sprite_scale = 1.0 # Keep 100% size for small sprites
            elif scale == 0.25 and f['w'] < 1000:
                sprite_scale = 0.5 # Minimum 50% for medium sprites
            
            sw = max(1, int(f['w'] * sprite_scale))
            sh = max(1, int(f['h'] * sprite_scale))
            
            # Find original image
            orig = next(x for x in images if x['name'] == name)
            resized_sub = orig['img'].resize((sw, sh), Image.Resampling.LANCZOS)
            atlas_img.paste(resized_sub, (sx, sy))
            
            scaled_frames[name] = {
                'frame': {'x': sx, 'y': sy, 'w': sw, 'h': sh},
                'rotated': False,
                'trimmed': False,
                'spriteSourceSize': {'x': 0, 'y': 0, 'w': sw, 'h': sh},
                'sourceSize': {'w': sw, 'h': sh}
            }

        # Save Image
        output_img_path = Path(output_base_path) / atlas_img_name
        atlas_img.save(output_img_path, 'WEBP', lossless=True)
        
        # Save JSON (Phaser Format)
        atlas_data = {
            'frames': scaled_frames,
            'meta': {
                'app': 'PokéVicio Atlas Gen',
                'version': '1.0',
                'image': atlas_img_name,
                'format': 'RGBA8888',
                'size': {'w': scaled_width, 'h': scaled_height},
                'scale': str(scale)
            }
        }
        
        output_json_path = Path(output_base_path) / atlas_json_name
        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(atlas_data, f, indent=2)
            
        print(f"[OK] Generated Atlas LOD ({scale}x): {output_img_path.name}")

    return True

if __name__ == "__main__":
    # Example usage (will be called by convert_to_webp.py)
    import sys
    if len(sys.argv) > 3:
        generate_atlas(sys.argv[1], sys.argv[2], sys.argv[3])
