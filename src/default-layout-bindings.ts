import { Layout, LayoutBinding, Point } from './d3-org-chart.types';
import { vdiagonal, hdiagonal } from './diagonals';

export function isLayoutVertical(layout: Layout) {
  return layout === 'bottom' || layout === 'top';
}

export function getOppositeDirection(layout: Layout): Layout {
  switch (layout) {
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
  }
}

/**
 *   You can customize/offset positions for each node and link by overriding these functions
 *   For example, suppose you want to move link y position 30 px bellow in top layout. You can do it like this:
 *   ```javascript
 *   const layout = chart.layoutBindings();
 *   layout.top.linkY = node => node.y + 30;
 *   chart.layoutBindings(layout);
 *   ```
 */
export const defaultLayoutBindings: Record<Layout, LayoutBinding> = {
  left: {
    nodeLeftX: (node) => 0,
    nodeRightX: (node) => node.width,
    nodeTopY: (node) => -node.height / 2,
    nodeBottomY: (node) => node.height / 2,
    nodeJoinX: (node) => node.x + node.width,
    nodeJoinY: (node) => node.y - node.height / 2,
    linkJoinX: (node) => node.x + node.width,
    linkJoinY: (node) => node.y,
    linkX: (node) => node.x,
    linkY: (node) => node.y,
    linkCompactXStart: (node, compactEven) => node.x + node.width / 2,
    linkCompactYStart: (node, compactEven) =>
      node.y + (compactEven ? node.height / 2 : -node.height / 2),
    compactLinkMidX: (node, margin) => node.x,
    compactLinkMidY: (node, margin) => node.y + node.width / 4 + margin / 4,
    linkTargetX: (node) => node.x + node.width,
    linkTargetY: (node) => node.y,
    buttonX: (node) => node.width,
    buttonY: (node) => node.height / 2,
    centerTransform: ({ rootMargin, centerY, scale, centerX }) =>
      `translate(${rootMargin},${centerY}) scale(${scale})`,
    compactDimension: {
      sizeColumn: (node) => node.height,
      sizeRow: (node) => node.width,
    },
    rectSizeWithMargins: ({
      height,
      width,
      siblingsMargin,
      childrenMargin,
    }) => {
      return { width: height + siblingsMargin, height: width + childrenMargin };
    },
    zoomTransform: ({ centerY, scale }) =>
      `translate(${0},${centerY}) scale(${scale})`,
    diagonal: hdiagonal,
    swap: (d: Point) => ({
      x: d.y,
      y: d.x,
    }),
    nodePosition: ({ x, y, width, height }) => ({
      x,
      y: y - height / 2,
    }),
  },
  top: {
    nodeLeftX: (node) => -node.width / 2,
    nodeRightX: (node) => node.width / 2,
    nodeTopY: (node) => 0,
    nodeBottomY: (node) => node.height,
    nodeJoinX: (node) => node.x - node.width / 2,
    nodeJoinY: (node) => node.y + node.height,
    linkJoinX: (node) => node.x,
    linkJoinY: (node) => node.y + node.height,
    linkCompactXStart: (node, compactEven) =>
      node.x + (compactEven ? node.width / 2 : -node.width / 2),
    linkCompactYStart: (node, compactEven) => node.y + node.height / 2,
    compactLinkMidX: (node, margin) => node.x + node.width / 4 + margin / 4,
    compactLinkMidY: (node, margin) => node.y,
    compactDimension: {
      sizeColumn: (node) => node.width,
      sizeRow: (node) => node.height,
    },
    linkX: (node) => node.x,
    linkY: (node) => node.y,
    linkTargetX: (node) => node.x,
    linkTargetY: (node) => node.y + node.height,
    buttonX: (node) => node.width / 2,
    buttonY: (node) => node.height,
    centerTransform: ({ rootMargin, centerY, scale, centerX }) =>
      `translate(${centerX},${rootMargin}) scale(${scale})`,
    rectSizeWithMargins: ({
      height,
      width,
      siblingsMargin,
      childrenMargin,
    }) => {
      return { width: width + siblingsMargin, height: height + childrenMargin };
    },
    zoomTransform: ({ centerX, scale }) =>
      `translate(${centerX},0}) scale(${scale})`,
    diagonal: vdiagonal,
    swap: (d: Point) => ({ ...d }),
    nodePosition: ({ x, y, width, height }) => ({ x: x - width / 2, y }),
  },
  bottom: {
    nodeLeftX: (node) => -node.width / 2,
    nodeRightX: (node) => node.width / 2,
    nodeTopY: (node) => -node.height,
    nodeBottomY: (node) => 0,
    nodeJoinX: (node) => node.x - node.width / 2,
    nodeJoinY: (node) => node.y - node.height - node.height,
    linkJoinX: (node) => node.x,
    linkJoinY: (node) => node.y - node.height,
    linkCompactXStart: (node, compactEven) =>
      node.x + (compactEven ? node.width / 2 : -node.width / 2),
    linkCompactYStart: (node, compactEven) => node.y - node.height / 2,
    compactLinkMidX: (node, margin) => node.x + node.width / 4 + margin / 4,
    compactLinkMidY: (node, margin) => node.y,
    linkX: (node) => node.x,
    linkY: (node) => node.y,
    compactDimension: {
      sizeColumn: (node) => node.width,
      sizeRow: (node) => node.height,
    },
    linkTargetX: (node) => node.x,
    linkTargetY: (node) => node.y - node.height,
    buttonX: (node) => node.width / 2,
    buttonY: (node) => 0,
    centerTransform: ({ rootMargin, centerY, scale, centerX, chartHeight }) =>
      `translate(${centerX},${chartHeight - rootMargin}) scale(${scale})`,
    rectSizeWithMargins: ({
      height,
      width,
      siblingsMargin,
      childrenMargin,
    }) => {
      return { width: width + siblingsMargin, height: height + childrenMargin };
    },
    zoomTransform: ({ centerX, scale }) =>
      `translate(${centerX},0}) scale(${scale})`,
    diagonal: vdiagonal,
    swap: (d: Point) => ({
      x: d.x,
      y: -d.y,
    }),
    nodePosition: ({ x, y, width, height }) => ({
      x: x - width / 2,
      y: y - height,
    }),
  },
  right: {
    nodeLeftX: (node) => -node.width,
    nodeRightX: (node) => 0,
    nodeTopY: (node) => -node.height / 2,
    nodeBottomY: (node) => node.height / 2,
    nodeJoinX: (node) => node.x - node.width - node.width,
    nodeJoinY: (node) => node.y - node.height / 2,
    linkJoinX: (node) => node.x - node.width,
    linkJoinY: (node) => node.y,
    linkX: (node) => node.x,
    linkY: (node) => node.y,
    linkTargetX: (node) => node.x - node.width,
    linkTargetY: (node) => node.y,
    buttonX: (node) => 0,
    buttonY: (node) => node.height / 2,
    linkCompactXStart: (node, compactEven) => node.x - node.width / 2,
    linkCompactYStart: (node, compactEven) =>
      node.y + (compactEven ? node.height / 2 : -node.height / 2),
    compactLinkMidX: (node, margin) => node.x,
    compactLinkMidY: (node, margin) => node.y + node.width / 4 + margin / 4,
    centerTransform: ({ rootMargin, centerY, scale, centerX, chartWidth }) =>
      `translate(${chartWidth - rootMargin},${centerY}) scale(${scale})`,
    rectSizeWithMargins: ({
      height,
      width,
      siblingsMargin,
      childrenMargin,
    }) => {
      return { width: height + siblingsMargin, height: width + childrenMargin };
    },
    compactDimension: {
      sizeColumn: (node) => node.height,
      sizeRow: (node) => node.width,
    },
    zoomTransform: ({ centerY, scale }) =>
      `translate(${0},${centerY}) scale(${scale})`,
    diagonal: hdiagonal,
    swap: (d: Point) => ({
      x: -d.y,
      y: d.x,
    }),
    nodePosition: ({ x, y, width, height }) => ({
      x: x - width,
      y: y - height / 2,
    }),
  },
};
