import { N } from './stam/fluid';

export function attachBrushCursor(
  canvas: HTMLCanvasElement,
  getRadius: () => number,
): void {
  const ringNode = document.getElementById('brush-ring');
  if (!ringNode) return;
  const brushRing: HTMLElement = ringNode;

  function update(clientX: number, clientY: number): void {
    const rect = canvas.getBoundingClientRect();
    const inside =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;

    if (!inside) {
      brushRing.hidden = true;
      return;
    }

    brushRing.hidden = false;
    const cellPx = rect.width / N;
    const diameter = getRadius() * 2 * cellPx;
    brushRing.style.left = `${clientX - rect.left}px`;
    brushRing.style.top = `${clientY - rect.top}px`;
    brushRing.style.width = `${diameter}px`;
    brushRing.style.height = `${diameter}px`;
  }

  canvas.addEventListener('pointermove', (e) => update(e.clientX, e.clientY));
  canvas.addEventListener('pointerenter', (e) => update(e.clientX, e.clientY));
  canvas.addEventListener('pointerleave', () => {
    brushRing.hidden = true;
  });
  canvas.addEventListener('pointerdown', (e) => update(e.clientX, e.clientY));
}
