import { Canvas } from "canvas";

export enum Orientation {
  vertical,
  horizontal,
}
export enum toolbarRow {
  mainMenu = "mainMenu",
  edit = "edit",
  border = "border",
  borderPx = "borderPx",
  borderPc = "borderPc",
  canvas = "canvas",
  collage = "collage",
  flow = "flow",
  arrange = "arrange",
}

export enum ImageProcess {
  Border = "Border",
  Grayscale = "Grayscale",
  Canvas = "Canvas",
}

export type WindowsDimensions = {
  width: number;
  height: number;
  mobileToolbarHeight: number;
  mobileToolbarWidth: number;
};

/**
 * Define la configuración del canvas principal.
 */
export type AppConfig = {
  canvasMaxWidth: number;
  canvasMaxHeight: number;
  canvasMargin: number;
  collagePreviewSize: number;
};

//? Sería mejor usar enums?
//? al parecer la ventaja de los strings literals es que se pueden componer juntando con otros. Tal vez podría tener un tipo de opciones para bordes y otro tipo de opciones para otras transformaciones. ¿Se podría hacer que cada funcion acepte las opciones que le correspondan nada más mientras que el tipo de la función (ImageDataTransformFunction) acepte cualquier opción?

const BorderOptionsKeys = {
  BorderPercent: "BorderPercent",
  BorderPixels: "BorderPixels",
  BorderColor: "BorderColor",
} as const;

//este tipo son las keys de processOptionsKeys
type BorderOptionsKeysType = keyof typeof BorderOptionsKeys;

//este tipo es un par key-value con las keys de processOptionsKeys y valores string
export type BorderOptionsType = {
  [key in BorderOptionsKeysType]?: string;
};

export type CanvasOptions = { CanvasColor: string, ratioX: number, ratioY: number };

/**
 * Tipo de función que toma un ImageData y devuelve otro ImageData transformado.
 */
export type ProcessFunction = (
  inputImageData: ImageData,
  options?: BorderOptionsType | CanvasOptions
) => ImageData;

/**
 * Define los estados de visibilidad de las diferentes secciones de la aplicación.
 */
export type DisplaySections = {
  form: boolean;
  canvas: boolean;
  resizeTrigger: boolean;
  collage: boolean;
};

export type BottomToolbarDisplay = {
  mainMenu: boolean;
  edit: boolean;
  border: boolean;
  borderPx: boolean;
  borderPc: boolean;
  canvas: boolean;
  collage: boolean;
  flow: boolean;
  arrange: boolean;
};


export {
  imgToBW,
  imgAddBorder,
  hexToRgb,
  getAdaptedSize,
  getImageFromFile,
  drawImageB64OnCanvas,
  applyProcessList,
  applyProcessFunction,
  applyProcessFunctionWithSize,
  processImgToCanvas,
  processToNewImageData,
  putImageDataOnCanvas,
  imageB64ToImageData,
  imageB64ToImageDataWithOrientation,
  imageDataToBase64,
  //calcResizeToWindow,
  getResizedGap,
};

function getResizedGap(
  gapPx: number,
  orientation: Orientation,
  collageImages: HTMLImageElement[],
  maxSize: number
) {
  let resizedGap = 0;
  let data = getCollageData(collageImages, maxSize);
  if (orientation === Orientation.vertical) {
    resizedGap = (gapPx * data.ivHeightSum) / data.imagesHeightsSum;
  } else {
    resizedGap = (gapPx * data.ihWidthSum) / data.imagesWidthsSum;
  }
  return resizedGap;
}

function getMinSize(images: HTMLImageElement[]): {
  width: number;
  height: number;
} {
  let minWidth = images[0].width;
  let minHeight = images[0].height;
  images.forEach((image) => {
    if (image.width < minWidth) {
      minWidth = image.width;
    }
    if (image.height < minHeight) {
      minHeight = image.height;
    }
  });
  return { width: minWidth, height: minHeight };
}

