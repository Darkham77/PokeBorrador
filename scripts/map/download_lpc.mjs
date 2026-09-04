import https from 'https';
import fs from 'fs';
import path from 'path';

const targetDir = path.join(process.cwd(), 'scratch', 'map_lab', 'tilesets', 'lpc');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error('Status ' + res.statusCode + ' for ' + url));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log('Downloaded:', path.basename(dest));
          resolve();
        });
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

const baseUrl = 'https://raw.githubusercontent.com/OpenGameArt/LiberatedPixelCup/master/';

const files = [
  ['tileset/original/Sharm/outdoor/PNG/grass.png', 'grass.png'],
  ['tileset/original/Sharm/outdoor/PNG/grassalt.png', 'grassalt.png'],
  ['tileset/original/Sharm/outdoor/PNG/dirt.png', 'dirt.png'],
  ['tileset/original/Sharm/outdoor/PNG/dirt2.png', 'dirt2.png'],
  ['tileset/original/Sharm/outdoor/PNG/treetop.png', 'treetop.png'],
  ['tileset/original/Sharm/outdoor/PNG/trunk.png', 'trunk.png'],
  ['tileset/original/Sharm/outdoor/PNG/water.png', 'water.png'],
  ['tileset/original/Sharm/outdoor/PNG/watergrass.png', 'watergrass.png'],
  ['tileset/original/Sharm/outdoor/PNG/mountains.png', 'mountains.png'],
  ['tileset/original/Sharm/outdoor/PNG/rock.png', 'rock.png'],
  ['tileset/original/Sharm/outdoor/PNG/bridges.png', 'bridges.png'],
  ['tileset/original/Sharm/building-exterior/house.png', 'house.png'],
  ['tileset/original/HughSpectrum/castle_outside.png', 'castle_outside.png'],
  ['tileset/original/HughSpectrum/castlewalls.png', 'castlewalls.png'],
  ['tileset/original/Sharm/misc/shadow.png', 'shadow.png']
];

async function run() {
  console.log('Downloading Liberated Pixel Cup (LPC) high-res tilesets...');
  for (const [remotePath, localName] of files) {
    const url = baseUrl + remotePath;
    const dest = path.join(targetDir, localName);
    try {
      await downloadFile(url, dest);
    } catch(e) {
      console.error('Error downloading ' + localName + ':', e.message);
    }
  }
  console.log('Done downloading LPC tilesets!');
}

run();
