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
    normalLayoutBinding: {
      rectSizeWithMargins: ({
        height,
        width,
        siblingsMargin,
        childrenMargin,
      }) => {
        return {
          width: height + siblingsMargin,
          height: width + childrenMargin,
        };
      },
      linkSource: {
        x: (node) => node.x,
        y: (node) => node.y,
      },
      linkTarget: {
        x: (node) => node.x + node.width,
        y: (node) => node.y,
      },
      swap: (d: Point) => ({
        x: d.y,
        y: d.x,
      }),
    },
    compactLayoutBinding: {
      compactDimension: {
        sizeColumn: (node) => node.height,
        sizeRow: (node) => node.width,
      },
      compactLinkMidX: (node, margin) => node.x,
      compactLinkMidY: (node, margin) => node.y + node.width / 4 + margin / 4,
      linkCompactXStart: (node, compactEven) => node.x + node.width / 2,
      linkCompactYStart: (node, compactEven) =>
        node.y + (compactEven ? node.height / 2 : -node.height / 2),
    },
    nodeEdgePositionRelativeToNodePosition: {
      left: (node) => 0,
      right: (node) => node.width,
      top: (node) => -node.height / 2,
      bottom: (node) => node.height / 2,
    },
    actualAbsoluteNodePosition: {
      x: (node) => node.x + node.width,
      y: (node) => node.y - node.height / 2,
    },

    centerTransform: ({ rootMargin, centerY, scale, centerX }) =>
      `translate(${rootMargin},${centerY}) scale(${scale})`,
    zoomTransform: ({ centerY, scale }) =>
      `translate(${0},${centerY}) scale(${scale})`,
    diagonal: hdiagonal,
  },
  top: {
    normalLayoutBinding: {
      rectSizeWithMargins: ({
        height,
        width,
        siblingsMargin,
        childrenMargin,
      }) => {
        return {
          width: width + siblingsMargin,
          height: height + childrenMargin,
        };
      },
      linkSource: {
        x: (node) => node.x,
        y: (node) => node.y,
      },
      linkTarget: {
        x: (node) => node.x,
        y: (node) => node.y + node.height,
      },
      swap: (d: Point) => ({ ...d }),
    },
    compactLayoutBinding: {
      compactDimension: {
        sizeColumn: (node) => node.width,
        sizeRow: (node) => node.height,
      },
      compactLinkMidX: (node, margin) => node.x + node.width / 4 + margin / 4,
      compactLinkMidY: (node, margin) => node.y,
      linkCompactXStart: (node, compactEven) =>
        node.x + (compactEven ? node.width / 2 : -node.width / 2),
      linkCompactYStart: (node, compactEven) => node.y + node.height / 2,
    },
    nodeEdgePositionRelativeToNodePosition: {
      left: (node) => -node.width / 2,
      right: (node) => node.width / 2,
      top: (node) => 0,
      bottom: (node) => node.height,
    },
    actualAbsoluteNodePosition: {
      x: (node) => node.x - node.width / 2,
      y: (node) => node.y + node.height,
    },

    centerTransform: ({ rootMargin, centerY, scale, centerX }) =>
      `translate(${centerX},${rootMargin}) scale(${scale})`,

    zoomTransform: ({ centerX, scale }) =>
      `translate(${centerX},0}) scale(${scale})`,
    diagonal: vdiagonal,
  },
  bottom: {
    normalLayoutBinding: {
      rectSizeWithMargins: ({
        height,
        width,
        siblingsMargin,
        childrenMargin,
      }) => {
        return {
          width: width + siblingsMargin,
          height: height + childrenMargin,
        };
      },
      linkSource: {
        x: (node) => node.x,
        y: (node) => node.y,
      },
      linkTarget: {
        x: (node) => node.x,
        y: (node) => node.y - node.height,
      },
      swap: (d: Point) => ({
        x: d.x,
        y: -d.y,
      }),
    },
    compactLayoutBinding: {
      compactDimension: {
        sizeColumn: (node) => node.width,
        sizeRow: (node) => node.height,
      },
      compactLinkMidX: (node, margin) => node.x + node.width / 4 + margin / 4,
      compactLinkMidY: (node, margin) => node.y,
      linkCompactXStart: (node, compactEven) =>
        node.x + (compactEven ? node.width / 2 : -node.width / 2),
      linkCompactYStart: (node, compactEven) => node.y - node.height / 2,
    },
    nodeEdgePositionRelativeToNodePosition: {
      left: (node) => -node.width / 2,
      right: (node) => node.width / 2,
      top: (node) => -node.height,
      bottom: (node) => 0,
    },
    actualAbsoluteNodePosition: {
      x: (node) => node.x - node.width / 2,
      y: (node) => node.y - node.height - node.height,
    },

    centerTransform: ({ rootMargin, centerY, scale, centerX, chartHeight }) =>
      `translate(${centerX},${chartHeight - rootMargin}) scale(${scale})`,
    zoomTransform: ({ centerX, scale }) =>
      `translate(${centerX},0}) scale(${scale})`,
    diagonal: vdiagonal,
  },
  right: {
    normalLayoutBinding: {
      rectSizeWithMargins: ({
        height,
        width,
        siblingsMargin,
        childrenMargin,
      }) => {
        return {
          width: height + siblingsMargin,
          height: width + childrenMargin,
        };
      },
      linkSource: {
        x: (node) => node.x,
        y: (node) => node.y,
      },
      linkTarget: {
        x: (node) => node.x - node.width,
        y: (node) => node.y,
      },
      swap: (d: Point) => ({
        x: -d.y,
        y: d.x,
      }),
    },
    compactLayoutBinding: {
      compactDimension: {
        sizeColumn: (node) => node.height,
        sizeRow: (node) => node.width,
      },
      linkCompactXStart: (node, compactEven) => node.x - node.width / 2,
      linkCompactYStart: (node, compactEven) =>
        node.y + (compactEven ? node.height / 2 : -node.height / 2),
      compactLinkMidX: (node, margin) => node.x,
      compactLinkMidY: (node, margin) => node.y + node.width / 4 + margin / 4,
    },
    nodeEdgePositionRelativeToNodePosition: {
      left: (node) => -node.width,
      right: (node) => 0,
      top: (node) => -node.height / 2,
      bottom: (node) => node.height / 2,
    },
    actualAbsoluteNodePosition: {
      x: (node) => node.x - node.width - node.width,
      y: (node) => node.y - node.height / 2,
    },

    centerTransform: ({ rootMargin, centerY, scale, centerX, chartWidth }) =>
      `translate(${chartWidth - rootMargin},${centerY}) scale(${scale})`,
    zoomTransform: ({ centerY, scale }) =>
      `translate(${0},${centerY}) scale(${scale})`,
    diagonal: hdiagonal,
  },
};
