/** Calculate what size text will take */
export function getTextWidth(
  text: string,
  {
    fontSize = 14,
    fontWeight = 400,
    defaultFont = 'Helvetice',
    ctx,
  }: {
    fontSize?: number;
    fontWeight?: number;
    defaultFont?: string;
    ctx?: CanvasRenderingContext2D;
  } = {}
) {
  ctx!.font = `${fontWeight || ''} ${fontSize}px ${defaultFont} `;
  const measurement = ctx!.measureText(text);
  return measurement.width;
}
