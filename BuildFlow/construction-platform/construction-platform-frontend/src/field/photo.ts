/** Shrinks a phone photo before it is sent: long side 1600 px, JPEG. A camera shot of several MB becomes a few hundred KB. */
export async function shrink(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  let w: number, h: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void, close = () => {};
  try {
    // 'from-image' applies the camera's rotation, so portrait shots are not sideways.
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    w = bmp.width; h = bmp.height; draw = (c, W, H) => c.drawImage(bmp, 0, 0, W, H); close = () => bmp.close();
  } catch {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not read that photo')); i.src = url; });
    w = img.naturalWidth; h = img.naturalHeight; draw = (c, W, H) => c.drawImage(img, 0, 0, W, H); close = () => URL.revokeObjectURL(url);
  }
  try {
    const k = Math.min(1, maxSide / Math.max(w, h));
    const W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k));
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);   // flatten transparency (PNG screenshots)
    draw(ctx, W, H);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not prepare that photo'))), 'image/jpeg', quality));
  } finally { close(); }
}
