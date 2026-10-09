# Sprite Sheets Inbox Folder

Place any sprite sheet or template (PNG) downloaded from the web (e.g. The Spriters Resource or community creations) in this folder.

## Supported Formats

- **Sheets with transparent background**: The extractor automatically crops each complete figure using its alpha channel.
- **Sheets with solid background (Chroma-Key)**: If the sheet has a solid color background (e.g. magenta `#FF00FF`, cyan, mint green, white, etc.), the extractor samples corner pixels, detects the chroma key, and isolates the entities with full transparency.
- **Individual pre-cropped sprites**: You can also drop standalone images of buildings, trees, or props.

## Processing Templates

Run in your terminal:

```powershell
npm run prefabs:extract
```

The extracted sprites will be cleanly cropped, categorized (Buildings, Vegetation, Props), and registered immediately in `public/assets/studio/kanto/prefabs/manifest.json`, appearing in the web studio catalog and available for the continental world generator.
