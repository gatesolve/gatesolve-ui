import { Map } from "mapbox-gl";

// eslint-disable-next-line import/prefer-default-export
export const addImageSVG = (
  mapboxgl: Map,
  imageId: string,
  svgData: string,
  size: number
): void => {
  const ratio = window.devicePixelRatio;

  const canvas = document.createElement("canvas");
  canvas.width = ratio * size;
  canvas.height = ratio * size;

  const ctx = canvas.getContext("2d");
  const img = new Image(size, size);

  const svgDataUrl = `data:image/svg+xml,${encodeURIComponent(svgData)}`;

  img.onload = (): void => {
    if (!ctx) {
      throw Error("canvas.getContext failed");
    }

    ctx.drawImage(img, 0, 0, ratio * size, ratio * size);
    mapboxgl.addImage(
      imageId,
      ctx.getImageData(0, 0, ratio * size, ratio * size),
      { pixelRatio: ratio }
    );
  };

  img.src = svgDataUrl;
};
