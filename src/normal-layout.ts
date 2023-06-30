import { flextree } from 'd3-flextree';
import {
  HierarchyNode,
  LayoutBinding,
  Point,
  State,
} from './d3-org-chart.types';
import { NormalLinkPointsCalculator } from './normal-link-points-calculator';

export class NormalLayout<Datum> {
  protected normalLinks = new NormalLinkPointsCalculator(this.layoutBinding);

  constructor(
    protected layoutBinding: Pick<
      LayoutBinding<Datum>,
      'rectSizeWithMargins' | 'linkX' | 'linkY' | 'linkTargetX' | 'linkTargetY'
    >,
    protected attrs: Pick<
      State<Datum>,
      | 'nodeWidth'
      | 'nodeHeight'
      | 'siblingsMargin'
      | 'childrenMargin'
      | 'neighbourMargin'
    >,
    protected root: HierarchyNode<Datum>
  ) {}

  createFlextreeNodes() {
    const flexTreeLayout = this.createFlexTreeLayout();

    //  Assigns the x and y position for the nodes
    return flexTreeLayout(this.root!);
  }

  getNodeSize(node: HierarchyNode<Datum>) {
    return this.layoutBinding.rectSizeWithMargins({
      width: this.attrs.nodeWidth(node),
      height: this.attrs.nodeHeight(node),
      siblingsMargin: this.attrs.siblingsMargin(node),
      childrenMargin: this.attrs.childrenMargin(node),
    });
  }

  getLinkSourcePoint(d: HierarchyNode<Datum>) {
    return this.normalLinks.getNormalSourcePoint(d);
  }

  getLinkTargetPoint(d: HierarchyNode<Datum>) {
    return this.normalLinks.getTargetPoint(d);
  }

  getLinkMiddlePoint(d: HierarchyNode<Datum>): Point | undefined {
    return undefined;
  }

  protected createFlexTreeLayout() {
    return flextree<Datum>({
      nodeSize: (n) => {
        const node = n as HierarchyNode<Datum>;
        const { width, height } = this.getNodeSize(node);
        return [width, height];
      },
      spacing: (nodeA, nodeB) =>
        nodeA.parent == nodeB.parent
          ? 0
          : this.attrs.neighbourMargin(
              nodeA as HierarchyNode<Datum>,
              nodeB as HierarchyNode<Datum>
            ),
    });
  }
}
