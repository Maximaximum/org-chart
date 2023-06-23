import { HierarchyNode, LayoutBinding } from "./d3-org-chart.types";

export class LinkPointsCalculator<Datum> {
  constructor(public layoutBinding: LayoutBinding<Datum>) {}

  getSourcePoint(
    node: HierarchyNode<Datum>,
    compactMarginPair: (node: HierarchyNode<Datum>) => number,
    flexCompactDim: WeakMap<HierarchyNode<Datum>, [number, number]>,
    firstCompactNode: WeakMap<HierarchyNode<Datum>, HierarchyNode<Datum>>
  ) {
    if (flexCompactDim.has(node)) {
      const firstCompactNodeRect = {
        x: firstCompactNode.get(node)!.x,
        y: firstCompactNode.get(node)!.y,
        width: flexCompactDim.get(firstCompactNode.get(node)!)![0],
        height: flexCompactDim.get(firstCompactNode.get(node)!)![1],
      };

      return {
        x: this.layoutBinding.compactLinkMidX(
          firstCompactNodeRect,
          compactMarginPair(node)
        ),
        y: this.layoutBinding.compactLinkMidY(
          firstCompactNodeRect,
          compactMarginPair(node)
        ),
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
    flexCompactDim: WeakMap<HierarchyNode<Datum>, [number, number]>,
    compactEven: WeakMap<HierarchyNode<Datum>, boolean>
  ) {
    return (
      (flexCompactDim.has(d) && {
        x: this.layoutBinding.linkCompactXStart(d, !!compactEven.get(d)),
        y: this.layoutBinding.linkCompactYStart(d, !!compactEven.get(d)),
      }) ||
      undefined
    );
  }

  getTargetPoint(d: HierarchyNode<Datum>) {
    return {
      x: this.layoutBinding.linkParentX(d),
      y: this.layoutBinding.linkParentY(d),
    };
  }
}
