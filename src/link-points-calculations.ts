import { HierarchyNode, LayoutBinding, Rect } from "./d3-org-chart.types";

export class LinkPointsCalculator<Datum> {
  constructor(public layoutBinding: LayoutBinding<Datum>) {}

  getCompactSourcePoint(rect: Rect, margin: number) {
    return {
      x: this.layoutBinding.compactLinkMidX(rect, margin),
      y: this.layoutBinding.compactLinkMidY(rect, margin),
    };
  }

  getNormalSourcePoint(node: HierarchyNode<Datum>) {
    return {
      x: this.layoutBinding.linkX(node),
      y: this.layoutBinding.linkY(node),
    };
  }

  getCompactMiddlePoint(d: HierarchyNode<Datum>, compactEven: boolean) {
    return {
      x: this.layoutBinding.linkCompactXStart(d, compactEven),
      y: this.layoutBinding.linkCompactYStart(d, compactEven),
    };
  }

  getTargetPoint(d: HierarchyNode<Datum>) {
    return {
      x: this.layoutBinding.linkTargetX(d),
      y: this.layoutBinding.linkTargetY(d),
    };
  }
}
