const ctx = document.createElement('canvas').getContext('2d')!;

/** Calculate what size text will take */
export function getTextWidth(
  text: string,
  {
    fontSize = 14,
    fontWeight = 400,
    font,
  }: {
    fontSize?: number;
    fontWeight?: number;
    font: string;
  }
) {
  ctx.font = `${fontWeight || ''} ${fontSize}px ${font} `;
  const measurement = ctx.measureText(text);
  return measurement.width;
}
