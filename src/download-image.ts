import { saveAs } from './save-as';
import { serializeString } from './serialize-string';

// params is optional?
export function downloadImage({
  node,
  scale = 2,
  imageName = 'graph',
  isSvg = false,
  save = true,
  onAlreadySerialized = () => {},
  onLoad = (d) => {},
}: {
  node: SVGElement;
  scale?: number;
  isSvg?: boolean;
  save?: boolean;
  onAlreadySerialized?: () => void;
  onLoad?: (s: string) => void;
  imageName?: string;
}) {
  // Retrieve svg node
  const svgNode = node;

  if (isSvg) {
    let source = serializeString(svgNode);
    //add xml declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    //convert svg source to URI data scheme.
    var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    saveAs(url, imageName + '.svg');
    onAlreadySerialized();
    return;
  }
  // Get image quality index (basically,  index you can zoom in)
  const quality = scale;
  // Create image
  const image = document.createElement('img');
  image.onload = function () {
    // Create image canvas
    const canvas = document.createElement('canvas');
    // Set width and height based on SVG node
    const rect = svgNode.getBoundingClientRect();
    canvas.width = rect.width * quality;
    canvas.height = rect.height * quality;
    // Draw background
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#FAFAFA';
    context.fillRect(0, 0, rect.width * quality, rect.height * quality);
    context.drawImage(image, 0, 0, rect.width * quality, rect.height * quality);
    // Set some image metadata
    let dt = canvas.toDataURL('image/png');
    if (onLoad) {
      onLoad(dt);
    }
    if (save) {
      // Invoke saving function
      saveAs(dt, imageName + '.png');
    }
  };

  var url =
    'data:image/svg+xml; charset=utf8, ' +
    encodeURIComponent(serializeString(svgNode));

  onAlreadySerialized();

  image.src = url; // URL.createObjectURL(blob);
}