/**
 *
 * @param canvas
 * @param orientation
 * @param collageImages
 * @param maxSize maximum size of the collage in pixels (0 for no limit)
 * @param gap gap between images in pixels
 * @param gapColor
 * @returns
 */
export async function createCollage(
  canvas: HTMLCanvasElement,
  orientation: Orientation,
  collageImages: HTMLImageElement[] | null,
  maxSize: number,
  gap: number,
  gapColor: string
) {
  const ctx = canvas?.getContext("2d");
  if (!collageImages || collageImages.length < 2 || !canvas || !ctx) {
    return;
  }

  let maxImageDataWidth = maxSize;
  let maxImageDataHeight = maxSize;
  if (maxSize === 0) {
    const minSize = getMinSize(collageImages);
    maxImageDataWidth = minSize.width;
    maxImageDataHeight = minSize.height;
  }

  let imagesData: ImageData[] = [];
  //para collage vertical
  let imagesHeightSum: number = 0;
  let imagesWidths: number[] = [];
  //para horizontal
  let imagesWidthSum: number = 0;
  let imagesHeights: number[] = [];

  //* Se crea un array con todas las imagenes pasadas a ImageData.
  // Se guardan también los tamaños de las imágenes para usarlos luego en el calculo del tamaño del canvas.
  await Promise.all(
    collageImages.map(async (image) => {
      // Si el collage va ser vertical se establece el ancho de la imagen a maxImageDataWidth, que si no está predefinido un tamaño en maxSize, será el ancho de la imagen más pequeña del collage. La más pequeña para que nada quede pixelado.
      // Si es horizontal ocurre lo propio pero para determinar el alto de la imagen.
      // Luego imageB64ToImageDataWithOrientation va a dimensionar las imagenes para adaptarlas a esos límites, también según orientación.
      let imageDataWidth;
      let imageDataHeight;
      if (orientation === Orientation.vertical) {
        imageDataWidth = maxImageDataWidth;
        imageDataHeight = image.height;
      } else {
        //horizontal
        imageDataWidth = image.width; //FIXME: estaba height, le puse width porque me parece que estaba mal. Checkiar
        imageDataHeight = maxImageDataHeight;
      }

      const imageData = await imageB64ToImageDataWithOrientation(
        image.src,
        imageDataWidth,
        imageDataHeight,
        orientation
      );

      imagesData.push(imageData);
      imagesWidths.push(imageData.width);
      imagesHeightSum += imageData.height;
      imagesHeights.push(imageData.height);
      imagesWidthSum += imageData.width;
    })
  );

  // se calcula el tamaño del gap y el tamaño del canvas según la orientación
  let newCanvasWidth = 0,
    newCanvasHeight = 0;

  if (orientation === Orientation.vertical) {
    newCanvasWidth = Math.min(...imagesWidths);
    newCanvasHeight = imagesHeightSum + gap * (collageImages.length - 1);
  } else {
    //horizontal
    newCanvasWidth = imagesWidthSum + gap * (collageImages.length - 1);
    newCanvasHeight = Math.min(...imagesHeights);
  }

  canvas.width = newCanvasWidth;
  canvas.height = newCanvasHeight;

  ctx.createImageData(newCanvasWidth, newCanvasHeight);
  ctx.fillStyle = gapColor;
  ctx.fillRect(0, 0, newCanvasWidth, newCanvasHeight);

  //* Se dibujan las imágenes en el canvas según la orientación.
  if (orientation === Orientation.vertical) {
    let heightOffset = 0;
    imagesData.forEach((imageData, index) => {
      if (index === 0) {
        ctx.putImageData(imageData, 0, 0);
        heightOffset = imageData.height + gap;
      } else if (index === imagesData.length - 1) {
        ctx.putImageData(imageData, 0, heightOffset);
      } else {
        ctx.putImageData(imageData, 0, heightOffset);
        heightOffset += imageData.height + gap;
      }
    });
  } else {
    //horizontal
    let widthOffset = 0;
    imagesData.forEach((imageData, index) => {
      if (index === 0) {
        ctx.putImageData(imageData, 0, 0);
        widthOffset = imageData.width + gap;
      } else if (index === imagesData.length - 1) {
        ctx.putImageData(imageData, widthOffset, 0);
      } else {
        ctx.putImageData(imageData, widthOffset, 0);
        widthOffset += imageData.width + gap;
      }
    });
  }
}

