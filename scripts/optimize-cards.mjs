import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import sharp from 'sharp';

const INPUT_DIR = path.resolve('cards-original');
const OUTPUT_DIR = path.resolve('public/players');

const WIDTH = 410;
const QUALITY = 82;

const SUPPORTED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp'
];

function isImage(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  return SUPPORTED_EXTENSIONS.includes(extension);
}

function getOutputPath(inputPath) {
  const fileName = path.basename(
    inputPath,
    path.extname(inputPath)
  );

  return path.join(
    OUTPUT_DIR,
    `${fileName}.webp`
  );
}

async function optimizeImage(inputPath) {

  if (!isImage(inputPath)) {
    return;
  }

  const outputPath = getOutputPath(inputPath);

  try {

    console.log(`🔄 Otimizando: ${path.basename(inputPath)}`);

    await sharp(inputPath)
      .resize({
        width: WIDTH,
        withoutEnlargement: true
      })
      .webp({
        quality: QUALITY,
        alphaQuality: QUALITY
      })
      .toFile(outputPath);

    const inputStats = fs.statSync(inputPath);
    const outputStats = fs.statSync(outputPath);

    const inputKB = (inputStats.size / 1024).toFixed(1);
    const outputKB = (outputStats.size / 1024).toFixed(1);

    console.log(
      `✅ ${path.basename(outputPath)}`
    );

    console.log(
      `   ${inputKB} KB → ${outputKB} KB`
    );

  } catch (error) {

    console.error(
      `❌ Erro ao processar ${inputPath}`
    );

    console.error(error.message);
  }
}

function removeOptimizedImage(inputPath) {

  if (!isImage(inputPath)) {
    return;
  }

  const outputPath = getOutputPath(inputPath);

  if (fs.existsSync(outputPath)) {

    fs.unlinkSync(outputPath);

    console.log(
      `🗑️ Removido: ${path.basename(outputPath)}`
    );
  }
}

async function processExistingImages() {

  console.log('');
  console.log('================================');
  console.log('   FUTEBOL DRAFT - OTIMIZADOR');
  console.log('================================');
  console.log('');

  fs.mkdirSync(INPUT_DIR, {
    recursive: true
  });

  fs.mkdirSync(OUTPUT_DIR, {
    recursive: true
  });

  const files = fs.readdirSync(INPUT_DIR);

  const images = files.filter(file =>
    isImage(file)
  );

  if (images.length === 0) {

    console.log(
      '📁 Nenhuma imagem encontrada.'
    );

    console.log(
      `Coloque as cartas em: ${INPUT_DIR}`
    );

    console.log('');
    return;
  }

  console.log(
    `Encontradas ${images.length} imagens.`
  );

  console.log('');

  for (const file of images) {

    const inputPath = path.join(
      INPUT_DIR,
      file
    );

    await optimizeImage(inputPath);
  }

  console.log('');
  console.log('✅ Processamento inicial concluído.');
  console.log('');
}

await processExistingImages();

console.log('👀 Monitorando novas imagens...');
console.log('   Coloque ou altere cartas em:');
console.log(`   ${INPUT_DIR}`);
console.log('');

const watcher = chokidar.watch(INPUT_DIR, {

  ignoreInitial: true,

  awaitWriteFinish: {
    stabilityThreshold: 500,
    pollInterval: 100
  }
});

watcher.on('add', async filePath => {

  console.log('');
  console.log('📥 Nova carta detectada');

  await optimizeImage(filePath);
});

watcher.on('change', async filePath => {

  console.log('');
  console.log('✏️ Carta alterada');

  await optimizeImage(filePath);
});

watcher.on('unlink', filePath => {

  console.log('');
  console.log('🗑️ Carta removida');

  removeOptimizedImage(filePath);
});