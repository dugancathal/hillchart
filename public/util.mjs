export const genRandomId = () => crypto.randomUUID();

export function randomColor() {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * 75);
  const l = Math.floor(Math.random() * 50);
  return `hsl(${h}, ${s}%, ${l}%)`;
}