function getImagesMinSizes(images: HTMLImageElement[]): {
  width: number;
  height: number;
} {
  let minWidth = images[0].width;
  let minHeight = images[0].height;
  images.forEach((image) => {
    if (image.width < minWidth) {
      minWidth = image.width;
    }
    if (image.height < minHeight) {
      minHeight = image.height;
    }
  });
  return { width: minWidth, height: minHeight };
}

export function getCollageData(
  collageImages: HTMLImageElement[],
  maxSize: number
): {
  ivHeightSum: number;
  ivWidth: number;
  ihHeight: number;
  ihWidthSum: number;
  imagesHeightsSum: number;
  imagesWidthsSum: number;
} {
  let maxImageDataWidth = maxSize;
  let maxImageDataHeight = maxSize;
  if (maxSize === 0) {
    const minSize = getImagesMinSizes(collageImages);
    maxImageDataWidth = minSize.width;
    maxImageDataHeight = minSize.height;
  }

  let ivHeightSum = 0;
  let imagesHeightsSum = 0;
  let ihWidthSum = 0;
  let imagesWidthsSum = 0;

  collageImages.map((image) => {
    const aspectRatio = image.width / image.height;

    //Para vertical
    let ivHeight = maxImageDataWidth / aspectRatio;

    //Para horizontal
    let ihWidth = maxImageDataHeight * aspectRatio;

    ivHeightSum += ivHeight;
    ihWidthSum += ihWidth;
    imagesHeightsSum += image.height;
    imagesWidthsSum += image.width;
  });

  return {
    ivHeightSum: ivHeightSum,
    ivWidth: maxImageDataWidth,
    ihHeight: maxImageDataHeight,
    ihWidthSum: ihWidthSum,
    imagesHeightsSum: imagesHeightsSum,
    imagesWidthsSum: imagesWidthsSum,
  };
}

export async function getCollageGapPx(
  orientation: Orientation,
  collageImages: HTMLImageElement[] | null,
  maxSize: number,
  gapPc: number
): Promise<
  { gap: number; collageMaxWidth: number; collageMaxHeight: number } | undefined
> {
  function getMinSize(images: HTMLImageElement[]): {
    width: number;
    height: number;
  } {
    let minWidth = images[0].width;
    let minHeight = images[0].height;
    images.forEach((image) => {
      if (image.width < minWidth) {
        minWidth = image.width;
      }
      if (image.height < minHeight) {
        minHeight = image.height;
      }
    });
    return { width: minWidth, height: minHeight };
  }

  if (!collageImages) {
    return;
  }

  let maxImageDataWidth = maxSize;
  let maxImageDataHeight = maxSize;
  if (maxSize === 0) {
    const minSize = getMinSize(collageImages);
    maxImageDataWidth = minSize.width;
    maxImageDataHeight = minSize.height;
  }

  let imagesData: ImageData[] = [];
  //para collage vertical
  let imagesHeightSum: number = 0;
  //para horizontal
  let imagesWidthSum: number = 0;

  await Promise.all(
    collageImages.map(async (image) => {
      let imageDataWidth;
      let imageDataHeight;
      if (orientation === Orientation.vertical) {
        imageDataWidth = maxImageDataWidth;
        imageDataHeight = image.height;
      } else {
        //horizontal
        imageDataWidth = image.height;
        imageDataHeight = maxImageDataHeight;
      }

      const imageData = await imageB64ToImageDataWithOrientation(
        image.src,
        imageDataWidth,
        imageDataHeight,
        orientation
      );

      imagesData.push(imageData);
      imagesHeightSum += imageData.height;
      imagesWidthSum += imageData.width;
    })
  );

  // se calcula el tamaño del gap y el tamaño del canvas según la orientación
  let gap = 0;

  if (orientation === Orientation.vertical) {
    gap = imagesHeightSum * (gapPc / 100);
  } else {
    //horizontal
    gap = imagesWidthSum * (gapPc / 100);
  }

  return {
    gap: gap,
    collageMaxWidth: imagesWidthSum,
    collageMaxHeight: imagesHeightSum,
  };
}

