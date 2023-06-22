import { max, min, sum, cumsum } from "d3-array";

import { groupBy } from "./group-by";
import { HierarchyNode, State } from "./d3-org-chart.types";

const d3 = {
  max,
  min,
  sum,
  cumsum,
};

/**
 * Sets the following propertiy values on nodes:
 * * compactEven
 * * flexCompactDim
 * * firstCompactNode
 * * row
 */
export function calculateCompactFlexDimensions<Datum>(
  root: HierarchyNode<Datum>,
  attrs: Pick<State<Datum>, "compactMarginBetween" | "compactMarginPair">,
  compactDimension: {
    sizeColumn: (node: HierarchyNode<Datum>) => number;
    sizeRow: (node: HierarchyNode<Datum>) => number;
  }
) {
  const firstCompact = new WeakMap<HierarchyNode<Datum>, boolean | null>();

  root.eachBefore((node) => {
    firstCompact.set(node, null);
    node.compactEven = null;
    node.flexCompactDim = null;
    node.firstCompactNode = undefined;
  });
  root.eachBefore((node) => {
    if (node.children && node.children.length > 1) {
      const leafChildren = node.children.filter((d) => !d.children);

      if (leafChildren.length < 2) {
        return;
      }
      leafChildren.forEach((child, i) => {
        if (!i) {
          firstCompact.set(child, true);
        }
        if (i % 2) child.compactEven = false;
        else child.compactEven = true;
        child.row = Math.floor(i / 2);
      });
      const evenMaxColumnDimension = d3.max(
        leafChildren.filter((d) => d.compactEven),
        compactDimension.sizeColumn
      )!;
      const oddMaxColumnDimension = d3.max(
        leafChildren.filter((d) => !d.compactEven),
        compactDimension.sizeColumn
      )!;
      const columnSize =
        Math.max(evenMaxColumnDimension, oddMaxColumnDimension) * 2;
      const rowsMapNew = groupBy(
        leafChildren,
        (d) => d.row + "",
        (reducedGroup) =>
          d3.max(
            reducedGroup,
            (d) => compactDimension.sizeRow(d) + attrs.compactMarginBetween()
          )
      );
      const rowSize = d3.sum(rowsMapNew.map((v) => v[1]));
      leafChildren.forEach((leafChild) => {
        leafChild.firstCompactNode = leafChildren[0];

        leafChild.flexCompactDim = firstCompact.get(leafChild)
          ? [
              columnSize + attrs.compactMarginPair(leafChild),
              rowSize - attrs.compactMarginBetween(),
            ]
          : [0, 0];
      });
      node.flexCompactDim = null;
    }
  });
}

/**
 * Sets x and y property values on nodes
 */
export function calculateCompactFlexPositions<Datum>(
  root: HierarchyNode<Datum>,
  attrs: Pick<State<Datum>, "compactMarginPair" | "compactMarginBetween">,
  compactDimension: {
    sizeRow: (node: HierarchyNode<Datum>) => number;
  }
) {
  root.eachBefore((node) => {
    if (node.children) {
      const compactChildren = node.children.filter((d) => d.flexCompactDim);
      const fch = compactChildren[0];
      if (!fch) {
        return;
      }
      compactChildren.forEach((child, i, arr) => {
        if (i == 0) fch.x -= fch.flexCompactDim![0] / 2;
        if (i & ((i % 2) - 1))
          child.x =
            fch.x +
            fch.flexCompactDim![0] * 0.25 -
            attrs.compactMarginPair(child) / 4;
        else if (i)
          child.x =
            fch.x +
            fch.flexCompactDim![0] * 0.75 +
            attrs.compactMarginPair(child) / 4;
      });
      const centerX = fch.x + fch.flexCompactDim![0] * 0.5;
      fch.x =
        fch.x +
        fch.flexCompactDim![0] * 0.25 -
        attrs.compactMarginPair(fch) / 4;
      const offsetX = node.x - centerX;
      if (Math.abs(offsetX) < 10) {
        compactChildren.forEach((d) => (d.x += offsetX));
      }

      const rowsMapNew = groupBy(
        compactChildren,
        (d) => d.row + "",
        (reducedGroup) =>
          d3.max(reducedGroup, (d) => compactDimension.sizeRow(d))!
      );
      const cumSum = d3.cumsum(
        rowsMapNew.map((d) => d[1] + attrs.compactMarginBetween())
      );
      compactChildren.forEach((node, i) => {
        if (node.row) {
          node.y = fch.y + cumSum[node.row - 1];
        } else {
          node.y = fch.y;
        }
      });
    }
  });
}
