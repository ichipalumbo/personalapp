const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const targets = [
  path.join(rootDir, 'src', 'utils', 'time.js'),
  path.join(rootDir, 'src', 'services', 'agendamentoService.js'),
  path.join(rootDir, 'src', 'services', 'gcalSyncService.js'),
  path.join(rootDir, 'src', 'controllers', 'agendamentoController.js'),
  path.join(rootDir, 'src', 'controllers', 'gcalAuthController.js')
]

function readCount(filePath, pattern) {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

function main() {
  console.log('Agenda format normalization check');
  console.log(`Base: ${rootDir}`);
  console.log('');

  targets.forEach((filePath) => {
    const exists = fs.existsSync(filePath);
    const relativePath = path.relative(rootDir, filePath);

    if (!exists) {
      console.log(`- ${relativePath}: missing`);
      return;
    }

    const normalizeCount = readCount(filePath, /normalizar|normalize|converterHorarioParaMinutos|normalizarDataParaISO|normalizarHorarioHHMM/gi);
    console.log(`- ${relativePath}: ${normalizeCount} normalization-related references`);
  });

  console.log('');
  console.log('This script is read-only and safe for local validation.');
}

main();