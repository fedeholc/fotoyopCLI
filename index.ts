import fs from "fs";
import * as fs_a from 'node:fs/promises';
import path from 'path';
import { createCanvas, loadImage } from "canvas";
import { applyProcessFunction, imgAddBorder, imgAddCanvas, ProcessFunction } from "./imageProcessing.js";

// Ruta de la imagen de entrada (pasada como argumento en la CLI)
//const inputImagePath = process.argv[2];
const directoryPath = process.argv[2];

if (!directoryPath) {
  console.error('Por favor, proporciona un directorio como argumento.');
  process.exit(1);
}

let jpgFilePaths: string[] = [];

console.log('Leyendo archivos del directorio:', directoryPath);
let files: string[] = [];
try {
  files = await fs_a.readdir(directoryPath);
} catch (err) {
  console.error('Error al leer el directorio:', err);
  process.exit(1);
}

// Filtra los archivos con la extensión .jpg
const jpgFiles = files.filter(file => path.extname(file).toLowerCase() === '.jpg');

// Crea un array con el path y nombre de cada archivo .jpg
jpgFilePaths = jpgFiles.map(file => path.join(directoryPath, file));

jpgFilePaths.forEach(async (inputImagePath) => {

  let image = await loadImage(inputImagePath);
  let borde = 0;// tamaño borde negro
  let borde2 = 40; //tamaño borde blanco


  //* defino tamaño final que quiero, y de cuando tendría que ser entonces el tamaño de la imagen para que al sumarle los bordes quede del tamaño final deseado
  //* esto es así porque después la función de borde suma tamaño, es decir toma el que viene y le agrega el extra del borde
  //* en este caso está pensado para que quede horizontal de 1080 (ancho del teléfono), y luego la función de canva le va a agregar el alto para que quede en 9:16
  //* para un formato en el que se le va a agregar tamaño horizontal habría que pensarlo de otro modo 
  let finalSize = 1080
  let noBordersSize = finalSize - (borde2 * 2) - (borde * 2);

  const canvas = createCanvas(noBordersSize, image.height * (noBordersSize / image.width));
  const ctx = canvas.getContext("2d");
  console.log(image.width, image.height);
  console.log("canvas: ", canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  var newImageData = applyProcessFunction(
    canvas as unknown as HTMLCanvasElement,
    imgAddBorder as ProcessFunction,
    { BorderPixels: borde.toString(), BorderColor: "black" }
  );
  ctx.putImageData(newImageData, 0, 0);

  var newImageData = applyProcessFunction(
    canvas as unknown as HTMLCanvasElement,
    imgAddBorder as ProcessFunction,
    { BorderPixels: borde2.toString(), BorderColor: "white" }
  );
  ctx.putImageData(newImageData, 0, 0);

  var newImageData = applyProcessFunction(
    canvas as unknown as HTMLCanvasElement,
    imgAddCanvas as ProcessFunction,
    { CanvasColor: "white", ratioX: 1, ratioY: 1 }
  );

  ctx.putImageData(newImageData, 0, 0);

  // Guarda la imagen con el borde en otro archivo
  const outputImagePath = "output-image.png";
  const out = fs.createWriteStream(outputImagePath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on("finish", () => {
    console.log(`Imagen con borde guardada en ${outputImagePath}`);
  });

  //write file to disk
  let nombre = path.basename(inputImagePath);
  fs.writeFileSync(path.dirname(inputImagePath) + "/" + nombre + "_916" + ".png", canvas.toBuffer());
}
);  
