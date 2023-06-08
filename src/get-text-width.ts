/** Calculate what size text will take */
export function getTextWidth(
  text: string,
  {
    fontSize = 14,
    fontWeight = 400,
    font = 'Helvetica',
    ctx,
  }: {
    fontSize?: number;
    fontWeight?: number;
    font?: string;
    ctx?: CanvasRenderingContext2D;
  } = {}
) {
  ctx!.font = `${fontWeight || ''} ${fontSize}px ${font} `;
  const measurement = ctx!.measureText(text);
  return measurement.width;
}
