import { HierarchyNode, LayoutBinding } from './d3-org-chart.types';

export class NormalLinkPointsCalculator<Datum> {
  constructor(
    private layoutBinding: Pick<
      LayoutBinding<Datum>,
      'linkX' | 'linkY' | 'linkTargetX' | 'linkTargetY'
    >
  ) {}

  getNormalSourcePoint(node: HierarchyNode<Datum>) {
    return {
      x: this.layoutBinding.linkX(node),
      y: this.layoutBinding.linkY(node),
    };
  }

  getTargetPoint(d: HierarchyNode<Datum>) {
    return {
      x: this.layoutBinding.linkTargetX(d),
      y: this.layoutBinding.linkTargetY(d),
    };
  }
}
