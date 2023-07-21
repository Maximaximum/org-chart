import { max, min, sum, cumsum } from 'd3-array';

import { groupBy } from './group-by';
import {
  CompactLayoutAttrs,
  CompactLayoutBinding,
  HierarchyNode,
  NormalLayoutAttrs,
  NormalLayoutBinding,
  Size,
} from './d3-org-chart.types';
import { NormalLayout } from './normal-layout';

const d3 = {
  max,
  min,
  sum,
  cumsum,
};

export class CompactLayout<Datum> extends NormalLayout<Datum> {
  private compactEven = new WeakMap<HierarchyNode<Datum>, boolean>();
  private row = new WeakMap<HierarchyNode<Datum>, number>();
  private leafNodeSize = new WeakMap<HierarchyNode<Datum>, Size>();
  private firstLeafSibling = new WeakMap<
    HierarchyNode<Datum>,
    HierarchyNode<Datum>
  >();

  constructor(
    layoutBinding: NormalLayoutBinding,
    protected compactLayoutBinding: CompactLayoutBinding,
    protected override attrs: CompactLayoutAttrs<Datum> &
      NormalLayoutAttrs<Datum>,
    root: HierarchyNode<Datum>
  ) {
    super(layoutBinding, attrs, root);
    this.performInitialCalculations();
  }

  override createFlextreeNodes() {
    const res = super.createFlextreeNodes();

    // Reassigns the x and y position for the nodes based on the compact layout
    this.calculateCompactFlexPositions();

    return res;
  }

  override getNodeSize(node: HierarchyNode<Datum>) {
    return this.leafNodeSize.get(node) || super.getNodeSize(node);
  }

  private performInitialCalculations() {
    this.root.eachBefore((node) => {
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
          leafChildren
            .filter((d) => !!this.compactEven.get(d))
            .map((d) => this.getNodeRect(d)),
          this.compactLayoutBinding.compactDimension.sizeColumn
        )!;
        const oddMaxColumnDimension = d3.max(
          leafChildren
            .filter((d) => !this.compactEven.get(d))
            .map((d) => this.getNodeRect(d)),
          this.compactLayoutBinding.compactDimension.sizeColumn
        )!;
        const columnSize =
          Math.max(evenMaxColumnDimension, oddMaxColumnDimension) * 2;
        const rowsMapNew = groupBy(
          leafChildren,
          (d) => this.row.get(d) + '',
          (reducedGroup) =>
            d3.max(
              reducedGroup,
              (d) =>
                this.compactLayoutBinding.compactDimension.sizeRow(
                  this.getNodeRect(d)
                ) + this.attrs.compactMarginBetween()
            )
        );
        const rowSize = d3.sum(rowsMapNew.map((v) => v[1]));
        leafChildren.forEach((leafChild, i) => {
          this.firstLeafSibling.set(leafChild, leafChildren[0]!);

          this.leafNodeSize.set(
            leafChild,
            i === 0
              ? {
                  width: columnSize + this.attrs.compactMarginPair(leafChild),
                  height: rowSize - this.attrs.compactMarginBetween(),
                }
              : { width: 0, height: 0 }
          );
        });
      }
    });
  }

  /**
   * Sets x and y property values on nodes
   */
  private calculateCompactFlexPositions() {
    this.root.eachBefore((node) => {
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
                this.attrs.compactMarginPair(child) / 4;
            } else {
              // if even
              child.x =
                fch.x +
                this.leafNodeSize.get(fch)!.width * 0.25 -
                this.attrs.compactMarginPair(child) / 4;
            }
          }
        });
        const centerX = fch.x + this.leafNodeSize.get(fch)!.width * 0.5;
        fch.x +=
          this.leafNodeSize.get(fch)!.width * 0.25 -
          this.attrs.compactMarginPair(fch) / 4;
        const offsetX = node.x - centerX;
        if (Math.abs(offsetX) < 10) {
          compactChildren.forEach((d) => (d.x += offsetX));
        }

        const rowsMapNew = groupBy(
          compactChildren,
          (d) => this.row.get(d) + '',
          (reducedGroup) =>
            d3.max(reducedGroup, (d) =>
              this.compactLayoutBinding.compactDimension.sizeRow(
                this.getNodeRect(d)
              )
            )!
        );
        const cumSum = d3.cumsum(
          rowsMapNew.map((d) => d[1] + this.attrs.compactMarginBetween())
        );
        compactChildren.forEach((node, i) => {
          if (this.row.get(node)) {
            node.y = fch.y + cumSum[this.row.get(node)! - 1]!;
          } else {
            node.y = fch.y;
          }
        });
      }
    });
  }

  override getLinkSourcePoint(d: HierarchyNode<Datum>) {
    const firstLeafSibling = this.firstLeafSibling.get(d);

    if (firstLeafSibling) {
      const rect = {
        x: firstLeafSibling.x,
        y: firstLeafSibling.y,
        width: this.leafNodeSize.get(firstLeafSibling)!.width,
        height: this.leafNodeSize.get(firstLeafSibling)!.height,
      };
      const margin = this.attrs.compactMarginPair(d);

      return {
        x: this.compactLayoutBinding.links.source.x(rect, margin),
        y: this.compactLayoutBinding.links.source.y(rect, margin),
      };
    } else {
      return super.getLinkSourcePoint(d);
    }
  }

  override getLinkMiddlePoint(d: HierarchyNode<Datum>) {
    const isNodeCompact = this.leafNodeSize.has(d);

    if (!isNodeCompact) {
      return undefined;
    } else {
      const compactEven = !!this.compactEven.get(d);

      return {
        x: this.compactLayoutBinding.links.middle.x(
          this.getNodeRect(d),
          compactEven
        ),
        y: this.compactLayoutBinding.links.middle.y(
          this.getNodeRect(d),
          compactEven
        ),
      };
    }
  }
}
