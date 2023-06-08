import "./patternify";

import { select, Selection } from "d3-selection";
import { max, min, sum, cumsum } from "d3-array";
import { stratify } from "d3-hierarchy";
import { zoom, zoomIdentity, ZoomBehavior } from "d3-zoom";
import { flextree, FlextreeNode } from "d3-flextree";
import { linkHorizontal } from "d3-shape";

import {
  NodeId,
  StateGetSet,
  HierarchyNode,
  State,
  ConcreteDatum,
  Connection,
} from "./d3-org-chart.types";
import { isEdge } from "./is-edge";
import { toDataURL } from "./to-data-url";
import { downloadImage } from "./download-image";
import { defaultLayoutBindings } from "./default-layout-bindings";
import { defaultButtonContent } from "./default-button-content";
import { defaultNodeContent } from "./default-node-content";
import { connectionArrowhead, connectionLabel } from "./connection-defs";
import { pagingButton } from "./paging-button";
import { D3ZoomEvent } from "d3";

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
};

// This is separated from the implementation declaration to not have to replicate the propertied of StateGetSet
export interface OrgChart<Datum> extends StateGetSet<Datum, OrgChart<Datum>> {}

export class OrgChart<Datum extends ConcreteDatum>
  implements StateGetSet<Datum, OrgChart<Datum>>
{
  // #region NOT INTENDED FOR PUBLIC OVERRIDE
  /** Id for event handlings */
  private id = `ID${Math.floor(Math.random() * 1000000)}`;
  private ctx = document.createElement("canvas").getContext("2d")!;
  private expandLevel = 1;
  /** CSS color, for example "#2C3E50" */
  private nodeDefaultBackground = "none";
  /** Panning and zooming values */
  private lastTransform = {
    x: 0,
    y: 0,
    k: 1,
  };
  private zoomBehavior: ZoomBehavior<Element, Datum> | null = null;
  // #endregion

  /** Whether chart is drawn for the first time */
  private firstDraw = true;
  /** Configure how many nodes to show when making new nodes appear  */
  private pagingStep = (d: HierarchyNode<Datum>) => 5;

  private _attrs = {
    /*  INTENDED FOR PUBLIC OVERRIDE */
    svgWidth: 800, // Configure svg width
    svgHeight: window.innerHeight - 100, // Configure svg height
    container: "body", // Set parent container, either CSS style selector or DOM element
    data: null, // Set data, it must be an array of objects, where hierarchy is clearly defined via id and parent ID (property names are configurable)
    connections: [], // Sets connection data, array of objects, SAMPLE:  [{from:"145",to:"201",label:"Conflicts of interest"}]
    defaultFont: "Helvetica", // Set default font
    nodeId: (d: any) => d.nodeId || d.id, // Configure accessor for node id, default is either odeId or id
    parentNodeId: (d: any) => d.parentNodeId || d.parentId, // Configure accessor for parent node id, default is either parentNodeId or parentId
    rootMargin: 40, // Configure how much root node is offset from top
    nodeWidth: (d3Node) => 250, // Configure each node width, use with caution, it is better to have the same value set for all nodes
    nodeHeight: (d) => 150, //  Configure each node height, use with caution, it is better to have the same value set for all nodes
    neighbourMargin: (n1: any, n2: any) => 80, // Configure margin between two nodes, use with caution, it is better to have the same value set for all nodes
    siblingsMargin: (d3Node) => 20, // Configure margin between two siblings, use with caution, it is better to have the same value set for all nodes
    childrenMargin: (d) => 60, // Configure margin between parent and children, use with caution, it is better to have the same value set for all nodes
    compactMarginPair: (d) => 100, // Configure margin between two nodes in compact mode, use with caution, it is better to have the same value set for all nodes
    compactMarginBetween: (d3Node) => 20, // Configure margin between two nodes in compact mode, use with caution, it is better to have the same value set for all nodes
    nodeButtonWidth: (d: HierarchyNode<Datum>) => 40, // Configure expand & collapse button width
    nodeButtonHeight: (d: HierarchyNode<Datum>) => 40, // Configure expand & collapse button height
    nodeButtonX: (d: HierarchyNode<Datum>) => -20, // Configure expand & collapse button x position
    nodeButtonY: (d: HierarchyNode<Datum>) => -20, // Configure expand & collapse button y position
    linkYOffset: 30, // When correcting links which is not working for safari
    minPagingVisibleNodes: (d: HierarchyNode<Datum>) => 2000, // Configure minimum number of visible nodes , after which paging button appears
    scaleExtent: [0.001, 20], // Configure zoom scale extent , if you don't want any kind of zooming, set it to [1,1]
    duration: 400, // Configure duration of transitions
    imageName: "Chart", // Configure exported PNG and SVG image name
    setActiveNodeCentered: true, // Configure if active node should be centered when expanded and collapsed
    layout: "top", // Configure layout direction , possible values are "top", "left", "right", "bottom"
    compact: true, // Configure if compact mode is enabled , when enabled, nodes are shown in compact positions, instead of horizontal spread
    onZoomStart: (e, d) => {},
    onZoom: (e, d) => {},
    onZoomEnd: (e, d) => {},
    onNodeClick: (d) => d,
    nodeContent: defaultNodeContent,
    buttonContent: defaultButtonContent<Datum>,
    pagingButton: (
      d: HierarchyNode<Datum>,
      i: number,
      arr: any[],
      state: State<Datum>
    ) => {
      const step = this.pagingStep(d.parent!);
      const currentIndex = d.parent!.data._pagingStep;
      const diff = d.parent!.data._directSubordinatesPaging! - currentIndex!;
      const min = Math.min(diff, step);
      return pagingButton(min);
    },
    /* You can access and modify actual node DOM element in runtime using this method. */
    nodeUpdate: function (d, i, arr) {
      d3.select(this as any)
        .select(".node-rect")
        .attr("stroke", (d: any) =>
          d.data._highlighted || d.data._upToTheRootHighlighted
            ? "#E27396"
            : "none"
        )
        .attr(
          "stroke-width",
          d.data._highlighted || d.data._upToTheRootHighlighted ? 10 : 1
        );
    },
    /* You can access and modify actual link DOM element in runtime using this method. */
    linkUpdate: function (d, i, arr) {
      d3.select(this as any)
        .attr("stroke", (d: any) =>
          d.data._upToTheRootHighlighted ? "#E27396" : "#E4E2E9"
        )
        .attr("stroke-width", (d: any) =>
          d.data._upToTheRootHighlighted ? 5 : 1
        );

      if (d.data._upToTheRootHighlighted) {
        d3.select(this as any).raise();
      }
    },

    // Defining arrows with markers for connections
    defs: function (this: OrgChart<Datum>, state, visibleConnections) {
      return `
      <defs>
        ${visibleConnections
          .map((conn) => {
            return [
              connectionLabel(conn, this.ctx, state.defaultFont),
              connectionArrowhead(conn),
            ].join("");
          })
          .join("")}
      </defs>
      `;
    },
    /* You can update connections with custom styling using this function */
    connectionsUpdate: function (d, i, arr) {
      d3.select(this)
        .attr("stroke", (d) => "#E27396")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", (d) => "5")
        .attr("pointer-events", "none")
        .attr("marker-start", (d: any) => `url(#${d.from + "_" + d.to})`)
        .attr("marker-end", (d: any) => `url(#arrow-${d.from + "_" + d.to})`);
    },
    // Link generator for connections
    linkGroupArc: d3
      .linkHorizontal()
      .x((d: any) => d.x)
      .y((d: any) => d.y),

    layoutBindings: defaultLayoutBindings,
  } as Partial<State<Datum>> as State<Datum>;

  constructor() {
    // Dynamically set getter and setter functions for OrgChart class instance
    (Object.keys(this._attrs) as (keyof State<Datum>)[]).forEach((key) => {
      (this as any)[key] = function (_: any) {
        if (!arguments.length) {
          return this._attrs[key];
        } else {
          this._attrs[key] = _;
        }
        return this;
      };
    });
  }

  getChartState = () => this._attrs;

  // This method retrieves passed node's children IDs (including node)
  getNodeChildren(
    { data, children, _children }: HierarchyNode<Datum>,
    nodeStore: Datum[]
  ) {
    // Store current node ID
    nodeStore.push(data);

    // Loop over children and recursively store descendants id (expanded nodes)
    if (children) {
      children.forEach((d) => {
        this.getNodeChildren(d, nodeStore);
      });
    }

    // Loop over _children and recursively store descendants id (collapsed nodes)
    if (_children) {
      _children.forEach((d) => {
        this.getNodeChildren(d, nodeStore);
      });
    }

    // Return result
    return nodeStore;
  }

  // This method can be invoked via chart.setZoomFactor API, it zooms to particulat scale
  initialZoom(zoomLevel: number) {
    const attrs = this.getChartState();
    this.lastTransform.k = zoomLevel;
    return this;
  }

  render() {
    //InnerFunctions which will update visuals
    const attrs = this.getChartState();
    if (!attrs.data || attrs.data.length == 0) {
      console.log("ORG CHART - Data is empty");
      return this;
    }

    //Drawing containers
    // 'as Element' is a TS bug workaround
    const container = d3.select(attrs.container as HTMLElement);
    const containerRect = container.node()!.getBoundingClientRect();
    if (containerRect.width > 0) attrs.svgWidth = containerRect.width;

    //Calculated properties
    const calc = {
      id: `ID${Math.floor(Math.random() * 1000000)}`, // id for event handlings,
      chartWidth: attrs.svgWidth,
      chartHeight: attrs.svgHeight,
      // Calculate max node depth (it's needed for layout heights calculation)
      centerX: attrs.svgWidth / 2,
      centerY: attrs.svgHeight / 2,
    };
    attrs.calc = calc;

    // ******************* BEHAVIORS  **********************
    if (this.firstDraw) {
      this.zoomBehavior = d3
        .zoom<Element, Datum>()
        .on("start", (event, d) => attrs.onZoomStart(event, d))
        .on("end", (event, d) => attrs.onZoomEnd(event, d))
        .on("zoom", (event, d) => {
          attrs.onZoom(event, d);
          this.zoomed(event, d);
        })
        .scaleExtent(attrs.scaleExtent);
    }

    //****************** ROOT node work ************************

    attrs.flexTreeLayout = flextree<Datum>({
      nodeSize: (node: any) => {
        const width = attrs.nodeWidth(node);
        const height = attrs.nodeHeight(node);
        const siblingsMargin = attrs.siblingsMargin(node);
        const childrenMargin = attrs.childrenMargin(node);
        return this.getLayoutBinding().nodeFlexSize({
          state: attrs,
          node: node,
          width,
          height,
          siblingsMargin,
          childrenMargin,
        });
      },
    }).spacing((nodeA, nodeB) =>
      nodeA.parent == nodeB.parent ? 0 : attrs.neighbourMargin(nodeA, nodeB)
    );

    this.setLayouts({ expandNodesFirst: false });

    // *************************  DRAWING **************************
    //Add svg
    const svg = (
      container.patternify({
        tag: "svg",
        selector: "svg-chart-container",
      }) as unknown as Selection<SVGSVGElement, string, HTMLElement, any>
    )
      .attr("width", attrs.svgWidth)
      .attr("height", attrs.svgHeight)
      .attr("font-family", attrs.defaultFont);

    if (this.firstDraw) {
      svg
        .call(this.zoomBehavior! as any)
        .on("dblclick.zoom", null)
        .attr("cursor", "move");
    }

    attrs.svg = svg;

    //Add container g element
    const chart = svg.patternify<
      SVGGElement,
      string,
      SVGSVGElement,
      string,
      HTMLElement,
      undefined
    >({
      tag: "g",
      selector: "chart",
    });

    // Add one more container g element, for better positioning controls
    attrs.centerG = chart.patternify<
      SVGGElement,
      string,
      SVGGElement,
      string,
      SVGSVGElement,
      string
    >({
      tag: "g",
      selector: "center-group",
    });

    attrs.linksWrapper = attrs.centerG.patternify<
      SVGGElement,
      string,
      SVGGElement,
      string,
      SVGGElement,
      string
    >({
      tag: "g",
      selector: "links-wrapper",
    });

    attrs.nodesWrapper = attrs.centerG.patternify<
      SVGGElement,
      string,
      SVGGElement,
      string,
      SVGGElement,
      string
    >({
      tag: "g",
      selector: "nodes-wrapper",
    });

    attrs.connectionsWrapper = attrs.centerG.patternify<
      SVGGElement,
      string,
      SVGGElement,
      string,
      SVGGElement,
      string
    >({
      tag: "g",
      selector: "connections-wrapper",
    });

    attrs.defsWrapper = svg.patternify<
      SVGGElement,
      string,
      SVGSVGElement,
      string,
      HTMLElement,
      string
    >({
      tag: "g",
      selector: "defs-wrapper",
    });

    if (this.firstDraw) {
      attrs.centerG.attr("transform", () => {
        return this.getLayoutBinding().centerTransform({
          centerX: calc.centerX,
          centerY: calc.centerY,
          scale: this.lastTransform.k,
          rootMargin: attrs.rootMargin,
          root: attrs.root,
          chartHeight: calc.chartHeight,
          chartWidth: calc.chartWidth,
        });
      });
    }

    attrs.chart = chart;

    // Display tree contenrs
    this.update(attrs.root);

    //#########################################  UTIL FUNCS ##################################
    // This function restyles foreign object elements ()

    d3.select(window).on(`resize.${this.id}`, () => {
      const containerRect = d3
        .select(attrs.container as Element)
        .node()!
        .getBoundingClientRect();
      attrs.svg.attr("width", containerRect.width);
    });

    if (this.firstDraw) {
      this.firstDraw = false;
    }

    return this;
  }

  // This function can be invoked via chart.addNode API, and it adds node in tree at runtime
  addNode(obj: Datum) {
    const attrs = this.getChartState();
    const nodeFound = attrs.allNodes.filter(
      ({ data }) => attrs.nodeId(data) === attrs.nodeId(obj)
    )[0];
    const parentFound = attrs.allNodes.filter(
      ({ data }) => attrs.nodeId(data) === attrs.parentNodeId(obj)
    )[0];
    if (nodeFound) {
      console.log(
        `ORG CHART - ADD - Node with id "${attrs.nodeId(
          obj
        )}" already exists in tree`
      );
      return this;
    }
    if (!parentFound) {
      console.log(
        `ORG CHART - ADD - Parent node with id "${attrs.parentNodeId(
          obj
        )}" not found in the tree`
      );
      return this;
    }
    if (obj._centered && !obj._expanded) obj._expanded = true;
    attrs.data!.push(obj);

    // Update state of nodes and redraw graph
    this.updateNodesState();

    return this;
  }

  // This function can be invoked via chart.removeNode API, and it removes node from tree at runtime
  removeNode(nodeId: NodeId) {
    const attrs = this.getChartState();
    const node = attrs.allNodes.filter(
      ({ data }) => attrs.nodeId(data) == nodeId
    )[0];
    if (!node) {
      console.log(
        `ORG CHART - REMOVE - Node with id "${nodeId}" not found in the tree`
      );
      return this;
    }

    // Remove all node childs
    // Retrieve all children nodes ids (including current node itself)
    node.descendants().forEach((d) => (d.data._filteredOut = true));

    const descendants = this.getNodeChildren(node, []);
    descendants.forEach((d) => (d._filtered = true));

    // Filter out retrieved nodes and reassign data
    attrs.data = attrs.data!.filter((d) => !d._filtered);

    const updateNodesState = this.updateNodesState.bind(this);
    // Update state of nodes and redraw graph
    updateNodesState();

    return this;
  }

  groupBy(array: any, accessor: any, aggegator: any) {
    const grouped: Record<any, any> = {};
    array.forEach((item: any) => {
      const key = accessor(item);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key] = aggegator(grouped[key]);
    });
    return Object.entries(grouped);
  }

  calculateCompactFlexDimensions(root: HierarchyNode<Datum>) {
    const attrs = this.getChartState();
    root.eachBefore((node) => {
      node.firstCompact = null;
      node.compactEven = null;
      node.flexCompactDim = null;
      node.firstCompactNode = null;
    });
    root.eachBefore((node) => {
      if (node.children && node.children.length > 1) {
        const compactChildren = node.children.filter((d) => !d.children);

        if (compactChildren.length < 2) return;
        compactChildren.forEach((child, i) => {
          if (!i) child.firstCompact = true;
          if (i % 2) child.compactEven = false;
          else child.compactEven = true;
          child.row = Math.floor(i / 2);
        });
        const evenMaxColumnDimension = d3.max(
          compactChildren.filter((d) => d.compactEven),
          this.getLayoutBinding().compactDimension.sizeColumn
        )!;
        const oddMaxColumnDimension = d3.max(
          compactChildren.filter((d) => !d.compactEven),
          this.getLayoutBinding().compactDimension.sizeColumn
        )!;
        const columnSize =
          Math.max(evenMaxColumnDimension, oddMaxColumnDimension) * 2;
        const rowsMapNew = this.groupBy(
          compactChildren,
          (d: any) => d.row,
          (reducedGroup: any) =>
            d3.max(
              reducedGroup,
              (d: any) =>
                this.getLayoutBinding().compactDimension.sizeRow(d) +
                attrs.compactMarginBetween(d)
            )
        );
        const rowSize = d3.sum(rowsMapNew.map((v) => v[1]));
        compactChildren.forEach((node) => {
          node.firstCompactNode = compactChildren[0];
          if ((node as any).firstCompact) {
            (node as any).flexCompactDim = [
              columnSize + attrs.compactMarginPair(node),
              rowSize - attrs.compactMarginBetween(node),
            ];
          } else {
            (node as any).flexCompactDim = [0, 0];
          }
        });
        (node as any).flexCompactDim = null;
      }
    });
  }

  calculateCompactFlexPositions(root: HierarchyNode<Datum>) {
    const attrs = this.getChartState();
    root.eachBefore((node) => {
      if (node.children) {
        const compactChildren = node.children.filter(
          (d: any) => d.flexCompactDim
        );
        const fch = compactChildren[0];
        if (!fch) return;
        compactChildren.forEach((child, i, arr) => {
          if (i == 0) fch.x -= fch.flexCompactDim![0] / 2;
          if (i & ((i % 2) - 1))
            child.x =
              fch.x +
              fch.flexCompactDim![0] * 0.25 -
              attrs.compactMarginPair(child) / 4;
          else if (i)
            child.x =
              fch.x +
              fch.flexCompactDim![0] * 0.75 +
              attrs.compactMarginPair(child) / 4;
        });
        const centerX = fch.x + fch.flexCompactDim![0] * 0.5;
        fch.x =
          fch.x +
          fch.flexCompactDim![0] * 0.25 -
          attrs.compactMarginPair(fch) / 4;
        const offsetX = node.x - centerX;
        if (Math.abs(offsetX) < 10) {
          compactChildren.forEach((d) => (d.x += offsetX));
        }

        const rowsMapNew = this.groupBy(
          compactChildren,
          (d: any) => d.row,
          (reducedGroup: any) =>
            d3.max(reducedGroup, (d: any) =>
              this.getLayoutBinding().compactDimension.sizeRow(d)
            )
        );
        const cumSum = d3.cumsum(
          rowsMapNew.map((d: any) => d[1] + attrs.compactMarginBetween(d))
        );
        compactChildren.forEach((node, i) => {
          if (node.row) {
            node.y = fch.y + cumSum[node.row - 1];
          } else {
            node.y = fch.y;
          }
        });
      }
    });
  }

  // This function basically redraws visible graph, based on nodes state
  update({
    x0,
    y0,
    x = 0,
    y = 0,
    width,
    height,
  }: {
    x0: number;
    y0: number;
    width: number;
    height: number;
    x?: number;
    y?: number;
  }) {
    const attrs = this.getChartState();
    const calc = attrs.calc;

    // Paging
    if (attrs.compact) {
      this.calculateCompactFlexDimensions(attrs.root);
    }

    //  Assigns the x and y position for the nodes
    const treeData = attrs.flexTreeLayout(attrs.root);

    // Reassigns the x and y position for the based on the compact layout
    if (attrs.compact) {
      this.calculateCompactFlexPositions(attrs.root);
    }

    const nodes = treeData.descendants() as any as HierarchyNode<Datum>[];

    // console.table(nodes.map(d => ({ x: d.x, y: d.y, width: d.width, height: d.height, flexCompactDim: d.flexCompactDim + "" })))

    // Get all links
    const links = treeData.descendants().slice(1);
    nodes.forEach(this.getLayoutBinding().swap);

    // Connections
    const connections = attrs.connections;

    const allNodesMap = Object.fromEntries(
      attrs.allNodes.map((d) => [attrs.nodeId(d.data)!, d])
    );

    const visibleNodesMap = Object.fromEntries(
      nodes.map((d: any) => [attrs.nodeId(d.data)!, d])
    );

    connections.forEach((connection) => {
      const source = allNodesMap[connection.from];
      const target = allNodesMap[connection.to];
      connection._source = source;
      connection._target = target;
    });
    const visibleConnections = connections.filter(
      (d) => visibleNodesMap[d.from] && visibleNodesMap[d.to]
    );
    const defsString = attrs.defs.bind(this)(attrs, visibleConnections);
    const existingString = attrs.defsWrapper.html();
    if (defsString !== existingString) {
      attrs.defsWrapper.html(defsString);
    }

    // --------------------------  LINKS ----------------------
    // Get links selection
    const linkSelection = attrs.linksWrapper
      .selectAll<SVGPathElement, FlextreeNode<unknown>>("path.link")
      .data(links, (d: any) => attrs.nodeId(d.data)!);

    // Enter any new links at the parent's previous position.
    const linkEnter = linkSelection
      .enter()
      .insert("path", "g")
      .attr("class", "link")
      .attr("d", (d) => {
        const xo = this.getLayoutBinding().linkJoinX({
          x: x0,
          y: y0,
          width,
          height,
        } as any);
        const yo = this.getLayoutBinding().linkJoinY({
          x: x0,
          y: y0,
          width,
          height,
        } as any);
        const o = { x: xo, y: yo };
        return this.getLayoutBinding().diagonal(o, o, o);
      });

    // Get links update selection
    const linkUpdate = linkEnter.merge(linkSelection);

    // Styling links
    linkUpdate.attr("fill", "none");

    const displayFn = (d: FlextreeNode<Datum>) => {
      return d.data._pagingButton ? "none" : "auto";
    };

    if (isEdge()) {
      linkUpdate.style("display", displayFn);
    } else {
      linkUpdate.attr("display", displayFn);
    }

    // Allow external modifications
    linkUpdate.each(attrs.linkUpdate as any);

    // Transition back to the parent element position
    linkUpdate
      .transition()
      .duration(attrs.duration)
      .attr("d", (d: any) => {
        const n =
          attrs.compact && d.flexCompactDim
            ? {
                x: this.getLayoutBinding().compactLinkMidX(d, attrs),
                y: this.getLayoutBinding().compactLinkMidY(d, attrs),
              }
            : {
                x: this.getLayoutBinding().linkX(d),
                y: this.getLayoutBinding().linkY(d),
              };

        const p = {
          x: this.getLayoutBinding().linkParentX(d),
          y: this.getLayoutBinding().linkParentY(d),
        };

        const m =
          attrs.compact && d.flexCompactDim
            ? {
                x: this.getLayoutBinding().linkCompactXStart(d),
                y: this.getLayoutBinding().linkCompactYStart(d),
              }
            : n;
        return this.getLayoutBinding().diagonal(n, p, m, {
          sy: attrs.linkYOffset,
        });
      });

    // Remove any  links which is exiting after animation
    const linkExit = linkSelection
      .exit()
      .transition()
      .duration(attrs.duration)
      .attr("d", (d: any) => {
        const xo = this.getLayoutBinding().linkJoinX({
          x,
          y,
          width,
          height,
        } as any);
        const yo = this.getLayoutBinding().linkJoinY({
          x,
          y,
          width,
          height,
        } as any);
        const o = { x: xo, y: yo };
        return this.getLayoutBinding().diagonal(o, o, null, {
          sy: attrs.linkYOffset,
        });
      })
      .remove();

    // --------------------------  CONNECTIONS ----------------------

    const connectionsSel = attrs.connectionsWrapper
      .selectAll<SVGPathElement, Connection>("path.connection")
      .data(visibleConnections);

    // Enter any new connections at the parent's previous position.
    const connEnter = connectionsSel
      .enter()
      .insert("path", "g")
      .attr("class", "connection")
      .attr("d", (d) => {
        const xo = this.getLayoutBinding().linkJoinX({
          x: x0,
          y: y0,
          width,
          height,
        } as any);
        const yo = this.getLayoutBinding().linkJoinY({
          x: x0,
          y: y0,
          width,
          height,
        } as any);
        const o = { x: xo, y: yo };
        return this.getLayoutBinding().diagonal(o, o, null, {
          sy: attrs.linkYOffset,
        });
      });

    // Get connections update selection
    const connUpdate = connEnter.merge(connectionsSel);

    // Styling connections
    connUpdate.attr("fill", "none");

    // Transition back to the parent element position
    connUpdate
      .transition()
      .duration(attrs.duration)
      .attr("d", (d: any) => {
        const xs = this.getLayoutBinding().linkX({
          x: d._source.x,
          y: d._source.y,
          width: d._source.width,
          height: d._source.height,
        } as any);
        const ys = this.getLayoutBinding().linkY({
          x: d._source.x,
          y: d._source.y,
          width: d._source.width,
          height: d._source.height,
        } as any);
        const xt = this.getLayoutBinding().linkJoinX({
          x: d._target.x,
          y: d._target.y,
          width: d._target.width,
          height: d._target.height,
        } as any);
        const yt = this.getLayoutBinding().linkJoinY({
          x: d._target.x,
          y: d._target.y,
          width: d._target.width,
          height: d._target.height,
        } as any);
        return attrs.linkGroupArc({
          source: { x: xs, y: ys },
          target: { x: xt, y: yt },
        } as any);
      });

    // Allow external modifications
    connUpdate.each(attrs.connectionsUpdate);

    // Remove any  links which is exiting after animation
    const connExit = connectionsSel
      .exit()
      .transition()
      .duration(attrs.duration)
      .attr("opacity", 0)
      .remove();

    // --------------------------  NODES ----------------------
    // Get nodes selection
    const nodesSelection = attrs.nodesWrapper
      .selectAll<SVGGElement, HierarchyNode<Datum>>("g.node")
      .data(nodes, ({ data }) => attrs.nodeId(data)!);

    // Enter any new nodes at the parent's previous position.
    const nodeEnter = nodesSelection
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => {
        if (d == attrs.root) return `translate(${x0},${y0})`;
        const xj = this.getLayoutBinding().nodeJoinX({
          x: x0,
          y: y0,
          width,
          height,
        } as any);
        const yj = this.getLayoutBinding().nodeJoinY({
          x: x0,
          y: y0,
          width,
          height,
        } as any);
        return `translate(${xj},${yj})`;
      })
      .attr("cursor", "pointer")
      .on("click", (event: any, node: any) => {
        const { data } = node;
        if (
          [...event.srcElement.classList].includes("node-button-foreign-object")
        ) {
          return;
        }
        if ([...event.srcElement.classList].includes("paging-button-wrapper")) {
          this.loadPagingNodes(node);
          return;
        }
        if (!data._pagingButton) {
          attrs.onNodeClick(data);
          console.log("node clicked");
          return;
        }
        console.log("event fired, no handlers");
      });

    // Add background rectangle for the nodes
    nodeEnter.patternify({
      tag: "rect",
      selector: "node-rect",
      data: (d) => [d],
    });

    // Node update styles
    const nodeUpdate = nodeEnter
      .merge(nodesSelection)
      .style("font", "12px sans-serif");

    // Add foreignObject element inside rectangle
    const fo = nodeUpdate
      .patternify({
        tag: "foreignObject",
        selector: "node-foreign-object",
        data: (d) => [d],
      })
      .style("overflow", "visible");

    // Add foreign object
    fo.patternify({
      tag: "xhtml:div",
      selector: "node-foreign-object-div",
      data: (d) => [d],
    });

    this.restyleForeignObjectElements();

    // Add Node button circle's group (expand-collapse button)
    const nodeButtonGroups = nodeEnter
      .patternify({
        tag: "g",
        selector: "node-button-g",
        data: (d) => [d],
      })
      .on("click", (event: any, d: any) => this.onButtonClick(event, d));

    nodeButtonGroups
      .patternify({
        tag: "rect",
        selector: "node-button-rect",
        data: (d) => [d],
      })
      .attr("opacity", 0)
      .attr("pointer-events", "all")
      .attr("width", (d) => attrs.nodeButtonWidth(d))
      .attr("height", (d) => attrs.nodeButtonHeight(d))
      .attr("x", (d) => attrs.nodeButtonX(d))
      .attr("y", (d) => attrs.nodeButtonY(d));

    // Add expand collapse button content
    const nodeFo = nodeButtonGroups
      .patternify({
        tag: "foreignObject",
        selector: "node-button-foreign-object",
        data: (d) => [d],
      })
      .attr("width", (d) => attrs.nodeButtonWidth(d))
      .attr("height", (d) => attrs.nodeButtonHeight(d))
      .attr("x", (d) => attrs.nodeButtonX(d))
      .attr("y", (d) => attrs.nodeButtonY(d))
      .style("overflow", "visible")
      .patternify({
        tag: "xhtml:div",
        selector: "node-button-div",
        data: (d) => [d],
      })
      .style("pointer-events", "none")
      .style("display", "flex")
      .style("width", "100%")
      .style("height", "100%");

    // Transition to the proper position for the node
    nodeUpdate
      .transition()
      .attr("opacity", 0)
      .duration(attrs.duration)
      .attr("transform", ({ x, y, width, height }: any) => {
        return this.getLayoutBinding().nodeUpdateTransform({
          x,
          y,
          width,
          height,
        });
      })
      .attr("opacity", 1);

    // Style node rectangles
    nodeUpdate
      .select(".node-rect")
      .attr("width", ({ width }: any) => width)
      .attr("height", ({ height }: any) => height)
      .attr("x", ({ width }: any) => 0)
      .attr("y", ({ height }: any) => 0)
      .attr("cursor", "pointer")
      .attr("rx", 3)
      .attr("fill", this.nodeDefaultBackground);

    nodeUpdate
      .select(".node-button-g")
      .attr("transform", ({ data, width, height }: any) => {
        const x = this.getLayoutBinding().buttonX({
          width,
          height,
        } as any);
        const y = this.getLayoutBinding().buttonY({
          width,
          height,
        } as any);
        return `translate(${x},${y})`;
      })
      .attr("display", ({ data }: any) => {
        return data._directSubordinates > 0 ? null : "none";
      })
      .attr("opacity", ({ data, children, _children }: any) => {
        if (data._pagingButton) {
          return 0;
        }
        if (children || _children) {
          return 1;
        }
        return 0;
      });

    // Restyle node button circle
    nodeUpdate
      .select(".node-button-foreign-object .node-button-div")
      .html((node: any) => {
        return attrs.buttonContent({ node, state: attrs });
      });

    // Restyle button texts
    nodeUpdate
      .select(".node-button-text")
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("font-size", ({ children }: any) => {
        if (children) return 40;
        return 26;
      })
      .text(({ children }: any) => {
        if (children) return "-";
        return "+";
      })
      .attr("y", isEdge() ? 10 : 0);

    nodeUpdate.each(attrs.nodeUpdate as any);

    // Remove any exiting nodes after transition
    const nodeExitTransition = nodesSelection
      .exit()
      .attr("opacity", 1)
      .transition()
      .duration(attrs.duration)
      .attr("transform", (d: any) => {
        const ex = this.getLayoutBinding().nodeJoinX({
          x,
          y,
          width,
          height,
        } as any);
        const ey = this.getLayoutBinding().nodeJoinY({
          x,
          y,
          width,
          height,
        } as any);
        return `translate(${ex},${ey})`;
      })
      .on("end", function (this: any) {
        d3.select(this).remove();
      })
      .attr("opacity", 0);

    // Store the old positions for transition.
    nodes.forEach((d: any) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });

    // CHECK FOR CENTERING
    const centeredNode = attrs.allNodes.filter((d) => d.data._centered)[0];
    if (centeredNode) {
      let centeredNodes = [centeredNode];
      if (centeredNode.data._centeredWithDescendants) {
        if (attrs.compact) {
          centeredNodes = centeredNode.descendants().filter((d, i) => i < 7);
        } else {
          centeredNodes = centeredNode.descendants().filter((d, i, arr) => {
            const h = Math.round(arr.length / 2);
            const spread = 2;
            if (arr.length % 2) {
              return i > h - spread && i < h + spread - 1;
            }

            return i > h - spread && i < h + spread;
          });
        }
      }
      centeredNode.data._centeredWithDescendants = undefined;
      centeredNode.data._centered = undefined;
      this.fit({
        animate: true,
        scale: false,
        nodes: centeredNodes,
      });
    }
  }

  restyleForeignObjectElements() {
    const attrs = this.getChartState();

    attrs.svg
      .selectAll<SVGForeignObjectElement, HierarchyNode<Datum>>(
        ".node-foreign-object"
      )
      .attr("width", ({ width }: any) => width)
      .attr("height", ({ height }: any) => height)
      .attr("x", ({ width }: any) => 0)
      .attr("y", ({ height }: any) => 0);
    attrs.svg
      .selectAll<HTMLDivElement, HierarchyNode<Datum>>(
        ".node-foreign-object-div"
      )
      .style("width", ({ width }: any) => `${width}px`)
      .style("height", ({ height }: any) => `${height}px`)
      .html(function (d, i, arr: any) {
        if (d.data._pagingButton) {
          return `<div class="paging-button-wrapper"><div style="pointer-events:none">${attrs.pagingButton(
            d,
            i,
            arr,
            attrs
          )}</div></div>`;
        }
        return attrs.nodeContent.bind(this)(d as any, i, arr, attrs);
      });
  }

  // Toggle children on click.
  onButtonClick(event: MouseEvent, d: HierarchyNode<Datum>) {
    const attrs = this.getChartState();
    if (d.data._pagingButton) {
      return;
    }
    if (attrs.setActiveNodeCentered) {
      d.data._centered = true;
      d.data._centeredWithDescendants = true;
    }

    // If childrens are expanded
    if (d.children) {
      //Collapse them
      d._children = d.children;
      d.children = null as any;

      // Set descendants expanded property to false
      this.setExpansionFlagToChildren(d, false);
    } else {
      // Expand children
      d.children = d._children as any;
      d._children = null;

      // Set each children as expanded
      if (d.children) {
        d.children.forEach(({ data }) => (data._expanded = true));
      }
    }

    // Redraw Graph
    this.update(d as any);
  }

  // This function changes `expanded` property to descendants
  setExpansionFlagToChildren(
    { data, children, _children }: HierarchyNode<Datum>,
    flag: boolean
  ) {
    // Set flag to the current property
    data._expanded = flag;

    // Loop over and recursively update expanded children's descendants
    if (children) {
      children.forEach((d) => {
        this.setExpansionFlagToChildren(d, flag);
      });
    }

    // Loop over and recursively update collapsed children's descendants
    if (_children) {
      _children.forEach((d) => {
        this.setExpansionFlagToChildren(d, flag);
      });
    }
  }

  // Method which only expands nodes, which have property set "expanded=true"
  expandSomeNodes(d: HierarchyNode<Datum>) {
    // If node has expanded property set
    if (d.data._expanded) {
      // Retrieve node's parent
      let parent = d.parent;

      // While we can go up
      while (parent) {
        // Expand all current parent's children
        if (parent._children) {
          parent.children = parent._children;
        }

        // Replace current parent holding object
        parent = parent.parent;
      }
    }

    // Recursivelly do the same for collapsed nodes
    if (d._children) {
      d._children.forEach((ch) => this.expandSomeNodes(ch));
    }

    // Recursivelly do the same for expanded nodes
    if (d.children) {
      d.children.forEach((ch) => this.expandSomeNodes(ch));
    }
  }

  // This function updates nodes state and redraws graph, usually after data change
  updateNodesState() {
    const attrs = this.getChartState();

    this.setLayouts({ expandNodesFirst: true });

    // Redraw Graphs
    this.update(attrs.root as any);
  }

  setLayouts({ expandNodesFirst = true }) {
    const attrs = this.getChartState();
    // Store new root by converting flat data to hierarchy
    attrs.root = d3
      .stratify<Datum>()
      .id((d) => attrs.nodeId(d) as any)
      .parentId((d) => attrs.parentNodeId(d) as any)(attrs.data!) as any;

    const hiddenNodesMap: Record<any, any> = {};
    attrs.root
      .descendants()
      .filter((node: any) => node.children)
      .filter((node: any) => !node.data._pagingStep)
      .forEach((node: any) => {
        node.data._pagingStep = attrs.minPagingVisibleNodes(node);
      });

    attrs.root.eachBefore((node: any, i: any) => {
      node.data._directSubordinatesPaging = node.children
        ? node.children.length
        : 0;
      if (node.children) {
        node.children.forEach((child: any, j: any) => {
          child.data._pagingButton = false;
          if (j > node.data._pagingStep) {
            hiddenNodesMap[child.id] = true;
          }
          if (
            j === node.data._pagingStep &&
            node.children!.length - 1 > node.data._pagingStep
          ) {
            child.data._pagingButton = true;
          }
          if (hiddenNodesMap[child.parent.id]) {
            hiddenNodesMap[child.id] = true;
          }
        });
      }
    });

    attrs.root = d3
      .stratify<Datum>()
      .id((d) => attrs.nodeId(d) as any)
      .parentId((d) => attrs.parentNodeId(d) as any)(
      attrs.data!.filter((d) => hiddenNodesMap[(d as any).id] !== true)
    ) as any;

    attrs.root.each((node: any, i: any, arr: any) => {
      let width = attrs.nodeWidth(node);
      let height = attrs.nodeHeight(node);
      Object.assign(node, { width, height });
    });

    // Store positions, where children appear during their enter animation
    attrs.root.x0 = 0;
    attrs.root.y0 = 0;
    attrs.allNodes = attrs.root.descendants();

    // Store direct and total descendants count
    attrs.allNodes.forEach((d) => {
      Object.assign(d.data, {
        _directSubordinates: d.children ? d.children.length : 0,
        _totalSubordinates: d.descendants().length - 1,
      });
    });

    if (attrs.root.children) {
      if (expandNodesFirst) {
        // Expand all nodes first
        attrs.root.children.forEach(this.expand);
      }
      // Then collapse them all
      attrs.root.children.forEach((d: any) => this.collapse(d));

      // Collapse root if level is 0
      if (this.expandLevel == 0) {
        attrs.root._children = attrs.root.children;
        attrs.root.children = null as any;
      }

      // Then only expand nodes, which have expanded proprty set to true
      [attrs.root].forEach((ch) => this.expandSomeNodes(ch));
    }
  }

  // Function which collapses passed node and it's descendants
  collapse(d: HierarchyNode<Datum>) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach((ch) => this.collapse(ch));
      d.children = null as any;
    }
  }

  // Function which expands passed node and it's descendants
  expand(d: HierarchyNode<Datum>) {
    if (d._children) {
      d.children = d._children;
      d.children.forEach((ch) => this.expand(ch));
      d._children = null;
    }
  }

  /* Zoom handler function */
  zoomed(event: D3ZoomEvent<SVGSVGElement, void>, d: Datum) {
    const attrs = this.getChartState();
    const chart = attrs.chart;

    // Get d3 event's transform object
    const transform = event.transform;

    // Store it
    this.lastTransform = transform;

    // Reposition and rescale chart accordingly
    chart.attr("transform", transform.toString());

    // Apply new styles to the foreign object element
    if (isEdge()) {
      this.restyleForeignObjectElements();
    }
  }

  zoomTreeBounds({
    x0,
    x1,
    y0,
    y1,
    params = { animate: true, scale: true },
  }: {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    params?: { animate?: boolean; scale?: boolean };
  }) {
    const {
      centerG,
      svgWidth: w,
      svgHeight: h,
      svg,
      duration,
    } = this.getChartState();
    let scaleVal = Math.min(8, 0.9 / Math.max((x1 - x0) / w, (y1 - y0) / h));
    let identity = d3.zoomIdentity.translate(w / 2, h / 2);
    identity = identity.scale(params.scale ? scaleVal : this.lastTransform.k);

    identity = identity.translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    // Transition zoom wrapper component into specified bounds
    svg
      .transition()
      .duration(params.animate ? duration : 0)
      .call(this.zoomBehavior!.transform as any, identity);
    centerG
      .transition()
      .duration(params.animate ? duration : 0)
      .attr("transform", "translate(0,0)");
  }

  fit({
    animate = true,
    nodes,
    scale = true,
  }: {
    animate?: boolean;
    nodes?: Iterable<HierarchyNode<Datum>>;
    scale?: boolean;
  } = {}) {
    const attrs = this.getChartState();
    const { root } = attrs;
    let descendants = nodes || root.descendants();
    const minX = d3.min(
      descendants,
      (d) => d.x + this.getLayoutBinding().nodeLeftX(d)
    );
    const maxX = d3.max(
      descendants,
      (d) => d.x + this.getLayoutBinding().nodeRightX(d)
    );
    const minY = d3.min(
      descendants,
      (d) => d.y + this.getLayoutBinding().nodeTopY(d)
    );
    const maxY = d3.max(
      descendants,
      (d) => d.y + this.getLayoutBinding().nodeBottomY(d)
    );

    this.zoomTreeBounds({
      params: { animate, scale },
      x0: minX! - 50,
      x1: maxX! + 50,
      y0: minY! - 50,
      y1: maxY! + 50,
    });
    return this;
  }

  // Load Paging Nodes
  loadPagingNodes(node: HierarchyNode<Datum>) {
    const attrs = this.getChartState();
    node.data._pagingButton = false;
    const current = node.parent!.data._pagingStep!;
    const step = this.pagingStep(node.parent! as any);
    const newPagingIndex = current + step;
    node.parent!.data._pagingStep = newPagingIndex;
    console.log("loading paging nodes", node);
    this.updateNodesState();
  }

  // This function can be invoked via chart.setExpanded API, it expands or collapses particular node
  setExpanded(id: NodeId, expandedFlag = true) {
    const attrs = this.getChartState();
    // Retrieve node by node Id
    const node = attrs.allNodes.filter(
      ({ data }) => attrs.nodeId(data) == id
    )[0];

    if (!node) {
      console.log(
        `ORG CHART - ${
          expandedFlag ? "EXPAND" : "COLLAPSE"
        } - Node with id (${id})  not found in the tree`
      );
      return this;
    }
    node.data._expanded = expandedFlag;
    return this;
  }

  setCentered(nodeId: NodeId) {
    const attrs = this.getChartState();
    // this.setExpanded(nodeId)
    const node = attrs.allNodes.filter(
      (d) => attrs.nodeId(d.data) === nodeId
    )[0];
    if (!node) {
      console.log(
        `ORG CHART - CENTER - Node with id (${nodeId}) not found in the tree`
      );
      return this;
    }
    node.data._centered = true;
    node.data._expanded = true;
    return this;
  }

  setHighlighted(nodeId: NodeId) {
    const attrs = this.getChartState();
    const node = attrs.allNodes.filter(
      (d) => attrs.nodeId(d.data) === nodeId
    )[0];
    if (!node) {
      console.log(
        `ORG CHART - HIGHLIGHT - Node with id (${nodeId})  not found in the tree`
      );
      return this;
    }
    node.data._highlighted = true;
    node.data._expanded = true;
    node.data._centered = true;
    return this;
  }

  setUpToTheRootHighlighted(nodeId: NodeId) {
    const attrs = this.getChartState();
    const node = attrs.allNodes.filter(
      (d) => attrs.nodeId(d.data) === nodeId
    )[0];
    if (!node) {
      console.log(
        `ORG CHART - HIGHLIGHTROOT - Node with id (${nodeId}) not found in the tree`
      );
      return this;
    }
    node.data._upToTheRootHighlighted = true;
    node.data._expanded = true;
    node.ancestors().forEach((d) => (d.data._upToTheRootHighlighted = true));
    return this;
  }

  clearHighlighting() {
    const attrs = this.getChartState();
    attrs.allNodes.forEach((d) => {
      d.data._highlighted = false;
      d.data._upToTheRootHighlighted = false;
    });
    this.update(attrs.root as any);
  }

  // It can take selector which would go fullscreen
  fullscreen(elem?: Element) {
    const attrs = this.getChartState();
    const el = d3.select(elem || (attrs.container as any)).node();

    d3.select(document).on("fullscreenchange." + this.id, function (d) {
      const fsElement = document.fullscreenElement;
      if (fsElement == el) {
        setTimeout(() => {
          attrs.svg.attr("height", window.innerHeight - 40);
        }, 500);
      } else {
        attrs.svg.attr("height", attrs.svgHeight);
      }
    });

    el?.requestFullscreen();
  }

  // Zoom in exposed method
  zoomIn() {
    const { svg } = this.getChartState();
    svg.transition().call(this.zoomBehavior!.scaleBy as any, 1.3);
  }

  // Zoom out exposed method
  zoomOut() {
    const { svg } = this.getChartState();
    svg.transition().call(this.zoomBehavior!.scaleBy as any, 0.78);
  }

  exportImg({
    full = false,
    scale = 3,
    onLoad = (d) => d,
    save = true,
  }: {
    full?: boolean;
    scale?: number;
    onLoad?: (s: string) => void;
    save?: boolean;
  } = {}) {
    const that = this;
    const attrs = this.getChartState();
    const { svg: svgImg, root } = attrs;
    let count = 0;
    const selection = svgImg.selectAll("img");
    let total = selection.size();

    const exportImage = () => {
      const transform = JSON.parse(JSON.stringify(this.lastTransform));
      const duration = attrs.duration;
      if (full) {
        that.fit();
      }
      const { svg } = that.getChartState();

      setTimeout(
        () => {
          downloadImage({
            node: svg.node()!,
            scale,
            isSvg: false,
            onAlreadySerialized: () => {
              that.update(root as any);
            },
            imageName: attrs.imageName,
            onLoad: onLoad,
            save,
          });
        },
        full ? duration + 10 : 0
      );
    };

    if (total > 0) {
      selection.each(function () {
        toDataURL((this as any)!.src, (dataUrl) => {
          (this as any)!.src = dataUrl;
          if (++count == total) {
            exportImage();
          }
        });
      });
    } else {
      exportImage();
    }
  }

  exportSvg() {
    const { svg, imageName } = this.getChartState();
    downloadImage({
      imageName: imageName,
      node: svg.node()!,
      scale: 3,
      isSvg: true,
    });
    return this;
  }

  expandAll() {
    const { allNodes, root } = this.getChartState();
    allNodes.forEach((d) => (d.data._expanded = true));
    this.render();
    return this;
  }

  collapseAll() {
    const { allNodes, root } = this.getChartState();
    allNodes.forEach((d) => (d.data._expanded = false));
    this.expandLevel = 0;
    this.render();
    return this;
  }

  private getLayoutBinding() {
    const attrs = this.getChartState();

    return attrs.layoutBindings[attrs.layout];
  }
}
