import { HierarchyNode, LayoutBinding, Rect } from "./d3-org-chart.types";

export class LinkPointsCalculator<Datum> {
  constructor(public layoutBinding: LayoutBinding<Datum>) {}

  getSourcePoint(
    node: HierarchyNode<Datum>,
    margin: number,
    firstCompactNodeRect: Rect | undefined
  ) {
    if (firstCompactNodeRect) {
      return {
        x: this.layoutBinding.compactLinkMidX(firstCompactNodeRect, margin),
        y: this.layoutBinding.compactLinkMidY(firstCompactNodeRect, margin),
      };
    } else {
      return {
        x: this.layoutBinding.linkX(node),
        y: this.layoutBinding.linkY(node),
      };
    }
  }

  getMiddlePoint(
    d: HierarchyNode<Datum>,
    isNodeCompact: boolean,
    compactEven: boolean
  ) {
    if (isNodeCompact) {
      return {
        x: this.layoutBinding.linkCompactXStart(d, compactEven),
        y: this.layoutBinding.linkCompactYStart(d, compactEven),
      };
    } else {
      return undefined;
    }
  }

  getTargetPoint(d: HierarchyNode<Datum>) {
    return {
      x: this.layoutBinding.linkParentX(d),
      y: this.layoutBinding.linkParentY(d),
    };
  }
}
