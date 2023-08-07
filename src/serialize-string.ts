const xmlns = 'http://www.w3.org/2000/xmlns/';
const xlinkns = 'http://www.w3.org/1999/xlink';
const svgns = 'http://www.w3.org/2000/svg';

/** This function serializes SVG and sets all necessary attributes  */
export function serializeString(svg: SVGElement) {
  svg = svg.cloneNode(true) as SVGElement;
  const fragment = window.location.href + '#';
  const walker = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT, null);

  while (walker.nextNode()) {
    for (const attr of (walker.currentNode as any).attributes) {
      if (attr.value.includes(fragment)) {
        attr.value = attr.value.replace(fragment, '#');
      }
    }
  }

  svg.setAttributeNS(xmlns, 'xmlns', svgns);
  svg.setAttributeNS(xmlns, 'xmlns:xlink', xlinkns);

  return new XMLSerializer().serializeToString(svg);
}
