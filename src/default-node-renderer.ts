import "./patternify";

import { BaseType, Selection } from "d3-selection";

import { HierarchyNode, State, ConcreteDatum } from "./d3-org-chart.types";
import { isEdge } from "./is-edge";
import { nodeBackground } from "./default-colors";
import { OrgChart } from "./org-chart";

export const defaultNodeSelector = ".default-node-wrapper";

export class DefaultNodeRenderer<Datum extends ConcreteDatum> {
  constructor(private chart: OrgChart<Datum>) {}

  draw = (
    containers: Selection<
      SVGGElement,
      HierarchyNode<Datum>,
      SVGGElement,
      HierarchyNode<Datum>
    >
  ) => {
    const attrs = this.chart.getChartState();

    const containerSelection = containers.join(
      (enter) => enter.append("g").attr("class", "default-node-wrapper"),
      (update) => update,
      (exit) => exit.remove()
    );

    // Add foreignObject element inside rectangle
    containerSelection
      .patternify({
        tag: "foreignObject",
        className: "node-foreign-object",
        data: (d) => [d],
      })
      .style("overflow", "visible")
      .style("background", nodeBackground)
      .style("border-radius", "3px")
      .attr("width", ({ width }) => width)
      .attr("height", ({ height }) => height)
      .attr("x", 0)
      .attr("y", 0)

      .patternify({
        tag: "xhtml:div" as "div",
        className: "node-foreign-object-div",
        data: (d) => [d],
      })
      .style("width", "100%")
      .style("height", "100%")
      .html(function (d, i, arr) {
        return `<div style="padding:5px;font-size:10px;">Sample Node(id=${d.id}), override using <br/>
          <code>chart.nodeContent({data}=>{ <br/>
           &nbsp;&nbsp;&nbsp;&nbsp;return '' // Custom HTML <br/>
           })</code>
           <br/>
           Or check different <a href="https://github.com/bumbeishvili/org-chart#jump-to-examples" target="_blank">layout examples</a>
           </div>`;
      });

    containerSelection.call(this.drawNodeExpandCollapseButton, attrs);

    return containerSelection;
  };

  private drawNodeExpandCollapseButton = <TParent extends BaseType, TPDatum>(
    nodeContainer: Selection<
      SVGGElement,
      HierarchyNode<Datum>,
      TParent,
      TPDatum
    >,
    attrs: State<Datum>
  ) => {
    const nodeButtonHeight = 40;
    const nodeButtonWidth = 40;
    const nodeButtonX = -nodeButtonWidth / 2;
    const nodeButtonY = -nodeButtonHeight / 2;

    // Add Node button circle's group (expand-collapse button)
    const nodeButtonGroups = nodeContainer
      .patternify({
        tag: "g",
        className: "node-button-g",
        data: (d) => [d],
      })
      .style("cursor", "pointer")
      .on("click", (event: PointerEvent, d) => {
        this.chart.toggleExpandNode(d);

        if (attrs.setActiveNodeCentered) {
          attrs.centeredNode = d;
        }

        // Redraw Graph
        this.chart.update(d);
      });

    nodeButtonGroups
      .patternify({
        tag: "rect",
        className: "node-button-rect",
        data: (d) => [d],
      })
      .attr("opacity", 0)
      .attr("pointer-events", "all")
      .attr("width", (d) => nodeButtonWidth)
      .attr("height", (d) => nodeButtonHeight)
      .attr("x", (d) => nodeButtonX)
      .attr("y", (d) => nodeButtonY);

    // Add expand collapse button content
    const nodeFo = nodeButtonGroups
      .patternify({
        tag: "foreignObject",
        className: "node-button-foreign-object",
        data: (d) => [d],
      })
      .attr("width", (d) => nodeButtonWidth)
      .attr("height", (d) => nodeButtonHeight)
      .attr("x", (d) => nodeButtonX)
      .attr("y", (d) => nodeButtonY)
      .style("overflow", "visible")
      .patternify({
        tag: "xhtml:div" as "div",
        className: "node-button-div",
        data: (d) => [d],
      })
      .style("pointer-events", "none")
      .style("display", "flex")
      .style("width", "100%")
      .style("height", "100%");

    nodeContainer
      .select(".node-button-g")
      .attr("transform", ({ data, width, height }) => {
        const x = this.chart.getLayoutBinding().buttonX({
          width,
          height,
        });
        const y = this.chart.getLayoutBinding().buttonY({
          width,
          height,
        });
        return `translate(${x},${y})`;
      })
      .attr("display", ({ data }) => {
        return data._directSubordinates! > 0 ? null : "none";
      })
      .attr("opacity", ({ data, children, _children }) => {
        if (data._pagingButton) {
          return 0;
        }
        if (children || _children) {
          return 1;
        }
        return 0;
      });

    // Restyle node button circle
    nodeContainer
      .select(".node-button-foreign-object .node-button-div")
      .html((node) => {
        return attrs.buttonContent({ node, state: attrs });
      });

    // Restyle button texts
    nodeContainer
      .select(".node-button-text")
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("font-size", ({ children }) => {
        return children ? 40 : 26;
      })
      .text(({ children }) => {
        return children ? "-" : "+";
      })
      .attr("y", isEdge() ? 10 : 0);
  };
}
