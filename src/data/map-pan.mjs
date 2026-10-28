export function panView(view, dx, dy, inverse) {
  const [x, y, width, height] = view;
  const nextX = x - (inverse.a * dx + inverse.c * dy);
  const nextY = y - (inverse.b * dx + inverse.d * dy);
  return [Math.max(0, Math.min(600 - width, nextX)), Math.max(0, Math.min(600 - height, nextY)), width, height];
}
