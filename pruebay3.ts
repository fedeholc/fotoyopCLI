#!/usr/bin/env node

import yargs, { ArgumentsCamelCase, InferredOptionTypes } from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';

let borders: { width: any; color: any; }[] = [];
let aspectRatio: { x: any; y: any; color: any } = { x: 0, y: 0, color: '' };
let size: { width: any; height: any } = { width: 0, height: 0 };

// remueve el primer argumento que es el path del ejecutable 
let argv = hideBin(process.argv);

const addBorderOptions: { width: {}, color: {} } = {
  width: {
    alias: 'w',
    describe: 'Border width in pixels',
    demandOption: true,
    type: 'number'
  },
  color: {
    alias: 'c',
    describe: 'Border color',
    demandOption: true,
    type: 'string'
  }
};

const setAspectRatioOptions: { x: {}, y: {}, color: {} } = {
  x: {
    alias: 'x',
    describe: 'X value of the aspect ratio',
    demandOption: true,
    type: 'number'
  },
  y: {
    alias: 'y',
    describe: 'Y value of the aspect ratio',
    demandOption: true,
    type: 'number'
  },
  color: {
    alias: 'c',
    describe: 'Background color',
    demandOption: true,
    type: 'string'
  }
};

const setSizeOptions: { width: {}, height: {} } = {
  width: {
    alias: 'w',
    describe: 'Width in pixels',
    demandOption: true,
    type: 'number'
  },
  height: {
    alias: 'h',
    describe: 'Height in pixels',
    demandOption: true,
    type: 'number'
  }
};

function addBorderHandler(argv: ArgumentsCamelCase<InferredOptionTypes<typeof addBorderOptions>>) {
  borders.push({ width: argv.width, color: argv.color });
  console.log(`Border added: ${argv.width}px ${argv.color}`);
};

function setAspectRatioHandler(argv: ArgumentsCamelCase<InferredOptionTypes<typeof setAspectRatioOptions>>) {
  aspectRatio = { x: argv.x, y: argv.y, color: argv.color };
  console.log(`Aspect ratio set: ${argv.x}:${argv.y}, color: ${argv.color}`);
};

function setSizeHandler(argv: ArgumentsCamelCase<InferredOptionTypes<typeof setSizeOptions>>) {
  size = { width: argv.width, height: argv.height };
  console.log(`Size set: ${argv.width}x${argv.height} pixels`);
};


// en argv vienen los argumentos que se pasan al ejecutar el script

// checkiamos que el primer argumento sea un directorio y tenga imagenes
console.log(argv);
const directory = argv[0];

if (!fs.existsSync(directory) || !fs.lstatSync(directory).isDirectory()) {
  console.error('The specified directory does not exist or is not a directory.');
  process.exit(1);
}
// check if there are jpg files in the directory
const files = fs.readdirSync(directory);
const jpgFiles = files.filter(file => file.endsWith('.jpg'));
if (jpgFiles.length === 0) {
  console.error('The specified directory does not contain any jpg files.');
  process.exit(1);
}

argv.shift(); // remove the directory from the arguments

console.log("argv:", argv);

// los argumentos pueden ser los comandos con sus parámetros o un archivo que contiene los comandos con sus parámetros (usando --file <archivo>)

// si viene en un archivo (que tiene el formato de un comando con sus parámetros por linea) ej:
/*
add-border -w 22 --color red
add-border -w 1 --color blue
*/
// hay que transformarlo primero en un array de strings de esta forma: ['add-border', '-w', '22', '--color', 'red', 'add-border', '-w', '1', '--color', 'blue']

if (argv.includes('--file')) {
  const fileIndex = argv.indexOf('--file');
  const filePath = argv[fileIndex + 1];
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  argv = fileContent.replace(/(\r\n|\n|\r)/gm, " ").trim().split(" ");
}

/* luego, como el objetivo es poder procesar varios comandos, hay que separar los comandos en arrays de strings de esta forma: 
[
  ['add-border', '-w', '22', '--color', 'red'], 
  ['add-border', '-w', '1', '--color', 'blue']
]
*/
const commandList = ['add-border', 'set-aspect-ratio', 'size'];

function getNextCommandPosition(argv: string[], prevPosition: number, commandList: string[]) {
  for (let j = prevPosition + 1; j < argv.length; j++) {
    if (commandList.includes(argv[j])) {
      return j;
    }
  }
  return argv.length;
}

const commands = [];

for (let i = 0; i < argv.length; i++) {
  if (commandList.includes(argv[i])) {
    let ncp = getNextCommandPosition(argv, i, commandList);
    commands.push(argv.slice(i, ncp));
  }
}

console.log("commands:", commands);
// finalmente se procesa cada comando con yargs
commands.forEach(command => {
  yargs(command)
    .command('add-border', 'Add a border to the image', addBorderOptions, addBorderHandler)
    .command('set-aspect-ratio', 'Set the aspect ratio', setAspectRatioOptions, setAspectRatioHandler)
    .command('size', 'Set the image size', setSizeOptions, setSizeHandler)
    .help()
    .parse();
});

if (commands.length === 0) {
  console.log(`
    Usage:  my-cli <directory> [command] [options]
            my-cli <directory> --file <file>

    Commands:
      add-border        Add a border to the image
      set-aspect-ratio  Set the aspect ratio
      size              Set the image size

    Options:
      --help            Show help
      --version         Show version number

    Examples:
      my-cli add-border --width 10 --color red
      my-cli set-aspect-ratio --ratio 16:9
      my-cli size --width 1920 --height 1080
  `);
  console.error('Please provide a command.');
  process.exit(1);
}

// Mostrar resumen de la configuración al final
if (borders.length > 0 || aspectRatio || size) {
  console.log('\nConfiguration summary:');
  if (borders.length > 0) {
    console.log('Borders:');
    borders.forEach((border, index) => {
      console.log(`  ${index + 1}. ${border.width}px ${border.color}`);
    });
  }
  if (aspectRatio) {
    console.log(`Aspect ratio: ${aspectRatio.x}:${aspectRatio.y}, color: ${aspectRatio.color}`);
  }
  if (size) {
    console.log(`Size: ${size.width}x${size.height} pixels`);
  }
}