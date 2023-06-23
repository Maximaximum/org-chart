import { Layout, LayoutBinding, Point } from "./d3-org-chart.types";
import { vdiagonal, hdiagonal } from "./diagonals";

type Datum = any;

/**
 *   You can customize/offset positions for each node and link by overriding these functions
 *   For example, suppose you want to move link y position 30 px bellow in top layout. You can do it like this:
 *   ```javascript
 *   const layout = chart.layoutBindings();
 *   layout.top.linkY = node => node.y + 30;
 *   chart.layoutBindings(layout);
 *   ```
 */
export const defaultLayoutBindings: Record<Layout, LayoutBinding<Datum>> = {
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
    compactLinkMidX: (node, state) => node.firstCompactNode!.x,
    compactLinkMidY: (node, state, firstCompactNodeFlexCompactDim) =>
      node.firstCompactNode!.y +
      firstCompactNodeFlexCompactDim[0] / 4 +
      state.compactMarginPair(node) / 4,
    linkParentX: (node) => node.parent!.x + node.parent!.width,
    linkParentY: (node) => node.parent!.y,
    buttonX: (node) => node.width,
    buttonY: (node) => node.height / 2,
    centerTransform: ({ rootMargin, centerY, scale, centerX }) =>
      `translate(${rootMargin},${centerY}) scale(${scale})`,
    compactDimension: {
      sizeColumn: (node) => node.height,
      sizeRow: (node) => node.width,
    },
    nodeFlexSize: ({ height, width, siblingsMargin, childrenMargin }) => {
      return [height + siblingsMargin, width + childrenMargin];
    },
    zoomTransform: ({ centerY, scale }) =>
      `translate(${0},${centerY}) scale(${scale})`,
    diagonal: hdiagonal,
    swap: ((d: Point) => {
      const x = d.x;
      d.x = d.y;
      d.y = x;
    }) as any,
    nodeUpdateTransform: ({ x, y, width, height }) =>
      `translate(${x},${y - height / 2})`,
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
    compactLinkMidX: (node, state, firstCompactNodeFlexCompactDim) =>
      node.firstCompactNode!.x +
      firstCompactNodeFlexCompactDim[0] / 4 +
      state.compactMarginPair(node) / 4,
    compactLinkMidY: (node) => node.firstCompactNode!.y,
    compactDimension: {
      sizeColumn: (node) => node.width,
      sizeRow: (node) => node.height,
    },
    linkX: (node) => node.x,
    linkY: (node) => node.y,
    linkParentX: (node) => node.parent!.x,
    linkParentY: (node) => node.parent!.y + node.parent!.height,
    buttonX: (node) => node.width / 2,
    buttonY: (node) => node.height,
    centerTransform: ({ rootMargin, centerY, scale, centerX }) =>
      `translate(${centerX},${rootMargin}) scale(${scale})`,
    nodeFlexSize: ({ height, width, siblingsMargin, childrenMargin }) => {
      return [width + siblingsMargin, height + childrenMargin];
    },
    zoomTransform: ({ centerX, scale }) =>
      `translate(${centerX},0}) scale(${scale})`,
    diagonal: vdiagonal,
    swap: ((d: Point) => {}) as any,
    nodeUpdateTransform: ({ x, y, width, height }) =>
      `translate(${x - width / 2},${y})`,
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
    compactLinkMidX: (node, state, firstCompactNodeFlexCompactDim) =>
      node.firstCompactNode!.x +
      firstCompactNodeFlexCompactDim[0] / 4 +
      state.compactMarginPair(node) / 4,
    compactLinkMidY: (node) => node.firstCompactNode!.y,
    linkX: (node) => node.x,
    linkY: (node) => node.y,
    compactDimension: {
      sizeColumn: (node) => node.width,
      sizeRow: (node) => node.height,
    },
    linkParentX: (node) => node.parent!.x,
    linkParentY: (node) => node.parent!.y - node.parent!.height,
    buttonX: (node) => node.width / 2,
    buttonY: (node) => 0,
    centerTransform: ({ rootMargin, centerY, scale, centerX, chartHeight }) =>
      `translate(${centerX},${chartHeight - rootMargin}) scale(${scale})`,
    nodeFlexSize: ({ height, width, siblingsMargin, childrenMargin }) => {
      return [width + siblingsMargin, height + childrenMargin];
    },
    zoomTransform: ({ centerX, scale }) =>
      `translate(${centerX},0}) scale(${scale})`,
    diagonal: vdiagonal,
    swap: ((d: Point) => {
      d.y = -d.y;
    }) as any,
    nodeUpdateTransform: ({ x, y, width, height }) =>
      `translate(${x - width / 2},${y - height})`,
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
    linkParentX: (node) => node.parent!.x - node.parent!.width,
    linkParentY: (node) => node.parent!.y,
    buttonX: (node) => 0,
    buttonY: (node) => node.height / 2,
    linkCompactXStart: (node, compactEven) => node.x - node.width / 2,
    linkCompactYStart: (node, compactEven) =>
      node.y + (compactEven ? node.height / 2 : -node.height / 2),
    compactLinkMidX: (node, state) => node.firstCompactNode!.x,
    compactLinkMidY: (node, state, firstCompactNodeFlexCompactDim) =>
      node.firstCompactNode!.y +
      firstCompactNodeFlexCompactDim[0] / 4 +
      state.compactMarginPair(node) / 4,
    centerTransform: ({ rootMargin, centerY, scale, centerX, chartWidth }) =>
      `translate(${chartWidth - rootMargin},${centerY}) scale(${scale})`,
    nodeFlexSize: ({ height, width, siblingsMargin, childrenMargin }) => {
      return [height + siblingsMargin, width + childrenMargin];
    },
    compactDimension: {
      sizeColumn: (node) => node.height,
      sizeRow: (node) => node.width,
    },
    zoomTransform: ({ centerY, scale }) =>
      `translate(${0},${centerY}) scale(${scale})`,
    diagonal: hdiagonal,
    swap: ((d: Point) => {
      const x = d.x;
      d.x = -d.y;
      d.y = x;
    }) as any,
    nodeUpdateTransform: ({ x, y, width, height }) =>
      `translate(${x - width},${y - height / 2})`,
  },
};
