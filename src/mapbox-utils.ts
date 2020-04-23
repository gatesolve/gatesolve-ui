import { Map } from "mapbox-gl";

// eslint-disable-next-line import/prefer-default-export
export const addImageSVG = (
  mapboxgl: Map,
  imageId: string,
  svgData: string,
  size: number
): void => {
  const svgDataUrl = `data:image/svg+xml,${encodeURIComponent(svgData)}`;
  
  const img = new Image();//undefined, size);
  img.onload = (): void => {
    const ratio = window.devicePixelRatio;
    const canvas = document.createElement("canvas");
    canvas.width = ratio * img.width;
    canvas.height = ratio * img.height;
    const app = document!.querySelector('.App');
    app!.insertBefore(canvas, app!.firstChild);
    app!.insertBefore(img, app!.firstChild);

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw Error("canvas.getContext failed");
    }
    console.log("image", img.width, img.height);

    ctx.drawImage(img, 0, 0, ratio * img.width, ratio * img.height);
    mapboxgl.addImage(
      imageId,
      ctx.getImageData(0, 0, ratio * img.width, ratio * img.height),
      { pixelRatio: ratio }
    );
  };

  img.src = svgDataUrl;
};
