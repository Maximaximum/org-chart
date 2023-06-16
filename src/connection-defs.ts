import { Connection } from "./d3-org-chart.types";
import { connectionColor, connectionLabelColor } from "./default-colors";
import { getTextWidth } from "./get-text-width";

export function connectionArrowhead<Datum>(conn: Connection<Datum>) {
  const reverse = !(conn._source.x < conn._target.x);

  return `<marker id="arrow-${
    conn.from + "_" + conn.to
  }"  markerWidth="500"  markerHeight="500"  refY="2"  refX="1" orient="${
    reverse ? "auto-start-reverse" : "auto"
  }" >
  <path transform="translate(0)" d='M0,0 V4 L2,2 Z' fill='${connectionColor}' />
  </marker>`;
}

export function connectionLabel<Datum>(
  conn: Connection<Datum>,
  ctx: CanvasRenderingContext2D,
  font: string
) {
  const labelWidth = getTextWidth(conn.label, {
    ctx,
    fontSize: 2,
    font,
  });

  const reverse = !(conn._source.x < conn._target.x);

  return `<marker id="${conn.from + "_" + conn.to}" refX="${
    reverse ? 7 : -7
  }" refY="5" markerWidth="500"  markerHeight="500"  orient="${
    reverse ? "auto-start-reverse" : "auto"
  }">
  <rect rx=0.5 width=${
    conn.label ? labelWidth + 3 : 0
  } height=3 y=1  fill="${connectionColor}"></rect>
  <text font-size="2px" x=1 fill="${connectionLabelColor}" y=3>${
    conn.label || ""
  }</text>
 </marker>`;
}
