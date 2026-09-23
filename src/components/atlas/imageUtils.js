// Canvas-based image preparation for OCR: downscale + grayscale + autocontrast (+ Otsu threshold).
// Plus serie cleaning / validation helpers.

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const canvasToFile = (canvas, name) =>
  new Promise((resolve) =>
    canvas.toBlob(
      (b) => resolve(new File([b], name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" })),
      "image/jpeg",
      0.92
    )
  );

/**
 * Prepares an image for OCR: downscales to maxLongSide, grayscale + autocontrast.
 * variant: "contrast" (grayscale + stretch) or "threshold" (+ Otsu binarize).
 */
export async function prepareImage(file, variant = "contrast", maxLongSide = 1600) {
  const img = await loadImage(URL.createObjectURL(file));
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (Math.max(w, h) > maxLongSide) {
    const s = maxLongSide / Math.max(w, h);
    w = Math.round(w * s);
    h = Math.round(h * s);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const n = w * h;
  const gray = new Uint8ClampedArray(n);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    gray[j] = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
  }
  // autocontrast stretch
  let min = 255, max = 0;
  for (let j = 0; j < n; j++) { if (gray[j] < min) min = gray[j]; if (gray[j] > max) max = gray[j]; }
  const range = Math.max(1, max - min);
  const out = new Uint8ClampedArray(n);
  for (let j = 0; j < n; j++) out[j] = ((gray[j] - min) * 255 / range) | 0;
  if (variant === "threshold") {
    // Otsu binarization
    const hist = new Array(256).fill(0);
    for (let j = 0; j < n; j++) hist[out[j]]++;
    let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
    let sumB = 0, wB = 0, maxVar = -1, thr = 127;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (wB === 0) continue;
      const wF = n - wB; if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB, mF = (sum - sumB) / wF;
      const v = wB * wF * (mB - mF) * (mB - mF);
      if (v > maxVar) { maxVar = v; thr = t; }
    }
    for (let j = 0; j < n; j++) out[j] = out[j] >= thr ? 255 : 0;
  }
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const v = out[j]; px[i] = v; px[i + 1] = v; px[i + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  return canvasToFile(canvas, file.name);
}

// Strip slashes, spaces, dots the OCR hallucinates; keep uppercase alphanumerics.
export const cleanSerie = (raw) =>
  String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// Real plate e.g. "516220V00845" → 516 + digits + letter + digits.
export const SERIE_STRONG = /^516\d{3,6}[A-Z]\d{3,6}$/;
export const SERIE_WEAK = /^516[A-Z0-9]{4,}[A-Z][A-Z0-9]*$/;

export const serieConfidence = (s) => {
  if (!s) return "none";
  if (SERIE_STRONG.test(s)) return "high";
  if (SERIE_WEAK.test(s)) return "medium";
  return "low";
};
/**
 * Encolhe uma fotografia mantendo a cor, para guardar no cartão da máquina.
 *
 * A `prepareImage` acima não serve aqui: ela tira a cor e força o contraste
 * porque foi feita para o OCR ler uma placa. Estas fotos são para uma pessoa
 * ver o estado da máquina, e a cor é metade da informação — a ferrugem, a
 * pintura, o cabo partido.
 *
 * O encolhimento não é cosmético. Um telemóvel atual dá ficheiros de 4 a 8 MB;
 * com quatro por máquina e algumas centenas de máquinas, o backup com fotos
 * passava de grande a impossível. A 1600px de lado maior continua a ver-se tudo
 * o que interessa.
 */
export async function comprimirFoto(file, { maxLado = 1600, qualidade = 0.82 } = {}) {
  const img = await loadImage(URL.createObjectURL(file));
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (Math.max(w, h) > maxLado) {
    const s = maxLado / Math.max(w, h);
    w = Math.round(w * s);
    h = Math.round(h * s);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", qualidade));
  // Se o browser não souber produzir o blob, vale mais mandar o original do que
  // perder a fotografia.
  if (!blob) return file;
  return new File([blob], (file.name || "foto").replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}
