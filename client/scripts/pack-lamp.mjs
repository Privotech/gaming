import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup } from '@gltf-transform/functions';

async function main() {
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const dir = path.resolve(scriptDir, '../public/assets/models/street-lamp');
  console.log('Optimizing street lamp textures in:', dir);

  // Resize the 4k textures to 1024x1024 (or 512) for mobile & web performance
  const textures = [
    'street_lamp_01_diff_4k.jpg',
    'street_lamp_01_arm_4k.jpg',
    'street_lamp_01_nor_gl_4k.jpg',
  ];

  for (const tex of textures) {
    const fullPath = path.join(dir, tex);
    if (fs.existsSync(fullPath)) {
      const buf = fs.readFileSync(fullPath);
      const resized = await sharp(buf)
        .resize(1024, 1024, { fit: 'inside' })
        .jpeg({ quality: 85 })
        .toBuffer();
      fs.writeFileSync(fullPath, resized);
      console.log(`Resized ${tex}: ${buf.length} -> ${resized.length} bytes`);
    }
  }

  // Now pack the GLTF into a self-contained GLB
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const gltfPath = path.join(dir, 'street_lamp_01_4k.gltf');
  const glbPath = path.join(dir, 'street_lamp_01.glb');

  console.log('Reading GLTF...');
  const doc = await io.read(gltfPath);
  await doc.transform(prune(), dedup());

  console.log('Writing packed GLB to', glbPath);
  const glbBuf = await io.writeBinary(doc);
  fs.writeFileSync(glbPath, Buffer.from(glbBuf));
  console.log(`Successfully generated ${glbPath} (${(glbBuf.byteLength / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error('Error packing lamp:', err);
  process.exit(1);
});
