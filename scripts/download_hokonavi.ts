
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const urls = {
  'daimon_node.geojson': 'https://ckan.hokonavi.go.jp/dataset/203730b0-45de-4573-a353-a13d7270d076/resource/73ccc910-cb2f-4523-b9f2-8321b714e7aa/download/node.geojson',
  'ueno_link.geojson': 'https://ckan.hokonavi.go.jp/dataset/2df4cb39-8b2e-4692-97ea-3f6b4132c109/resource/16c453cb-21c0-4e38-8975-0a35803b7edc/download/link.geojson',
  'ueno_node.geojson': 'https://ckan.hokonavi.go.jp/dataset/2df4cb39-8b2e-4692-97ea-3f6b4132c109/resource/80140abb-8e4b-4083-b6e6-c96e28221bec/download/node.geojson',
  'oedo_nwd.zip': 'https://api-public.odpt.org/api/v4/files/hokonavi/data/nwd_oedo_ueno-okachimachi_geojson.zip'
};

const outputDir = path.join(process.cwd(), 'temp_data_new');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

async function downloadFile(name: string, url: string) {
  const filePath = path.join(outputDir, name);
  console.log(`Downloading ${name}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    const fileStream = fs.createWriteStream(filePath);
    // @ts-ignore
    await finished(Readable.fromWeb(res.body).pipe(fileStream));
    console.log(`Saved ${name}`);
  } catch (err) {
    console.error(`Error downloading ${name}:`, err);
  }
}

async function main() {
  for (const [name, url] of Object.entries(urls)) {
    await downloadFile(name, url);
  }
}

main();
