import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import sharp from 'sharp';

const INPUT_DIR = path.resolve('cards-original');
const OUTPUT_DIR = path.resolve('public/players');
const PLAYERS_FILE = path.resolve('src/app/data/players.ts');

const WIDTH = 410;
const QUALITY = 82;

const SUPPORTED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp'
];

const POSITION_MAP = {
  goleiro: 'Goleiro',
  defensor: 'Defensor',
  defesa: 'Defensor',
  zagueiro: 'Defensor',
  meia: 'Meia',
  meio: 'Meia',
  atacante: 'Atacante',
  ataque: 'Atacante'
};

function isImage(fileName) {
  return SUPPORTED_EXTENSIONS.includes(
    path.extname(fileName).toLowerCase()
  );
}

function escapeString(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function normalizeName(name) {
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePlayer(fileName) {

  const extension = path.extname(fileName);

  const baseName = path.basename(
    fileName,
    extension
  );

  const parts = baseName.split('_');

  if (parts.length < 2) {
    console.warn(
      `⚠️ Ignorado: ${fileName}`
    );

    console.warn(
      '   Formato esperado: Nome_Posicao.ext'
    );

    return null;
  }

  // A última parte é sempre a posição.
  // Isso permite nomes como:
  // "Vinicius-Junior_atacante.png"
  // "Van-Dijk_defensor.png"
  const positionText = parts.pop();

  // Tudo que sobrou é o nome do jogador
  const name = normalizeName(
    parts.join('_')
  );

  const positionKey = positionText
    .trim()
    .toLowerCase();

  const position = POSITION_MAP[positionKey];

  if (!position) {
    console.warn(
      `⚠️ Posição inválida em: ${fileName}`
    );

    console.warn(
      '   Use: goleiro, defensor, meia ou atacante'
    );

    return null;
  }

  return {
    name,
    position,
    fileName
  };
}

function getOutputPath(fileName) {

  const baseName = path.basename(
    fileName,
    path.extname(fileName)
  );

  return path.join(
    OUTPUT_DIR,
    `${baseName}.webp`
  );
}

async function optimizeImage(fileName) {

  const inputPath = path.join(
    INPUT_DIR,
    fileName
  );

  const outputPath = getOutputPath(
    fileName
  );

  try {

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

    console.log(
      `✅ Imagem: ${fileName}`
    );

  } catch (error) {

    console.error(
      `❌ Erro em ${fileName}`
    );

    console.error(
      error.message
    );
  }
}

function removeOptimizedImage(fileName) {

  const outputPath = getOutputPath(
    fileName
  );

  if (fs.existsSync(outputPath)) {

    fs.unlinkSync(outputPath);

    console.log(
      `🗑️ WebP removido: ${path.basename(outputPath)}`
    );
  }
}

function generatePlayersFile() {

  const files = fs.readdirSync(INPUT_DIR)
    .filter(isImage);

  const players = [];

  for (const fileName of files) {

    const player = parsePlayer(fileName);

    if (player) {
      players.push(player);
    }
  }

  players.sort((a, b) =>
    a.name.localeCompare(
      b.name,
      'pt-BR'
    )
  );

  const playersCode = players
    .map((player, index) => {

      const baseName = path.basename(
        player.fileName,
        path.extname(player.fileName)
      );

      return `  {
    id: ${index + 1},
    name: '${escapeString(player.name)}',
    position: '${player.position}',
    photo: '/players/${escapeString(baseName)}.webp'
  }`;

    })
    .join(',\n');

  const content = `import { Player } from '../core/models/player';

export const PLAYERS: Player[] = [
${playersCode}
];
`;

  fs.mkdirSync(
    path.dirname(PLAYERS_FILE),
    {
      recursive: true
    }
  );

  fs.writeFileSync(
    PLAYERS_FILE,
    content,
    'utf8'
  );

  console.log(
    `📄 players.ts: ${players.length} jogadores`
  );
}

async function processAll() {

  fs.mkdirSync(
    INPUT_DIR,
    {
      recursive: true
    }
  );

  fs.mkdirSync(
    OUTPUT_DIR,
    {
      recursive: true
    }
  );

  const files = fs.readdirSync(INPUT_DIR)
    .filter(isImage);

  console.log(
    `🔎 ${files.length} cartas encontradas`
  );

  for (const fileName of files) {
    await optimizeImage(fileName);
  }

  generatePlayersFile();
}

await processAll();

console.log('');
console.log('========================================');
console.log('👀 MONITORANDO CARDS');
console.log('========================================');
console.log('');
console.log(
  'Adicione, altere ou remova cartas em:'
);
console.log(INPUT_DIR);
console.log('');

const watcher = chokidar.watch(
  INPUT_DIR,
  {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  }
);

let timer;

function update() {

  clearTimeout(timer);

  timer = setTimeout(async () => {

    console.log('');

    await processAll();

    console.log('');

  }, 500);
}

watcher.on('add', filePath => {

  console.log(
    `📥 Nova carta: ${path.basename(filePath)}`
  );

  update();
});

watcher.on('change', filePath => {

  console.log(
    `✏️ Carta alterada: ${path.basename(filePath)}`
  );

  update();
});

watcher.on('unlink', filePath => {

  console.log(
    `🗑️ Carta removida: ${path.basename(filePath)}`
  );

  removeOptimizedImage(
    path.basename(filePath)
  );

  update();
});