/**
 * Función que calcula un nuevo tamaño para la imagen del small canvas teniendo en cuenta el tamaño de la ventana.
 * @param imageWidth - ancho de la imagen original
 * @param imageHeight - alto de la imagen original
 * @param windowDimensions - dimensiones de la ventana
 * @param mainCanvasConfig - configuración del canvas principal
 * @returns - ancho y alto de la imagen redimensionada
 */
/* function calcResizeToWindow(
  imageWidth: number,
  imageHeight: number,
  windowDimensions: WindowsDimensions,
  mainCanvasConfig: AppConfig,
  mobileToolbarRef: React.RefObject<HTMLDivElement>
): { newWidth: number; newHeight: number } {
  let ratio = imageWidth / imageHeight;
  let newWidth = 0;
  let newHeight = 0;

  let mobileToolbarHeight = 0;
  let mobileToolbarWidth = 0;

  if (mobileToolbarRef && mobileToolbarRef.current) {
    mobileToolbarHeight = mobileToolbarRef.current.clientHeight || 0;
    mobileToolbarWidth = mobileToolbarRef.current.clientWidth || 0;
  }
  // horizontal
  if (ratio > 1) {
    if (
      windowDimensions.width <
      mainCanvasConfig.canvasMaxWidth - mainCanvasConfig.canvasMargin
    ) {
      newWidth = windowDimensions.width - mainCanvasConfig.canvasMargin;
    } else {
      newWidth =
        mainCanvasConfig.canvasMaxWidth - mainCanvasConfig.canvasMargin;
    }
    newHeight = newWidth / ratio;

    if (
      newHeight >
      windowDimensions.height -
        mobileToolbarHeight -
        mainCanvasConfig.canvasMargin
    ) {
      newHeight =
        windowDimensions.height -
        mobileToolbarHeight -
        mainCanvasConfig.canvasMargin;
      newWidth = newHeight * ratio;
    }
  }
  // vertical
  else {
    if (
      windowDimensions.height -
        mobileToolbarHeight -
        mainCanvasConfig.canvasMargin <
      mainCanvasConfig.canvasMaxHeight
    ) {
      newHeight =
        windowDimensions.height -
        mobileToolbarHeight -
        mainCanvasConfig.canvasMargin;
    } else {
      newHeight =
        mainCanvasConfig.canvasMaxHeight - mainCanvasConfig.canvasMargin;
    }
    newWidth = newHeight * ratio;

    if (newWidth + mainCanvasConfig.canvasMargin > windowDimensions.width) {
      newWidth = windowDimensions.width - mainCanvasConfig.canvasMargin;
      newHeight = newWidth / ratio;
    }
  }
  if (newWidth <= 0) {
    newWidth = 1;
  }
  if (newHeight <= 0) {
    newHeight = 1;
  }

  return { newWidth, newHeight };
} */

function imageDataToBase64(imageData: ImageData): string {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas.toDataURL();
}

