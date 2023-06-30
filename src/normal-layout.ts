import { flextree } from 'd3-flextree';
import {
  HierarchyNode,
  LayoutBinding,
  Point,
  Rect,
  State,
} from './d3-org-chart.types';

export class NormalLayout<Datum> {
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
    return {
      x: this.layoutBinding.linkX(this.getNodeRect(d)),
      y: this.layoutBinding.linkY(this.getNodeRect(d)),
    };
  }

  getLinkTargetPoint(d: HierarchyNode<Datum>) {
    return {
      x: this.layoutBinding.linkTargetX(this.getNodeRect(d)),
      y: this.layoutBinding.linkTargetY(this.getNodeRect(d)),
    };
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

  // TODO Should be merged with OrgChart.getNodeRect()
  protected getNodeRect(d: HierarchyNode<Datum>) {
    return {
      x: d.x,
      y: d.y,
      height: this.attrs.nodeHeight(d),
      width: this.attrs.nodeWidth(d),
    } as Rect;
  }
}
