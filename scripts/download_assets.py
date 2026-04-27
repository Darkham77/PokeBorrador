import os
import urllib.request
import re
import json

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, 'external_assets')
SRC_DIR = os.path.join(os.path.dirname(BASE_DIR), 'src')

POKEAPI_SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'
POKEAPI_ITEM_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/'
SHOWDOWN_TRAINER_BASE = 'https://play.pokemonshowdown.com/sprites/trainers/'

def download_file(url, folder, filename):
    os.makedirs(folder, exist_ok=True)
    
    filepath = os.path.join(folder, filename)
    if os.path.exists(filepath):
        # print(f"Skipping {filename}, already exists.")
        return

    try:
        print(f"Downloading {url}...", flush=True)
        opener = urllib.request.build_opener()
        opener.addheaders = [('User-agent', 'Mozilla/5.0')]
        urllib.request.install_opener(opener)
        urllib.request.urlretrieve(url, filepath)
    except Exception as e:
        print(f"Error downloading {url}: {e}", flush=True)

def extract_from_js(filepath, start_marker, end_marker):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            start = content.find(start_marker)
            if start == -1: return ""
            end = content.find(end_marker, start)
            if end == -1: return ""
            return content[start:end]
    except:
        return ""

def get_item_mapping():
    path = os.path.join(SRC_DIR, 'logic', 'services', 'assetService.js')
    block = extract_from_js(path, 'const ITEM_MAPPING = {', '};')
    # Simple regex to get keys and values
    matches = re.findall(r"['\"]?([\w_]+)['\"]?:\s*['\"]([\w-]+)['\"]", block)
    return {k: v for k, v in matches}

def get_showdown_trainers():
    path = os.path.join(SRC_DIR, 'logic', 'services', 'assetService.js')
    block = extract_from_js(path, 'const showdownTrainers = [', '];')
    matches = re.findall(r"['\"]([\w-]+)['\"]", block)
    return matches

def get_all_item_sprites():
    path = os.path.join(SRC_DIR, 'data', 'items.js')
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Find all sprite: '...' entries
            matches = re.findall(r"sprite:\s*['\"]([\w-]+)['\"]", content)
            return list(set(matches))
    except:
        return []

def main():
    print("Starting asset download...", flush=True)
    
    # 1. POKEMON (1-251)
    print("Fetching Pokemon sprites...", flush=True)
    poke_folder = os.path.join(OUTPUT_DIR, 'pokemon')
    for i in range(1, 252):
        # Front
        download_file(f"{POKEAPI_SPRITE_BASE}{i}.png", poke_folder, f"{i}.png")
        # Shiny
        download_file(f"{POKEAPI_SPRITE_BASE}shiny/{i}.png", os.path.join(poke_folder, 'shiny'), f"{i}.png")
        # Back
        download_file(f"{POKEAPI_SPRITE_BASE}back/{i}.png", os.path.join(poke_folder, 'back'), f"{i}.png")
        # Back Shiny
        download_file(f"{POKEAPI_SPRITE_BASE}back/shiny/{i}.png", os.path.join(poke_folder, 'back', 'shiny'), f"{i}.png")

    # 2. ITEMS
    print("Fetching Item sprites...", flush=True)
    item_folder = os.path.join(OUTPUT_DIR, 'items')
    
    # Mapping items
    mapping = get_item_mapping()
    for internal_id, pokeapi_slug in mapping.items():
        download_file(f"{POKEAPI_ITEM_BASE}{pokeapi_slug}.png", item_folder, f"{pokeapi_slug}.png")
    
    # All sprites found in items.js
    all_sprites = get_all_item_sprites()
    for sprite in all_sprites:
        # Check if it looks like a PokeAPI item (contains dash, or known keywords)
        # We reuse the logic from assetService.js roughly
        slug = mapping.get(sprite, sprite.replace('_', '-'))
        download_file(f"{POKEAPI_ITEM_BASE}{slug}.png", item_folder, f"{slug}.png")

    # Egg special case
    download_file(f"{POKEAPI_ITEM_BASE}egg.png", item_folder, "egg.png")

    # 3. TRAINERS
    print("Fetching Trainer sprites...", flush=True)
    trainer_folder = os.path.join(OUTPUT_DIR, 'trainers')
    trainers = get_showdown_trainers()
    for t in trainers:
        download_file(f"{SHOWDOWN_TRAINER_BASE}{t}.png", trainer_folder, f"{t}.png")

    print("\nDownload complete! Assets are in:", OUTPUT_DIR, flush=True)

if __name__ == "__main__":
    main()