/**
 * Función que convierte un IMG en Canvas, aplicando una lista de procesos.
 * Utiliza un offscreen canvas para aplicar todos los procesos, luego se pasa a un canvas común que es lo que devuelve la función.
 * Devuelve uno común y no el offscreen porque uso la función para luego convertir el canvas a DataURL y generar el enlace de descarga de la imagen procesada, y el offscreen no tiene para pasar a DataURL.
 * @param imgElement - elemento Img a convertir
 * @param processList - lista de funciones de procesamiento
 * @returns {HTMLCanvasElement} - canvas con la imagen procesada
 */
function processImgToCanvas(
  imgElement: HTMLImageElement,
  processList: ProcessFunction[]
): HTMLCanvasElement {
  let newOffscreenCanvas = new Canvas (
    imgElement?.width || 0,
    imgElement?.height || 0
  ) as unknown as OffscreenCanvas;
  let newCtx = newOffscreenCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  newCtx?.drawImage(
    imgElement as HTMLImageElement,
    0,
    0,
    imgElement?.width || 0,
    imgElement?.height || 0
  );

  applyProcessList(newOffscreenCanvas, processList);

  //canvas comun para poner la imagen a exportar
  let resultCanvas = document.createElement("canvas");
  if (newOffscreenCanvas) {
    resultCanvas.width = newOffscreenCanvas?.width;
    resultCanvas.height = newOffscreenCanvas?.height;
  }
  let ctx = resultCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  let bigImageData = newOffscreenCanvas
    ?.getContext("2d", {
      willReadFrequently: true,
    })
    ?.getImageData(0, 0, newOffscreenCanvas?.width, newOffscreenCanvas?.height);

  if (ctx && bigImageData) {
    ctx.createImageData(bigImageData.width, bigImageData.height);
    ctx.putImageData(bigImageData, 0, 0);
  }
  return resultCanvas;
}

/**
 * Función que agrega un borde a una imagen.
 * @param imageData - datos de la imagen
 * @param options - opciones de bordes para el proceso
 * @returns - datos de la imagen con el borde agregado
 */
function imgAddBorder(
  imageData: ImageData,
  options?: BorderOptionsType
): ImageData {
  let borderSize = 0,
    borderHeight = 0,
    borderWidth = 0;

  let borderColor = "#ffffff";

  if (options?.BorderPixels && parseInt(options?.BorderPixels) > 0) {
    borderSize = parseInt(options.BorderPixels) * 2;
    borderWidth = borderSize;
    borderHeight = borderSize;
  } else {
    if (options?.BorderPercent) {
      borderSize = parseInt(options.BorderPercent);
      borderWidth = (imageData.width * borderSize) / 100;
      borderHeight = (imageData.height * borderSize) / 100;
    }
  }

  if (options?.BorderColor) {
    borderColor = options.BorderColor;
  }

  const canvasTemp = new Canvas(
    imageData.width + borderWidth,
    imageData.height + borderHeight
  ) as unknown as HTMLCanvasElement;
  const ctxTemp = canvasTemp.getContext("2d", {
    willReadFrequently: true,
  }) as unknown as OffscreenCanvasRenderingContext2D;

  canvasTemp.width = imageData.width + borderWidth;
  canvasTemp.height = imageData.height + borderHeight;

  ctxTemp.fillStyle = borderColor;
  ctxTemp.fillRect(0, 0, canvasTemp.width, canvasTemp.height);

  ctxTemp.putImageData(imageData, borderWidth / 2, borderHeight / 2);

  const resultImageData = ctxTemp?.getImageData(
    0,
    0,
    imageData.width + borderWidth,
    imageData.height + borderHeight
  ) as ImageData;
  return resultImageData;
}

/**
 * Función que agrega un canvas a una imagen.
 * @param imageData - datos de la imagen
 * @param options - opciones de canvas para el proceso
 * @returns - datos de la imagen con el canvas agregado
 */
