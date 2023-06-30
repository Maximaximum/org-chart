import { HierarchyNode, LayoutBinding, Rect } from './d3-org-chart.types';

export class CompactLinkPointsCalculator<Datum> {
  constructor(
    public layoutBinding: Pick<
      LayoutBinding<Datum>,
      | 'compactLinkMidX'
      | 'compactLinkMidY'
      | 'linkCompactXStart'
      | 'linkCompactYStart'
    >
  ) {}

  getCompactSourcePoint(rect: Rect, margin: number) {
    return {
      x: this.layoutBinding.compactLinkMidX(rect, margin),
      y: this.layoutBinding.compactLinkMidY(rect, margin),
    };
  }

  getCompactMiddlePoint(d: HierarchyNode<Datum>, compactEven: boolean) {
    return {
      x: this.layoutBinding.linkCompactXStart(d, compactEven),
      y: this.layoutBinding.linkCompactYStart(d, compactEven),
    };
  }
}
