import "./patternify";

import { select, Selection, create } from "d3-selection";
import { max, min, sum, cumsum } from "d3-array";
import { stratify } from "d3-hierarchy";
import { zoom, zoomIdentity, ZoomBehavior, D3ZoomEvent } from "d3-zoom";
import { flextree } from "d3-flextree";
import { DefaultLinkObject, Link, linkHorizontal } from "d3-shape";

import {
  NodeId,
  StateGetSet,
  HierarchyNode,
  State,
  ConcreteDatum,
  Connection,
  Elements,
  Point,
  LayoutBinding,
  NodeCompactLayoutMetadata,
  Rect,
} from "./d3-org-chart.types";
import { isEdge } from "./is-edge";
import { toDataURL } from "./to-data-url";
import { downloadImage } from "./download-image";
import { defaultLayoutBindings } from "./default-layout-bindings";
import { connectionArrowhead, connectionLabel } from "./connection-defs";
import { highlightColor, linkColor } from "./default-colors";
import {
  DefaultNodeRenderer,
  defaultNodeSelector,
} from "./default-node-renderer";
import { PagingNodeRenderer, pagingNodeSelector } from "./paging-node-renderer";
import {
  calculateCompactFlexDimensions,
  calculateCompactFlexPositions,
} from "./compact-layout";
import { LinkPointsCalculator } from "./link-points-calculations";

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

const childrenToFitInCompactMode = 7;

// This is separated from the implementation declaration to not have to replicate the propertied of StateGetSet
export interface OrgChart<Datum> extends StateGetSet<Datum, OrgChart<Datum>> {}

