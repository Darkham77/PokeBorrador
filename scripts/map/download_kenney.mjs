import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const targetDir = path.join(process.cwd(), 'scratch', 'map_lab', 'tilesets', 'kenney');
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

async function run() {
  const microZip = path.join(targetDir, 'micro-roguelike.zip');
  const tinyTownZip = path.join(targetDir, 'tiny-town.zip');

  console.log('Downloading Kenney packs...');
  await downloadFile('https://opengameart.org/sites/default/files/kenney_microroguelike_1.2.zip', microZip);
  await downloadFile('https://opengameart.org/sites/default/files/kenney_tiny-town.zip', tinyTownZip);

  console.log('Extracting ZIPs...');
  const microExtract = path.join(targetDir, 'micro-roguelike');
  const townExtract = path.join(targetDir, 'tiny-town');

  execSync(`powershell -Command "Expand-Archive -Path '${microZip}' -DestinationPath '${microExtract}' -Force"`);
  execSync(`powershell -Command "Expand-Archive -Path '${tinyTownZip}' -DestinationPath '${townExtract}' -Force"`);

  console.log('Extracted successfully!');
}

run().catch(console.error);
