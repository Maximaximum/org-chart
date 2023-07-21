import { flextree } from 'd3-flextree';
import {
  HierarchyNode,
  NormalLayoutAttrs,
  NormalLayoutBinding,
  Point,
  Rect,
} from './d3-org-chart.types';

export class NormalLayout<Datum> {
  constructor(
    protected layoutBinding: NormalLayoutBinding,
    protected attrs: NormalLayoutAttrs<Datum>,
    protected root: HierarchyNode<Datum>,
  ) {}

  createFlextreeNodes() {
    const flexTreeLayout = this.createFlexTreeLayout();

    //  Assigns the x and y position for the nodes
    const res = flexTreeLayout(this.root!);
    res.descendants().forEach((d) => {
      const swapped = this.layoutBinding.swap(d);
      (d as any).x = swapped.x;
      (d as any).y = swapped.y;
    });
    return res;
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
      x: this.layoutBinding.links.source.x(this.getNodeRect(d)),
      y: this.layoutBinding.links.source.y(this.getNodeRect(d)),
    };
  }

  getLinkTargetPoint(d: HierarchyNode<Datum>) {
    return {
      x: this.layoutBinding.links.target.x(this.getNodeRect(d)),
      y: this.layoutBinding.links.target.y(this.getNodeRect(d)),
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
              nodeB as HierarchyNode<Datum>,
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

  getNodesToFit(
    centeredNode: HierarchyNode<any>,
    centerWithDescendants: boolean,
  ) {
    if (centerWithDescendants) {
      return centeredNode.descendants().filter((d, i, arr) => {
        const h = Math.round(arr.length / 2);
        const spread = 2;
        if (arr.length % 2) {
          return i > h - spread && i < h + spread - 1;
        }

        return i > h - spread && i < h + spread;
      });
    } else {
      return [centeredNode];
    }
  }
}