export class OrgChart<Datum extends ConcreteDatum>
  implements StateGetSet<Datum, OrgChart<Datum>>
{
  // #region NOT INTENDED FOR PUBLIC OVERRIDE
  /** Id for event handlings */
  private id = `ID${Math.floor(Math.random() * 1000000)}`;
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

  allNodes: ReadonlyArray<HierarchyNode<Datum>> | undefined;

  private _attrs = {
    /*  INTENDED FOR PUBLIC OVERRIDE */
    container: "body",
    data: null,
    connections: [],
    nodeId: (d) => (d as any).nodeId || (d as any).id,
    parentNodeId: (d) => (d as any).parentNodeId || (d as any).parentId,
    rootMargin: 40,
    nodeWidth: (d3Node) => 250,
    nodeHeight: (d) => 150,
    neighbourMargin: (n1, n2) => 80,
    siblingsMargin: (d3Node) => 20,
    childrenMargin: (d) => 60,
    compactMarginPair: (d) => 100,
    compactMarginBetween: () => 20,
    minPagingVisibleNodes: (d) => 2000,
    scaleExtent: [0.001, 20],
    duration: 400,
    imageName: "Chart",
    setActiveNodeCentered: true,
    layout: "top",
    compact: true,
    onZoomStart: (e, d) => {},
    onZoom: (e, d) => {},
    onZoomEnd: (e, d) => {},
    drawNode: (
      containers: Selection<
        SVGGElement,
        HierarchyNode<Datum>,
        SVGGElement,
        string
      >
    ) => {
      const attrs = this.getChartState();

      const pagingNodes = containers
        .selectAll<SVGForeignObjectElement, HierarchyNode<Datum>>(
          pagingNodeSelector
        )
        .data(
          (d) => (d.data._pagingButton ? [d] : []),
          function (d) {
            return attrs.nodeId(d.data);
          }
        );

      const defaultNodes = containers
        .selectAll<SVGGElement, HierarchyNode<Datum>>(defaultNodeSelector)
        .data(
          (d) => (!d.data._pagingButton ? [d] : []),
          function (d) {
            return attrs.nodeId(d.data);
          }
        );

      new PagingNodeRenderer(this).draw(pagingNodes);
      new DefaultNodeRenderer(this).draw(defaultNodes);

      containers
        .style("border-color", (d) =>
          d.data._highlighted || d.data._upToTheRootHighlighted
            ? highlightColor
            : "none"
        )
        .style("border-width", (d) =>
          d.data._highlighted || d.data._upToTheRootHighlighted ? 10 : 0
        )
        .style("border-style", "solid");
    },
    linkUpdate: function (d, i, arr) {
      d3.select<SVGPathElement, HierarchyNode<Datum>>(this)
        .attr("stroke", (d) =>
          d.data._upToTheRootHighlighted ? highlightColor : linkColor
        )
        .attr("stroke-width", (d) => (d.data._upToTheRootHighlighted ? 5 : 1));

      if (d.data._upToTheRootHighlighted) {
        d3.select(this).raise();
      }
    },
    defs: (state, visibleConnections) => {
      return `
      <defs>
        ${visibleConnections
          .map((conn) => {
            return [connectionLabel(conn), connectionArrowhead(conn)].join("");
          })
          .join("")}
      </defs>
      `;
    },
    connectionsUpdate: function (d, i, arr) {
      d3.select<SVGPathElement, Connection<Datum>>(this)
        .attr("stroke", (d) => highlightColor)
        .attr("stroke-linecap", "round")
        .attr("stroke-width", (d) => "5")
        .attr("pointer-events", "none")
        .attr("marker-start", (d) => `url(#${d.from + "_" + d.to})`)
        .attr("marker-end", (d) => `url(#arrow-${d.from + "_" + d.to})`);
    },
    linkGroupArc: (
      d3.linkHorizontal() as any as Link<any, DefaultLinkObject, Point>
    )
      .x((d) => d.x)
      .y((d) => d.y),

    layoutBindings: defaultLayoutBindings,

    nodeGetIsExpanded: (data) => !!data._expanded,
    nodeSetIsExpanded: (data, value) => (data._expanded = value),
    centeredNode: undefined,
    centerWithDescendants: true,
  } as State<Datum>;

  private elements!: Elements;
  root: HierarchyNode<Datum> | undefined;

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

  /**
   * Get all node descendants, including the node itself and non-visible (hidden) descendants
   * @param node
   */
  *getAllNodeDescendants(
    node: HierarchyNode<Datum>
  ): Generator<HierarchyNode<Datum>> {
    yield node;

    if (node.children) {
      for (const child of node.children) {
        yield* this.getAllNodeDescendants(child);
      }
    }

    if (node._children) {
      for (const child of node._children) {
        yield* this.getAllNodeDescendants(child);
      }
    }
  }

  /** This method can be invoked via chart.setZoomFactor API, it zooms to particular scale */
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
    // 'as string' is a TS bug workaround
    const container = d3.select<HTMLElement, unknown>(
      attrs.container as string
    );

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
    this.setLayouts();

    // *************************  DRAWING **************************
    container.call(this.drawContainers, {
      rootMargin: attrs.rootMargin,
    });

    // Display tree contents
    this.update(this.root!);

    //#########################################  UTIL FUNCS ##################################
    // This function restyles foreign object elements ()

    d3.select(window).on(`resize.${this.id}`, () => {
      const containerRect = d3
        .select(attrs.container as Element)
        .node()!
        .getBoundingClientRect();
      this.elements.svg.attr("width", containerRect.width);
    });

    if (this.firstDraw) {
      this.firstDraw = false;
    }

    return this;
  }

  // This function can be invoked via chart.addNode API, and it adds node in tree at runtime
  addNode(obj: Datum) {
    const attrs = this.getChartState();
    const nodeFound = this.allNodes!.filter(
      ({ data }) => attrs.nodeId(data) === attrs.nodeId(obj)
    )[0];
    const parentFound = this.allNodes!.filter(
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

    attrs.data!.push(obj);

    // Update state of nodes and redraw graph
    this.updateNodesState();

    return this;
  }

  // This function can be invoked via chart.removeNode API, and it removes node from tree at runtime
  removeNode(nodeId: NodeId) {
    const attrs = this.getChartState();
    const node = this.allNodes!.filter(
      ({ data }) => attrs.nodeId(data) == nodeId
    )[0];
    if (!node) {
      console.log(
        `ORG CHART - REMOVE - Node with id "${nodeId}" not found in the tree`
      );
      return this;
    }

    const descendants = Array.from(this.getAllNodeDescendants(node)).map(
      (desc) => desc.data
    );

    // Filter out retrieved nodes and reassign data
    attrs.data = attrs.data!.filter((d) => !descendants.includes(d));

    const updateNodesState = this.updateNodesState.bind(this);
    // Update state of nodes and redraw graph
    updateNodesState();

    return this;
  }

  // This function basically redraws visible graph, based on nodes state
  update(animationSource: Rect) {
    if (animationSource.x === undefined) {
      animationSource.x = 0;
    }
    if (animationSource.y === undefined) {
      animationSource.y = 0;
    }

    const attrs = this.getChartState();

    let nodeCompactLayoutMetadata: NodeCompactLayoutMetadata<Datum>;

    if (attrs.compact) {
      nodeCompactLayoutMetadata = calculateCompactFlexDimensions(
        this.root!,
        this.getChartState(),
        this.getLayoutBinding().compactDimension
      );
    }

    const flexTreeLayout = flextree<Datum>({
      nodeSize: (n) => {
        const node = n as HierarchyNode<Datum>;

        return (
          nodeCompactLayoutMetadata.flexCompactDim.get(node) ||
          this.getLayoutBinding().rectSizeWithMargins({
            width: attrs.nodeWidth(node),
            height: attrs.nodeHeight(node),
            siblingsMargin: attrs.siblingsMargin(node),
            childrenMargin: attrs.childrenMargin(node),
          })
        );
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
    const treeData = flexTreeLayout!(this.root!);

    // Reassigns the x and y position for the based on the compact layout
    if (attrs.compact) {
      calculateCompactFlexPositions(
        this.root!,
        attrs,
        this.getLayoutBinding().compactDimension,
        nodeCompactLayoutMetadata!.row,
        nodeCompactLayoutMetadata!.flexCompactDim
      );
    }

    const nodes = treeData.descendants() as any as HierarchyNode<Datum>[];

    // Get all links
    const links = (treeData.descendants() as any as HierarchyNode<Datum>[])
      .slice(1)
      .filter((l) => !l.data._pagingButton);
    nodes.forEach(this.getLayoutBinding().swap);

    // Connections
    const connections = attrs.connections;

    const allNodesMap = new Map(
      this.allNodes!.map((d) => [attrs.nodeId(d.data), d])
    );
    const visibleNodesMap = new Map(
      nodes.map((d) => [attrs.nodeId(d.data), d])
    );

    connections.forEach((connection) => {
      const source = allNodesMap.get(connection.from)!;
      const target = allNodesMap.get(connection.to)!;
      connection._source = source;
      connection._target = target;
    });
    const visibleConnections = connections.filter(
      (d) => visibleNodesMap.get(d.from) && visibleNodesMap.get(d.to)
    );

    this.elements.defsWrapper.html(
      attrs.defs.bind(this)(attrs, visibleConnections)
    );

    const compactNodeRects = new Map<HierarchyNode<Datum>, Rect>();

    for (let d of links) {
      if (nodeCompactLayoutMetadata!.flexCompactDim.has(d)) {
        compactNodeRects.set(d, {
          x: d.x,
          y: d.y,
          width: nodeCompactLayoutMetadata!.flexCompactDim.get(d)![0],
          height: nodeCompactLayoutMetadata!.flexCompactDim.get(d)![1],
        });
      }
    }

    const linkPointsCalc = new LinkPointsCalculator(this.getLayoutBinding());
    this.elements.linksWrapper.call(
      this.drawLinks,
      links,
      animationSource,
      (d) => {
        const firstCompactNode =
          nodeCompactLayoutMetadata.firstCompactNode.get(d);

        if (firstCompactNode) {
          return linkPointsCalc.getCompactSourcePoint(
            compactNodeRects.get(firstCompactNode!)!,
            attrs.compactMarginPair(d)
          );
        } else {
          return linkPointsCalc.getNormalSourcePoint(d);
        }
      },
      (d) => linkPointsCalc.getTargetPoint(d.parent!),
      (d) => {
        const isNodeCompact = nodeCompactLayoutMetadata.flexCompactDim.has(d);

        if (!isNodeCompact) {
          return undefined;
        } else {
          return linkPointsCalc.getCompactMiddlePoint(
            d,
            !!nodeCompactLayoutMetadata.compactEven.get(d)
          );
        }
      }
    );
    this.elements.connectionsWrapper.call(
      this.drawConnections,
      visibleConnections,
      animationSource
    );

    const nodeWrapperGElements = this.drawNodeWrappers(
      this.elements.nodesWrapper,
      nodes,
      animationSource,
      {
        layoutBinding: this.getLayoutBinding(),
        duration: attrs.duration,
        nodeId: attrs.nodeId,
      }
    );

    nodeWrapperGElements.call(this.drawNodes);

    this.translateChartGroupIfNeeded();
  }

  toggleExpandNode(node: HierarchyNode<Datum>) {
    this._attrs.nodeSetIsExpanded(
      node.data,
      !this._attrs.nodeGetIsExpanded(node.data)
    );
    this.updateChildrenProperty(node);
  }

  /**
   * Ensure that all the node's ancestors are expanded so that the node becomes visible
   * @param node to make visible
   */
  ensureAncestorsAreExpanded(node: HierarchyNode<Datum>) {
    this._attrs.nodeSetIsExpanded(node.data, true);
    this.updateChildrenProperty(node);

    if (node.parent) {
      this.ensureAncestorsAreExpanded(node.parent);
    }
  }

  // This function updates nodes state and redraws graph, usually after data change
  updateNodesState() {
    const attrs = this.getChartState();

    this.setLayouts();

    // Redraw Graphs
    this.update(this.root!);
  }

  setLayouts() {
    const attrs = this.getChartState();
    // Store new root by converting flat data to hierarchy
    this.root = d3
      .stratify<Datum>()
      .id((d) => attrs.nodeId(d) as any)
      .parentId((d) => attrs.parentNodeId(d) as any)(attrs.data!) as any;

    const hiddenNodesMap: Record<any, any> = {};
    this.root!.descendants()
      .filter((node) => node.children)
      .filter((node) => !node.data._pagingStep)
      .forEach((node) => {
        node.data._pagingStep = attrs.minPagingVisibleNodes(node);
      });

    this.root!.eachBefore((node, i) => {
      node.data._directSubordinatesPaging = node.children
        ? node.children.length
        : 0;
      if (node.children) {
        node.children.forEach((child, j) => {
          child.data._pagingButton = false;
          if (j > node.data._pagingStep!) {
            hiddenNodesMap[child.id!] = true;
          }
          if (
            j === node.data._pagingStep &&
            node.children!.length - 1 > node.data._pagingStep
          ) {
            child.data._pagingButton = true;
          }
          if (hiddenNodesMap[child.parent!.id!]) {
            hiddenNodesMap[child.id!] = true;
          }
        });
      }
    });

    this.root! = d3
      .stratify<Datum>()
      .id((d) => attrs.nodeId(d) as any)
      .parentId((d) => attrs.parentNodeId(d) as any)(
      attrs.data!.filter((d) => hiddenNodesMap[(d as any).id] !== true)
    ) as any;

    this.root!.each((node, i, arr) => {
      let width = attrs.nodeWidth(node);
      let height = attrs.nodeHeight(node);
      Object.assign(node, { width, height });
    });

    this.allNodes = this.root!.descendants();

    // Store direct and total descendants count
    this.allNodes.forEach((d) => {
      Object.assign(d.data, {
        _directSubordinates: d.children ? d.children.length : 0,
        _totalSubordinates: d.descendants().length - 1,
      });
    });

    for (const node of this.root!.descendants()) {
      this.updateChildrenProperty(node);
    }
  }

  collapse(d: HierarchyNode<Datum>) {
    this._attrs.nodeSetIsExpanded(d.data, false);
    this.updateChildrenProperty(d);
  }

  expand(d: HierarchyNode<Datum>) {
    this._attrs.nodeSetIsExpanded(d.data, true);
    this.updateChildrenProperty(d);
  }

  /* Zoom handler function */
  zoomed(event: D3ZoomEvent<SVGSVGElement, void>, d: Datum) {
    const chart = this.elements.chart;

    // Get d3 event's transform object
    const transform = event.transform;

    // Store it
    this.lastTransform = transform;

    // Reposition and rescale chart accordingly
    chart.attr("transform", transform.toString());
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
    const { duration } = this.getChartState();
    const w = this.elements.svg.node()!.clientWidth;
    const h = this.elements.svg.node()!.clientWidth;
    let scaleVal = Math.min(8, 0.9 / Math.max((x1 - x0) / w, (y1 - y0) / h));
    let identity = d3.zoomIdentity.translate(w / 2, h / 2);
    identity = identity.scale(params.scale ? scaleVal : this.lastTransform.k);

    identity = identity.translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    // Transition zoom wrapper component into specified bounds
    this.elements.svg
      .transition()
      .duration(params.animate ? duration : 0)
      .call(this.zoomBehavior!.transform as any, identity);
    this.elements.centerG
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
    let descendants = nodes || this.root!.descendants();
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

  // This function can be invoked via chart.setExpanded API, it expands or collapses particular node
  setExpanded(id: NodeId, expandedFlag = true) {
    const attrs = this.getChartState();
    // Retrieve node by node Id
    const node = this.allNodes!.filter(
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
    attrs.nodeSetIsExpanded(node.data, expandedFlag);
    return this;
  }

  setCentered(nodeId: NodeId) {
    const attrs = this.getChartState();
    // this.setExpanded(nodeId)
    const node = this.allNodes!.filter(
      (d) => attrs.nodeId(d.data) === nodeId
    )[0];
    if (!node) {
      console.log(
        `ORG CHART - CENTER - Node with id (${nodeId}) not found in the tree`
      );
      return this;
    }
    attrs.centeredNode = node;
    attrs.nodeSetIsExpanded(node.data, true);
    return this;
  }

  setHighlighted(nodeId: NodeId) {
    const attrs = this.getChartState();
    const node = this.allNodes!.filter(
      (d) => attrs.nodeId(d.data) === nodeId
    )[0];
    if (!node) {
      console.log(
        `ORG CHART - HIGHLIGHT - Node with id (${nodeId})  not found in the tree`
      );
      return this;
    }
    node.data._highlighted = true;
    attrs.nodeSetIsExpanded(node.data, true);
    this._attrs.centeredNode = node;
    return this;
  }

  setUpToTheRootHighlighted(nodeId: NodeId) {
    const attrs = this.getChartState();
    const node = this.allNodes!.filter(
      (d) => attrs.nodeId(d.data) === nodeId
    )[0];
    if (!node) {
      console.log(
        `ORG CHART - HIGHLIGHTROOT - Node with id (${nodeId}) not found in the tree`
      );
      return this;
    }
    node.data._upToTheRootHighlighted = true;
    attrs.nodeSetIsExpanded(node.data, true);
    node.ancestors().forEach((d) => (d.data._upToTheRootHighlighted = true));
    return this;
  }

  clearHighlighting() {
    const attrs = this.getChartState();
    this.allNodes!.forEach((d) => {
      d.data._highlighted = false;
      d.data._upToTheRootHighlighted = false;
    });
    this.update(this.root!);
  }

  // Zoom in exposed method
  zoomIn() {
    this.elements.svg.transition().call(this.zoomBehavior!.scaleBy as any, 1.3);
  }

  // Zoom out exposed method
  zoomOut() {
    this.elements.svg
      .transition()
      .call(this.zoomBehavior!.scaleBy as any, 0.78);
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
    let count = 0;
    const selection = this.elements.svg.selectAll("img");
    let total = selection.size();

    const exportImage = () => {
      const transform = JSON.parse(JSON.stringify(this.lastTransform));
      const duration = attrs.duration;
      if (full) {
        that.fit();
      }
      const { svg } = that.elements;

      setTimeout(
        () => {
          downloadImage({
            node: svg.node()!,
            scale,
            isSvg: false,
            onAlreadySerialized: () => {
              that.update(this.root!);
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
    const { imageName } = this.getChartState();
    downloadImage({
      imageName,
      node: this.elements.svg.node()!,
      scale: 3,
      isSvg: true,
    });
    return this;
  }

  expandAll() {
    this.allNodes!.forEach((d) => {
      this._attrs.nodeSetIsExpanded(d.data, true);
    });
    this.render();
    return this;
  }

  collapseAll() {
    this.allNodes!.forEach((d) => {
      this._attrs.nodeSetIsExpanded(d.data, false);
    });
    this.render();
    return this;
  }

  updateChildrenProperty(node: HierarchyNode<Datum>) {
    if (this._attrs.nodeGetIsExpanded(node.data)) {
      // Expand children
      node.children = node.children || node._children;
      node._children = undefined;
    } else {
      // Collapse them
      node._children = node._children || node.children;
      node.children = undefined;
    }
  }

  getLayoutBinding() {
    const attrs = this.getChartState();

    return attrs.layoutBindings[attrs.layout];
  }

  private drawContainers = (
    container: Selection<HTMLElement, unknown, any, any>,
    {
      rootMargin,
    }: {
      rootMargin: number;
    }
  ) => {
    //Add svg
    const svg = container
      .patternify({
        tag: "svg",
        className: "svg-chart-container",
      })
      .style("width", "100%")
      .style("height", "100%");

    if (this.firstDraw) {
      svg
        .call(this.zoomBehavior! as any)
        .on("dblclick.zoom", null)
        .attr("cursor", "move");
    }

    //Add container g element
    const chart = svg.patternify({
      tag: "g",
      className: "chart",
    });

    // Add one more container g element, for better positioning controls
    const centerG = chart.patternify({
      tag: "g",
      className: "center-group",
    });

    const linksWrapper = centerG.patternify({
      tag: "g",
      className: "links-wrapper",
    });

    const nodesWrapper = centerG.patternify({
      tag: "g",
      className: "nodes-wrapper",
    });

    const connectionsWrapper = centerG.patternify({
      tag: "g",
      className: "connections-wrapper",
    });

    const defsWrapper = svg.patternify({
      tag: "g",
      className: "defs-wrapper",
    });

    if (this.firstDraw) {
      centerG.attr("transform", () => {
        const svgWidth = svg.node()!.clientWidth!;
        const svgHeight = svg.node()!.clientHeight!;

        return this.getLayoutBinding().centerTransform({
          centerX: svgWidth / 2,
          centerY: svgHeight / 2,
          scale: this.lastTransform.k,
          rootMargin: rootMargin,
          chartHeight: svgHeight,
          chartWidth: svgWidth,
        });
      });
    }

    this.elements = {
      svg,
      centerG,
      linksWrapper,
      nodesWrapper,
      connectionsWrapper,
      defsWrapper,
      chart,
    };
  };

  private drawNodes = (
    nodeWrapperGElements: Selection<
      SVGGElement,
      HierarchyNode<Datum>,
      SVGGElement,
      string
    >
  ) => {
    const attrs = this.getChartState();

    nodeWrapperGElements.call(function (selection) {
      attrs.drawNode(selection);
    });

    // Transition to the proper position for the node
    nodeWrapperGElements
      .transition()
      .attr("opacity", 0)
      .duration(attrs.duration)
      .attr("transform", ({ x, y, width, height }) => {
        return this.getLayoutBinding().nodeUpdateTransform({
          x,
          y,
          width,
          height,
        });
      })
      .attr("opacity", 1);

    return nodeWrapperGElements;
  };

  private drawConnections = (
    connectionsWrapper: Selection<SVGGElement, string, SVGGElement, string>,
    visibleConnections: Connection<Datum>[],
    animationSource: Rect
  ) => {
    const attrs = this.getChartState();

    const connectionsSel = connectionsWrapper
      .selectAll<SVGPathElement, Connection<Datum>>("path.connection")
      .data(visibleConnections);

    // Enter any new connections at the parent's previous position.
    const connEnter = connectionsSel
      .enter()
      .insert("path", "g")
      .attr("class", "connection")
      .attr("d", (d) => {
        const xo = this.getLayoutBinding().linkJoinX(animationSource);
        const yo = this.getLayoutBinding().linkJoinY(animationSource);
        const o = { x: xo, y: yo };
        return this.getLayoutBinding().diagonal(o, o);
      });

    // Get connections update selection
    const connUpdate = connEnter.merge(connectionsSel);

    // Styling connections
    connUpdate.attr("fill", "none");

    // Transition back to the parent element position
    connUpdate
      .transition()
      .duration(attrs.duration)
      .attr("d", (d) => {
        const xs = this.getLayoutBinding().linkX(d._source);
        const ys = this.getLayoutBinding().linkY(d._source);
        const xt = this.getLayoutBinding().linkJoinX(d._target);
        const yt = this.getLayoutBinding().linkJoinY(d._target);
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
  };

  private drawLinks = (
    linksWrapper: Selection<SVGGElement, string, SVGGElement, string>,
    links: HierarchyNode<Datum>[],
    animationSource: Rect,
    getSourcePointFn: (d: HierarchyNode<Datum>) => Point,
    getTargetPointFn: (d: HierarchyNode<Datum>) => Point,
    getMiddlePointFn: (d: HierarchyNode<Datum>) => Point | undefined
  ) => {
    const attrs = this.getChartState();
    // Get links selection
    const linkSelection = linksWrapper
      .selectAll<SVGPathElement, HierarchyNode<Datum>>("path.link")
      .data(links, (d) => attrs.nodeId(d.data)!);

    // Enter any new links at the parent's previous position.
    const linkEnter = linkSelection
      .enter()
      .insert("path", "g")
      .attr("class", "link")
      .attr("d", (d) => {
        const xo = this.getLayoutBinding().linkJoinX(animationSource);
        const yo = this.getLayoutBinding().linkJoinY(animationSource);
        const o = { x: xo, y: yo };
        return this.getLayoutBinding().diagonal(o, o, o);
      });

    // Get links update selection
    const linkUpdate = linkEnter.merge(linkSelection);

    // Styling links
    linkUpdate.attr("fill", "none");

    const displayFn = (d: HierarchyNode<Datum>) => {
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
      .attr("d", (d) => {
        return this.getLayoutBinding().diagonal(
          getSourcePointFn(d),
          getTargetPointFn(d),
          getMiddlePointFn(d)
        );
      });

    // Remove any  links which is exiting after animation
    const linkExit = linkSelection
      .exit()
      .transition()
      .duration(attrs.duration)
      .attr("d", (d) => {
        const xo = this.getLayoutBinding().linkJoinX(animationSource);
        const yo = this.getLayoutBinding().linkJoinY(animationSource);
        const o = { x: xo, y: yo };
        return this.getLayoutBinding().diagonal(o, o);
      })
      .remove();
  };

  private translateChartGroupIfNeeded() {
    const attrs = this.getChartState();

    // CHECK FOR CENTERING
    const centeredNode = this._attrs.centeredNode;

    if (centeredNode) {
      this._attrs.centeredNode = undefined;

      this.fit({
        animate: true,
        scale: false,
        nodes: getNodesToFit(
          centeredNode,
          attrs.compact,
          attrs.centerWithDescendants
        ),
      });
    }
  }

  private drawNodeWrappers(
    nodesWrapper: Selection<SVGGElement, string, SVGGElement, string>,
    nodes: HierarchyNode<Datum>[],
    animationSource: Rect,
    attrs: {
      layoutBinding: LayoutBinding<Datum>;
      duration: number;
      nodeId: (node: Datum) => NodeId;
    }
  ) {
    return nodesWrapper
      .selectAll<SVGGElement, HierarchyNode<Datum>>("g.node")
      .data(nodes, ({ data }) => attrs.nodeId(data))
      .join(
        (enter) => {
          // Enter any new nodes at the parent's previous position.
          return enter
            .append("g")
            .attr("class", "node")
            .attr("transform", (d) => {
              if (d == this.root) {
                return `translate(${animationSource.x},${animationSource.y})`;
              }

              const xj = this.getLayoutBinding().nodeJoinX(animationSource);
              const yj = this.getLayoutBinding().nodeJoinY(animationSource);
              return `translate(${xj},${yj})`;
            });
        },
        (update) => update,
        (exit) => {
          // Remove any exiting nodes after transition
          return exit
            .attr("opacity", 1)
            .transition()
            .duration(attrs.duration)
            .attr("transform", (d) => {
              const ex = this.getLayoutBinding().nodeJoinX(animationSource);
              const ey = this.getLayoutBinding().nodeJoinY(animationSource);
              return `translate(${ex},${ey})`;
            })
            .on("end", function (this) {
              d3.select(this).remove();
            })
            .attr("opacity", 0);
        }
      )
      .attr("cursor", "default")
      .style("font", "12px sans-serif");
  }
}

function getNodesToFit(
  centeredNode: HierarchyNode<any>,
  compact: boolean,
  centerWithDescendants: boolean
) {
  let centeredNodes = [centeredNode];
  if (centerWithDescendants) {
    if (compact) {
      centeredNodes = centeredNode
        .descendants()
        .filter((d, i) => i < childrenToFitInCompactMode);
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
  return centeredNodes;
}
