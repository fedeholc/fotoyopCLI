https://github.com/yargs/yargs

dos formas para trabajar las multiples opciones:
<https://chatgpt.com/c/0a0f92a8-9704-48c1-a13f-0dae68fdea53>

ESM
As of v16,yargs supports ESM imports:

```javascript
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

yargs(hideBin(process.argv))
  .command(
    "curl <url>",
    "fetch the contents of the URL",
    () => {},
    (argv) => {
      console.info(argv);
    }
  )
  .demandCommand(1)
  .parse();
```

```javascript

#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

let borders = [];
let aspectRatio = null;
let size = null;

const argv = yargs(hideBin(process.argv))
  .command('add-border', 'Add a border to the image', {
    width: {
      describe: 'Border width in pixels',
      demandOption: true,
      type: 'number'
    },
    color: {
      describe: 'Border color',
      demandOption: true,
      type: 'string'
    }
  }, (argv) => {
    borders.push({ width: argv.width, color: argv.color });
    console.log(`Border added: ${argv.width}px ${argv.color}`);
  })
  .command('set-aspect-ratio', 'Set the aspect ratio', {
    x: {
      describe: 'X value of the aspect ratio',
      demandOption: true,
      type: 'number'
    },
    y: {
      describe: 'Y value of the aspect ratio',
      demandOption: true,
      type: 'number'
    },
    color: {
      describe: 'Background color',
      demandOption: true,
      type: 'string'
    }
  }, (argv) => {
    aspectRatio = { x: argv.x, y: argv.y, color: argv.color };
    console.log(`Aspect ratio set: ${argv.x}:${argv.y}, color: ${argv.color}`);
  })
  .command('size', 'Set the image size', {
    width: {
      describe: 'Width in pixels',
      demandOption: true,
      type: 'number'
    },
    height: {
      describe: 'Height in pixels',
      demandOption: true,
      type: 'number'
    }
  }, (argv) => {
    size = { width: argv.width, height: argv.height };
    console.log(`Size set: ${argv.width}x${argv.height} pixels`);
  })
  .help()
  .parse();

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
```
