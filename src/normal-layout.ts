import { FlextreeNode, flextree } from 'd3-flextree';
import { HierarchyNode, LayoutBinding, State } from './d3-org-chart.types';
import { NormalLinkPointsCalculator } from './normal-link-points-calculator';

export class NormalLayout<Datum> {
  private normalLinks = new NormalLinkPointsCalculator(this.layoutBinding);

  treeData: FlextreeNode<Datum>;

  constructor(
    private layoutBinding: Pick<
      LayoutBinding<Datum>,
      'rectSizeWithMargins' | 'linkX' | 'linkY' | 'linkTargetX' | 'linkTargetY'
    >,
    private attrs: Pick<
      State<Datum>,
      | 'nodeWidth'
      | 'nodeHeight'
      | 'siblingsMargin'
      | 'childrenMargin'
      | 'neighbourMargin'
    >,
    private root: HierarchyNode<Datum>
  ) {
    const flexTreeLayout = flextree<Datum>({
      nodeSize: (n) => {
        const node = n as HierarchyNode<Datum>;
        const { width, height } = this.getNodeSize(node);
        return [width, height];
      },
      spacing: (nodeA, nodeB) =>
        nodeA.parent == nodeB.parent
          ? 0
          : attrs.neighbourMargin(
              nodeA as HierarchyNode<Datum>,
              nodeB as HierarchyNode<Datum>
            ),
    });

    //  Assigns the x and y position for the nodes
    this.treeData = flexTreeLayout!(this.root!);
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

  getLinkMiddlePoint(d: HierarchyNode<Datum>) {
    return undefined;
  }
}
