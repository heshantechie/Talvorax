import https from 'https';
import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'public', 'models', 'face_detection');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Ensure the favicon exists
const faviconDest = path.join(process.cwd(), 'public', 'favicon.ico');
if (!fs.existsSync(faviconDest)) {
    // Generate a minimal valid ico logic (or just download one)
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  console.log('Downloading model files...');
  try {
    await download('https://tfhub.dev/mediapipe/tfjs-model/face_detection/short/1/model.json?tfjs-format=file', path.join(outDir, 'model.json'));
    await download('https://tfhub.dev/mediapipe/tfjs-model/face_detection/short/1/group1-shard1of1.bin?tfjs-format=file', path.join(outDir, 'group1-shard1of1.bin'));
    console.log('Model downloaded successfully!');
  } catch (err) {
    console.error('Download failed:', err);
  }
}

run();
