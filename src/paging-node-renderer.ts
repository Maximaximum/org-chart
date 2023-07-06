import './patternify';

import { HierarchyNode, State, ConcreteDatum } from './d3-org-chart.types';
import { Selection } from 'd3';
import { OrgChart, createHierarchyFromData } from './org-chart';
import { HierarchyNode as D3HierarchyNode } from 'd3';

/**
 * Number of nodes to show within a node's children "page"
 */
const pageSize = 5;

export const pagingNodeSelector = '.paging-node-foreign-object';

export class PagingNodeRenderer<Datum extends ConcreteDatum> {
  // TODO: Make private?
  childrenToShowNumber = new Map<Datum, number>();
  // TODO: Make private?
  /** Set of nodes that should be replaced with a pagination button while rendering  */
  paginationButtonNodes = new Set<Datum>();
  /** Total number of node children (including hidden by pagination and collapsion) */
  totalChildrenNumber = new Map<Datum, number>();

  nodesHiddenDueToPagination = new Set<string>();

  constructor(private chart: OrgChart<Datum>) {}

  private initNumberOfChildrenToShow(
    nodes: D3HierarchyNode<Datum>[],
    minPagingVisibleNodes: (node: D3HierarchyNode<Datum>) => number
  ) {
    nodes
      .filter((node) => node.children)
      .filter((node) => !this.childrenToShowNumber.has(node.data))
      .forEach((node) => {
        this.childrenToShowNumber.set(node.data, minPagingVisibleNodes(node));
      });
  }

  initPagination(
    root: D3HierarchyNode<Datum>,
    minPagingVisibleNodes: (node: D3HierarchyNode<Datum>) => number
  ) {
    this.initNumberOfChildrenToShow(root!.descendants(), minPagingVisibleNodes);

    this.nodesHiddenDueToPagination.clear();

    root!.eachBefore((node, i) => {
      this.totalChildrenNumber.set(node.data, node.children?.length ?? 0);

      if (node.children) {
        node.children.forEach((child, j) => {
          this.paginationButtonNodes.delete(child.data);
          if (j > this.childrenToShowNumber.get(node.data)!) {
            this.nodesHiddenDueToPagination.add(child.id!);
          }
          if (
            j === this.childrenToShowNumber.get(node.data) &&
            node.children!.length - 1 >
              this.childrenToShowNumber.get(node.data)!
          ) {
            this.paginationButtonNodes.add(child.data);
          }
          if (this.nodesHiddenDueToPagination.has(child.parent!.id!)) {
            this.nodesHiddenDueToPagination.add(child.id!);
          }
        });
      }
    });
  }

  draw = (
    containerSelection: Selection<
      SVGForeignObjectElement,
      HierarchyNode<Datum>,
      SVGGElement,
      HierarchyNode<Datum>
    >
  ) => {
    const attrs = this.chart.getChartState();
    const that = this;

    containerSelection
      .join(
        (enter) =>
          enter
            .append('foreignObject')
            .attr('class', 'paging-node-foreign-object'),
        (update) => update,
        (exit) => exit.remove()
      )
      .style('overflow', 'visible')
      .attr('width', (d) => attrs.nodeWidth(d))
      .attr('height', (d) => attrs.nodeHeight(d))
      .attr('x', 0)
      .attr('y', 0)

      .patternify({
        tag: 'xhtml:div' as 'div',
        className: 'paging-node-foreign-object-div',
        data: (d) => [d],
      })
      .style('width', (d) => `${attrs.nodeWidth(d)}px`)
      .style('height', (d) => `${attrs.nodeHeight(d)}px`)

      .patternify({
        tag: 'div',
        className: 'paging-button-wrapper',
        data: (d) => [d],
      })
      .style('cursor', 'pointer')
      .on('click', (e, d) => {
        that.loadNextPageOfNodes(d);
      })
      .html((d, i, arr) => {
        return pagingButton(this.getNextPageAmount(d, i, arr, attrs));
      });
  };

  loadNextPageOfNodes(paginationButtonNode: HierarchyNode<Datum>) {
    const paginationContainer = paginationButtonNode.parent!;

    this.paginationButtonNodes.delete(paginationButtonNode.data);

    this.childrenToShowNumber.set(
      paginationContainer.data,
      this.childrenToShowNumber.get(paginationContainer.data)! + pageSize
    );

    this.chart.root = createHierarchyFromData(
      this.chart.getChartState().data!,
      this.chart.pagination,
      this.chart.getChartState()
    );
    this.chart.rerender();
  }

  getNextPageAmount = (
    d: HierarchyNode<Datum>,
    i: number,
    arr: HTMLDivElement[] | ArrayLike<HTMLDivElement>,
    state: State<Datum>
  ) => {
    const diff =
      this.totalChildrenNumber.get(d.parent!.data)! -
      this.childrenToShowNumber.get(d.parent!.data)!;
    return Math.min(diff, pageSize);
  };
}

function pagingButton(nextPageAmount: number) {
  return `
    <div style="pointer-events:none">
      <div style="margin-top:90px;">
        <div style="display:flex;width:170px;border-radius:20px;padding:5px 15px; padding-bottom:4px;;background-color:#E5E9F2">
        <div><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.59 7.41L10.18 12L5.59 16.59L7 18L13 12L7 6L5.59 7.41ZM16 6H18V18H16V6Z" fill="#716E7B" stroke="#716E7B"/>
        </svg>
        </div><div style="line-height:2"> Show next ${nextPageAmount} nodes </div></div>
      </div>
    </div>
  `;
}