export function imgAddCanvas(
  imageData: ImageData,
  options: CanvasOptions
): ImageData {
  if (options.ratioX === 0 || options.ratioY === 0) {
    return imageData;
  }

  let AR = imageData.width / imageData.height;
  let newAR = options.ratioX / options.ratioY;
  let newWidth = 0,
    newHeight = 0,
    newBorderX = 0,
    newBorderY = 0;

  if (newAR === AR) {
    return imageData;
  }
  if (newAR < AR) {
    newWidth = imageData.width;
    newHeight = newWidth / newAR;
    newBorderX = 0;
    newBorderY = (newHeight - imageData.height) / 2;
  }
  if (newAR > AR) {
    newHeight = imageData.height;
    newWidth = newHeight * newAR;
    newBorderY = 0;
    newBorderX = (newWidth - imageData.width) / 2;
  }

  let borderHeight = newBorderY * 2,
    borderWidth = newBorderX * 2;

  let borderColor = options.CanvasColor;

  const canvasTemp = new Canvas(
    imageData.width + borderWidth,
    imageData.height + borderHeight
  ) as unknown as HTMLCanvasElement;
  const ctxTemp = canvasTemp.getContext("2d", {
    willReadFrequently: true,
  });

  canvasTemp.width = imageData.width + borderWidth;
  canvasTemp.height = imageData.height + borderHeight;

  ctxTemp!.fillStyle = borderColor;
  ctxTemp!.fillRect(0, 0, canvasTemp.width, canvasTemp.height);

  ctxTemp!.putImageData(imageData, borderWidth / 2, borderHeight / 2);

  const resultImageData = ctxTemp?.getImageData(
    0,
    0,
    imageData.width + borderWidth,
    imageData.height + borderHeight
  ) as ImageData;
  return resultImageData;
}

/**
 * Recibe un canvas con una imagen y le aplica una transformación, quedando el resultado aplicado sobre ese mismo canvas.
 * @param canvasRef - referencia al canvas que tiene la imagen que se quiere transformar
 * @param processFunction - función que toma un ImageData y devuelve otro ImageData transformado
 * @return
 */
