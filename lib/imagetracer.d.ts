declare module "imagetracerjs" {
  export type PaletteColor = { r: number; g: number; b: number; a: number };
  export type TracerOptions = Record<
    string,
    number | string | boolean | PaletteColor[]
  >;

  const ImageTracer: {
    optionpresets: Record<string, TracerOptions>;
    imagedataToSVG(imagedata: ImageData, options?: TracerOptions | string): string;
    imageToSVG(
      url: string,
      callback: (svg: string) => void,
      options?: TracerOptions | string,
    ): void;
    appendSVGString(svgstr: string, parentid: string): void;
  };

  export default ImageTracer;
}
