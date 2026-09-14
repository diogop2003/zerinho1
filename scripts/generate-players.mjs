import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';

const INPUT_DIR = path.resolve('cards-original');
const OUTPUT_DIR = path.resolve('public/players');
const PLAYERS_FILE = path.resolve('src/app/data/players.ts');

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
  const extension = path.extname(fileName).toLowerCase();

  return SUPPORTED_EXTENSIONS.includes(extension);
}

function normalizeName(name) {
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePosition(position) {
  const normalized = position
    .trim()
    .toLowerCase();

  return POSITION_MAP[normalized] ?? null;
}

function parseFileName(fileName) {
  const extension = path.extname(fileName);

  const baseName = path.basename(
    fileName,
    extension
  );

  const parts = baseName.split('__');

  if (parts.length !== 2) {
    console.warn(
      `⚠️ Ignorado: "${fileName}"`
    );

    console.warn(
      '   Formato esperado: Nome__Posicao.ext'
    );

    return null;
  }

  const name = normalizeName(parts[0]);
  const position = normalizePosition(parts[1]);

  if (!position) {
    console.warn(
      `⚠️ Posição inválida: "${parts[1]}"`
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

function generatePlayerId(index) {
  return index + 1;
}

function generatePlayersFile(players) {

  const imports = `import { Player } from '../core/models/player';`;

  const playersCode = players
    .map((player, index) => {

      const id = generatePlayerId(index);

      const photoName = path.basename(
        player.fileName,
        path.extname(player.fileName)
      );

      return `  {
    id: ${id},
    name: '${escapeString(player.name)}',
    position: '${player.position}',
    photo: '/players/${escapeString(photoName)}.webp'
  }`;
    })
    .join(',\n');

  const content = `${imports}

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
    `📄 players.ts atualizado: ${players.length} jogadores`
  );
}

function escapeString(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function generatePlayers() {

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

  const players = [];

  for (const fileName of files) {

    const player = parseFileName(fileName);

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

  generatePlayersFile(players);
}

console.log('');
console.log('========================================');
console.log('       FUTEBOL DRAFT - PLAYERS');
console.log('========================================');
console.log('');

generatePlayers();

console.log('');
console.log('👀 Monitorando cards-original...');
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

let timeout;

function regenerate() {

  clearTimeout(timeout);

  timeout = setTimeout(() => {

    console.log('');
    console.log('🔄 Atualizando jogadores...');

    generatePlayers();

    console.log('');

  }, 300);
}

watcher.on('add', filePath => {

  console.log(
    `📥 Nova carta: ${path.basename(filePath)}`
  );

  regenerate();
});

watcher.on('change', filePath => {

  console.log(
    `✏️ Carta alterada: ${path.basename(filePath)}`
  );

  regenerate();
});

watcher.on('unlink', filePath => {

  console.log(
    `🗑️ Carta removida: ${path.basename(filePath)}`
  );

  regenerate();
});