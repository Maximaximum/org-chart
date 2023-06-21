import "./patternify";

import { select } from "d3-selection";
import { max, min, sum, cumsum } from "d3-array";
import { stratify } from "d3-hierarchy";
import { zoom, zoomIdentity } from "d3-zoom";
import { flextree } from "d3-flextree";
import { linkHorizontal } from "d3-shape";

import { HierarchyNode, State, ConcreteDatum } from "./d3-org-chart.types";
import { create, Selection } from "d3";
import { OrgChart } from "./org-chart";

const d3 = {
  select,
  max,
  min,
  sum,
  cumsum,
  stratify,
  zoom,
  zoomIdentity,
  linkHorizontal,
  flextree,
  create,
};

/**
 * Number of nodes to show within a node's children "page"
 */
const pagingStep = 5;

export const pagingNodeSelector = ".paging-node-foreign-object";

export class PagingNodeRenderer<Datum extends ConcreteDatum> {
  constructor(private chart: OrgChart<Datum>) {}

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
            .append("foreignObject")
            .attr("class", "paging-node-foreign-object"),
        (update) => update,
        (exit) => exit.remove()
      )
      .style("overflow", "visible")
      .attr("width", ({ width }) => width)
      .attr("height", ({ height }) => height)
      .attr("x", 0)
      .attr("y", 0)

      .patternify({
        tag: "xhtml:div" as "div",
        className: "paging-node-foreign-object-div",
        data: (d) => [d],
      })
      .style("width", ({ width }) => `${width}px`)
      .style("height", ({ height }) => `${height}px`)

      .patternify({
        tag: "div",
        className: "paging-button-wrapper",
        data: (d) => [d],
      })
      .style("cursor", "pointer")
      .on("click", (e, d) => {
        that.loadNextPageOfNodes(d);
      })
      .html((d, i, arr) => {
        return pagingButton(getNextPageAmount(d, i, arr, attrs));
      });
  };

  // Load Paging Nodes
  loadNextPageOfNodes(paginationButtonNode: HierarchyNode<Datum>) {
    paginationButtonNode.data._pagingButton = false;
    const current = paginationButtonNode.parent!.data._pagingStep!;
    const step = pagingStep;
    const newPagingIndex = current + step;
    paginationButtonNode.parent!.data._pagingStep = newPagingIndex;
    console.log("loading paging nodes", paginationButtonNode);
    this.chart.updateNodesState();
  }
}

/** Node paging button content and styling. You can access same helper methods as above. */
const getNextPageAmount = <Datum extends ConcreteDatum>(
  d: HierarchyNode<Datum>,
  i: number,
  arr: HTMLDivElement[] | ArrayLike<HTMLDivElement>,
  state: State<Datum>
) => {
  const step = pagingStep;
  const currentIndex = d.parent!.data._pagingStep;
  const diff = d.parent!.data._directSubordinatesPaging! - currentIndex!;
  return Math.min(diff, step);
};

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
