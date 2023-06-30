import { max, min, sum, cumsum } from 'd3-array';

import { groupBy } from './group-by';
import {
  HierarchyNode,
  LayoutBinding,
  Size,
  State,
} from './d3-org-chart.types';

const d3 = {
  max,
  min,
  sum,
  cumsum,
};

export class CompactLayout<Datum> {
  compactEven = new WeakMap<HierarchyNode<Datum>, boolean>();
  row = new WeakMap<HierarchyNode<Datum>, number>();
  leafNodeSize = new WeakMap<HierarchyNode<Datum>, Size>();
  firstLeafSibling = new WeakMap<HierarchyNode<Datum>, HierarchyNode<Datum>>();

  constructor(private layoutBinding: LayoutBinding<Datum>) {}

  calculateCompactFlexDimensions(
    root: HierarchyNode<Datum>,
    attrs: Pick<State<Datum>, 'compactMarginBetween' | 'compactMarginPair'>,
    compactDimension: {
      sizeColumn: (node: HierarchyNode<Datum>) => number;
      sizeRow: (node: HierarchyNode<Datum>) => number;
    }
  ) {
    root.eachBefore((node) => {
      if (node.children && node.children.length > 1) {
        const leafChildren = node.children.filter((d) => !d.children);

        if (leafChildren.length < 2) {
          return;
        }
        leafChildren.forEach((child, i) => {
          this.compactEven.set(child, i % 2 === 0);
          this.row.set(child, Math.floor(i / 2));
        });
        const evenMaxColumnDimension = d3.max(
          leafChildren.filter((d) => !!this.compactEven.get(d)),
          compactDimension.sizeColumn
        )!;
        const oddMaxColumnDimension = d3.max(
          leafChildren.filter((d) => !this.compactEven.get(d)),
          compactDimension.sizeColumn
        )!;
        const columnSize =
          Math.max(evenMaxColumnDimension, oddMaxColumnDimension) * 2;
        const rowsMapNew = groupBy(
          leafChildren,
          (d) => this.row.get(d) + '',
          (reducedGroup) =>
            d3.max(
              reducedGroup,
              (d) => compactDimension.sizeRow(d) + attrs.compactMarginBetween()
            )
        );
        const rowSize = d3.sum(rowsMapNew.map((v) => v[1]));
        leafChildren.forEach((leafChild, i) => {
          this.firstLeafSibling.set(leafChild, leafChildren[0]);

          this.leafNodeSize.set(
            leafChild,
            i === 0
              ? {
                  width: columnSize + attrs.compactMarginPair(leafChild),
                  height: rowSize - attrs.compactMarginBetween(),
                }
              : { width: 0, height: 0 }
          );
        });
      }
    });
  }

  getNodeSize(node: HierarchyNode<Datum>, attrs: State<Datum>) {
    return (
      this.leafNodeSize.get(node) ||
      this.layoutBinding.rectSizeWithMargins({
        width: attrs.nodeWidth(node),
        height: attrs.nodeHeight(node),
        siblingsMargin: attrs.siblingsMargin(node),
        childrenMargin: attrs.childrenMargin(node),
      })
    );
  }

  /**
   * Sets x and y property values on nodes
   */
  calculateCompactFlexPositions(
    root: HierarchyNode<Datum>,
    attrs: Pick<State<Datum>, 'compactMarginPair' | 'compactMarginBetween'>
  ) {
    root.eachBefore((node) => {
      if (node.children) {
        const compactChildren = node.children.filter((d) =>
          this.leafNodeSize.has(d)
        );
        const fch = compactChildren[0];
        if (!fch) {
          return;
        }
        compactChildren.forEach((child, i) => {
          if (i === 0) {
            fch.x -= this.leafNodeSize.get(fch)!.width / 2;
          } else {
            if (i % 2) {
              // if odd
              child.x =
                fch.x +
                this.leafNodeSize.get(fch)!.width * 0.75 +
                attrs.compactMarginPair(child) / 4;
            } else {
              // if even
              child.x =
                fch.x +
                this.leafNodeSize.get(fch)!.width * 0.25 -
                attrs.compactMarginPair(child) / 4;
            }
          }
        });
        const centerX = fch.x + this.leafNodeSize.get(fch)!.width * 0.5;
        fch.x +=
          this.leafNodeSize.get(fch)!.width * 0.25 -
          attrs.compactMarginPair(fch) / 4;
        const offsetX = node.x - centerX;
        if (Math.abs(offsetX) < 10) {
          compactChildren.forEach((d) => (d.x += offsetX));
        }

        const rowsMapNew = groupBy(
          compactChildren,
          (d) => this.row.get(d) + '',
          (reducedGroup) =>
            d3.max(reducedGroup, (d) =>
              this.layoutBinding.compactDimension.sizeRow(d)
            )!
        );
        const cumSum = d3.cumsum(
          rowsMapNew.map((d) => d[1] + attrs.compactMarginBetween())
        );
        compactChildren.forEach((node, i) => {
          if (this.row.get(node)) {
            node.y = fch.y + cumSum[this.row.get(node)! - 1];
          } else {
            node.y = fch.y;
          }
        });
      }
    });
  }
}
