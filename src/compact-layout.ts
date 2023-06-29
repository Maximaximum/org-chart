import { max, min, sum, cumsum } from 'd3-array';

import { groupBy } from './group-by';
import { HierarchyNode, State } from './d3-org-chart.types';

const d3 = {
  max,
  min,
  sum,
  cumsum,
};

export function calculateCompactFlexDimensions<Datum>(
  root: HierarchyNode<Datum>,
  attrs: Pick<State<Datum>, 'compactMarginBetween' | 'compactMarginPair'>,
  compactDimension: {
    sizeColumn: (node: HierarchyNode<Datum>) => number;
    sizeRow: (node: HierarchyNode<Datum>) => number;
  }
) {
  const firstCompact = new WeakSet<HierarchyNode<Datum>>();
  const compactEven = new WeakMap<HierarchyNode<Datum>, boolean>();
  const row = new WeakMap<HierarchyNode<Datum>, number>();
  const flexCompactDim = new WeakMap<HierarchyNode<Datum>, [number, number]>();
  const firstCompactSibling = new WeakMap<
    HierarchyNode<Datum>,
    HierarchyNode<Datum>
  >();

  root.eachBefore((node) => {
    if (node.children && node.children.length > 1) {
      const leafChildren = node.children.filter((d) => !d.children);

      if (leafChildren.length < 2) {
        return;
      }
      leafChildren.forEach((child, i) => {
        if (!i) {
          firstCompact.add(child);
        }

        compactEven.set(child, i % 2 === 0);
        row.set(child, Math.floor(i / 2));
      });
      const evenMaxColumnDimension = d3.max(
        leafChildren.filter((d) => !!compactEven.get(d)),
        compactDimension.sizeColumn
      )!;
      const oddMaxColumnDimension = d3.max(
        leafChildren.filter((d) => !compactEven.get(d)),
        compactDimension.sizeColumn
      )!;
      const columnSize =
        Math.max(evenMaxColumnDimension, oddMaxColumnDimension) * 2;
      const rowsMapNew = groupBy(
        leafChildren,
        (d) => row.get(d) + '',
        (reducedGroup) =>
          d3.max(
            reducedGroup,
            (d) => compactDimension.sizeRow(d) + attrs.compactMarginBetween()
          )
      );
      const rowSize = d3.sum(rowsMapNew.map((v) => v[1]));
      leafChildren.forEach((leafChild) => {
        firstCompactSibling.set(leafChild, leafChildren[0]);

        flexCompactDim.set(
          leafChild,
          firstCompact.has(leafChild)
            ? [
                columnSize + attrs.compactMarginPair(leafChild),
                rowSize - attrs.compactMarginBetween(),
              ]
            : [0, 0]
        );
      });
      flexCompactDim.delete(node);
    }
  });

  return {
    compactEven,
    row,
    flexCompactDim,
    firstCompactSibling,
  };
}

/**
 * Sets x and y property values on nodes
 */
export function calculateCompactFlexPositions<Datum>(
  root: HierarchyNode<Datum>,
  attrs: Pick<State<Datum>, 'compactMarginPair' | 'compactMarginBetween'>,
  compactDimension: {
    sizeRow: (node: HierarchyNode<Datum>) => number;
  },
  row: WeakMap<HierarchyNode<Datum>, number>,
  flexCompactDim: WeakMap<HierarchyNode<Datum>, [number, number]>
) {
  root.eachBefore((node) => {
    if (node.children) {
      const compactChildren = node.children.filter((d) =>
        flexCompactDim.has(d)
      );
      const fch = compactChildren[0];
      if (!fch) {
        return;
      }
      compactChildren.forEach((child, i, arr) => {
        if (i == 0) fch.x -= flexCompactDim.get(fch)![0] / 2;
        if (i & ((i % 2) - 1))
          child.x =
            fch.x +
            flexCompactDim.get(fch)![0] * 0.25 -
            attrs.compactMarginPair(child) / 4;
        else if (i)
          child.x =
            fch.x +
            flexCompactDim.get(fch)![0] * 0.75 +
            attrs.compactMarginPair(child) / 4;
      });
      const centerX = fch.x + flexCompactDim.get(fch)![0] * 0.5;
      fch.x =
        fch.x +
        flexCompactDim.get(fch)![0] * 0.25 -
        attrs.compactMarginPair(fch) / 4;
      const offsetX = node.x - centerX;
      if (Math.abs(offsetX) < 10) {
        compactChildren.forEach((d) => (d.x += offsetX));
      }

      const rowsMapNew = groupBy(
        compactChildren,
        (d) => row.get(d) + '',
        (reducedGroup) =>
          d3.max(reducedGroup, (d) => compactDimension.sizeRow(d))!
      );
      const cumSum = d3.cumsum(
        rowsMapNew.map((d) => d[1] + attrs.compactMarginBetween())
      );
      compactChildren.forEach((node, i) => {
        if (row.get(node)) {
          node.y = fch.y + cumSum[row.get(node)! - 1];
        } else {
          node.y = fch.y;
        }
      });
    }
  });
}