function applyProcessFunction(
  canvas: OffscreenCanvas | HTMLCanvasElement | null,
  processFunction: ProcessFunction,
  options?: BorderOptionsType | CanvasOptions
): ImageData {
  const ctx = canvas?.getContext("2d", {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D;

  const imageData = ctx?.getImageData(
    0,
    0,
    canvas?.width || 0,
    canvas?.height || 0
  ) as ImageData;

  const newData = processFunction(imageData as ImageData, options);

  if (canvas) {
    canvas.width = newData.width;
    canvas.height = newData.height;
    ctx?.createImageData(newData.width, newData.height);
    ctx?.putImageData(newData, 0, 0);
  }

  return newData;
}

function applyProcessFunctionWithSize(
  canvas: OffscreenCanvas | HTMLCanvasElement | null,
  processFunction: ProcessFunction,
  width: number,
  height: number,
  options?: BorderOptionsType
): ImageData {
  const ctx = canvas?.getContext("2d", {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D;

  const imageData = ctx?.getImageData(
    0,
    0,
    canvas?.width || 0,
    canvas?.height || 0
  ) as ImageData;

  const newData = processFunction(imageData as ImageData, options);

  if (canvas) {
    /*  canvas.width = newData.width;
    canvas.height = newData.height;
    ctx?.createImageData(newData.width, newData.height);
    ctx?.putImageData(newData, 0, 0); */

    drawImageB64OnCanvas(
      imageDataToBase64(newData).toString(),
      canvas as HTMLCanvasElement,
      width,
      height
    );
  }

  return newData;
}

function processToNewImageData(
  canvas: OffscreenCanvas | HTMLCanvasElement | null,
  processFunction: ProcessFunction,
  options?: BorderOptionsType
): ImageData {
  const ctx = canvas?.getContext("2d", {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D;

  const imageData = ctx?.getImageData(
    0,
    0,
    canvas?.width || 0,
    canvas?.height || 0
  ) as ImageData;

  const newData = processFunction(imageData as ImageData, options);

  return newData;
}

/**
 * Función que toma un canvas y una lista de funciones de transformación, y aplica cada función a la imagen del canvas.
 * @param canvas - canvas con la imagen a transformar y en el que se va a poner la imagen transformada
 * @param processList - lista de funciones de transformación
 */
function applyProcessList(
  canvas: OffscreenCanvas | HTMLCanvasElement | null,
  processList: ProcessFunction[]
) {
  const ctx = canvas?.getContext("2d", {
    willReadFrequently: true,
  }) as CanvasRenderingContext2D;

  let imageData = ctx?.getImageData(
    0,
    0,
    canvas?.width || 0,
    canvas?.height || 0
  ) as ImageData;

  processList.forEach((processFunction) => {
    imageData = processFunction(imageData);
  });

  if (canvas) {
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx?.createImageData(imageData.width, imageData.height);
    ctx?.putImageData(imageData, 0, 0);
  }
}

/**
 * Función que toma una imagenB64 y la dibuja en un canvas, adaptando el tamaño del canvas considerando el tamaño máximo que puede tener, el tamaño de la imagen y si es horizontal o vertical. Si la imagen es horizontal, el ancho del canvas es el máximo y el alto se ajusta proporcionalmente. Si la imagen es vertical, el alto del canvas es el máximo y el ancho se ajusta proporcionalmente.
 * @param imageB64
 * @param canvas
 * @param canvasMaxWidth
 * @param canvasMaxHeight
 */
function drawImageB64OnCanvas(
  imageB64: string,
  canvas: HTMLCanvasElement,
  canvasMaxWidth: number,
  canvasMaxHeight: number
) {
  if (!canvas || !imageB64 || !canvasMaxWidth || !canvasMaxHeight) {
    console.error(
      "Error al cargar la imagen en el canvas",
      imageB64,
      canvas,
      canvasMaxWidth,
      canvasMaxHeight
    );
    return;
  }
  const imgElement = new window.Image();
  imgElement.src = imageB64;
  imgElement.onload = function () {
    const aspectRatio = imgElement.width / imgElement.height;

    if (aspectRatio > 1) {
      canvas.width = canvasMaxWidth;
      canvas.height = canvasMaxWidth / aspectRatio;
    } else {
      canvas.height = canvasMaxHeight;
      canvas.width = canvasMaxHeight * aspectRatio;
    }

    canvas
      .getContext("2d")
      ?.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
  };
}

// TODO: no debería usar un offline canvas acá?
async function imageB64ToImageData(
  imageB64: string,
  canvasMaxWidth: number,
  canvasMaxHeight: number
): Promise<ImageData> {
  const canvas = document.createElement("canvas");
  const imgElement = new window.Image();

  const loadImage = new Promise<void>((resolve, reject) => {
    imgElement.onload = function () {
      const aspectRatio = imgElement.width / imgElement.height;

      if (aspectRatio > 1) {
        canvas.width = canvasMaxWidth;
        canvas.height = canvasMaxWidth / aspectRatio;
      } else {
        canvas.height = canvasMaxHeight;
        canvas.width = canvasMaxHeight * aspectRatio;
      }

      canvas
        .getContext("2d")
        ?.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

      resolve();
    };

    imgElement.onerror = function () {
      reject(new Error("Error al cargar la imagen"));
    };

    imgElement.src = imageB64;
  });

  await loadImage;
  return canvas
    .getContext("2d")
    ?.getImageData(0, 0, canvas.width, canvas.height)!;
}

async function imageB64ToImageDataWithOrientation(
  imageB64: string,
  canvasMaxWidth: number,
  canvasMaxHeight: number,
  orientation: Orientation
): Promise<ImageData> {
  const canvas = document.createElement("canvas");
  const imgElement = new window.Image();

  const loadImage = new Promise<void>((resolve, reject) => {
    imgElement.onload = function () {
      const aspectRatio = imgElement.width / imgElement.height;

      //para collage vertical
      if (orientation === Orientation.vertical) {
        canvas.width = canvasMaxWidth;
        canvas.height = canvasMaxWidth / aspectRatio;
      } else if (orientation === Orientation.horizontal) {
        //para collage horizontal
        canvas.height = canvasMaxHeight;
        canvas.width = canvasMaxHeight * aspectRatio;
      }

      canvas
        .getContext("2d")
        ?.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

      resolve();
    };

    imgElement.onerror = function () {
      reject(new Error("Error al cargar la imagen"));
    };

    imgElement.src = imageB64;
  });

  await loadImage;
  return canvas
    .getContext("2d")
    ?.getImageData(0, 0, canvas.width, canvas.height)!;
}

function putImageDataOnCanvas(image: ImageData, canvas: HTMLCanvasElement) {
  canvas.width = image.width;
  canvas.height = image.height;
  canvas
    .getContext("2d")
    ?.putImageData(image, 0, 0, 0, 0, image.width, image.height);
}

/**
 * función que toma un archivo y devuelve una promesa que resuelve en un string con la imagen en formato base64
 * @param file - archivo a convertir
 * @returns - promesa que resuelve en un string con la imagen en formato base64
 */
async function getImageFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
    }
    if (!file.type.startsWith("image/")) {
      reject(new Error(`${file.name} is not an image.`));
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error("Error al leer el archivo"));
      }
    };
    reader.onerror = function () {
      reject(new Error("Error al leer el archivo"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Función que calcula el alto y ancho que debe tener un canvas para adaptarse a una imagen, teniendo en cuenta el tamaño máximo que puede tener el canvas y si la imagen es horizontal o vertical.
 * @param canvasMaxWidth
 * @param canvasMaxHeight
 * @param imageWidth
 * @param imageHeight
 * @returns
 */
function getAdaptedSize(
  canvasMaxWidth: number,
  canvasMaxHeight: number,
  imageWidth: number,
  imageHeight: number
): { width: number; height: number } {
  const aspectRatio = imageWidth / imageHeight;
  let width = 0,
    height = 0;

  //horizontal
  if (aspectRatio > 1) {
    width = canvasMaxWidth;
    height = canvasMaxWidth / aspectRatio;
  } else {
    height = canvasMaxHeight;
    width = canvasMaxHeight * aspectRatio;
  }
  return { width, height };
}

/**
 * Toma un imageData y lo convierte a escala de grises promediando los valores de los canales de color.
 * @param imageData - ImageData a transformar
 * @returns - ImageData en escala de grises
 */
function imgToBW(imageData: ImageData): ImageData {
  let imageDataCopy: ImageData | null = null;
  if (imageData) {
    imageDataCopy = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
  }
  if (imageDataCopy) {
    const data = imageDataCopy.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = avg; // red
      data[i + 1] = avg; // green
      data[i + 2] = avg; // blue
    }
  }
  return imageDataCopy as ImageData;
}

/**
 * Función que convierte un color en formato hexadecimal a un objeto con los valores de los canales de color en formato RGB.
 * @param hexColor - color en formato hexadecimal
 * @returns - objeto con los valores de los canales de color en formato RGB
 */
function hexToRgb(hexColor: string): {
  red: number;
  green: number;
  blue: number;
} {
  let color = hexColor.charAt(0) === "#" ? hexColor.substring(1, 7) : hexColor;

  if (!/^[0-9A-F]{6}$/i.test(color)) {
    throw new Error("Invalid hex color");
  }

  let red = parseInt(color.substring(0, 2), 16);
  let green = parseInt(color.substring(2, 4), 16);
  let blue = parseInt(color.substring(4, 6), 16);

  return { red, green, blue };
}
