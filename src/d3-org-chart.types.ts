import { Selection, ValueFn } from "d3-selection";
import { D3ZoomEvent } from "d3-zoom";
import { Link, DefaultLinkObject } from "d3-shape";
import { HierarchyNode as D3HierarchyNode } from "d3-hierarchy";

export type NodeId = string | number;

export interface Connection<Datum> {
  from: NodeId;
  to: NodeId;
  label: string;
  _source: HierarchyNode<Datum>;
  _target: HierarchyNode<Datum>;
}

export interface Point {
  x: number;
  y: number;
}

export interface HierarchyNode<Datum> extends D3HierarchyNode<Datum> {
  firstCompactNode: HierarchyNode<Datum> | undefined;
  _children: this[] | undefined;
  width: number;
  x: number;
  y: number;
  x0: number;
  y0: number;
  compactEven: boolean | null;
  flexCompactDim: number[] | null;
  firstCompact: boolean | null;
  row: number;
}

export interface Elements {
  svg: Selection<SVGSVGElement, string, HTMLElement, undefined>;
  centerG: Selection<SVGGElement, string, SVGGElement, string>;
  linksWrapper: Selection<SVGGElement, string, SVGGElement, string>;
  nodesWrapper: Selection<SVGGElement, string, SVGGElement, string>;
  connectionsWrapper: Selection<SVGGElement, string, SVGGElement, string>;
  defsWrapper: Selection<SVGGElement, string, SVGSVGElement, string>;
  chart: Selection<any, any, any, any>;
}

/**
 * The configuration attributes of an organization charts.
 * All of these properties are available as get / set pairs
 * of the organization chart object, per D3 standard.
 */
export interface State<Datum> {
  /** Configure svg width  */
  svgWidth: number;
  /** Configure svg height  */
  svgHeight: number;
  /** Configure zoom scale extent , if you don't want any kind of zooming, set it to [1,1] */
  scaleExtent: [number, number];
  /** Set parent container, either CSS style selector or DOM element */
  container: string | HTMLElement;
  /** Font name, for example "Helvetica" */
  defaultFont: string;
  /** Set data, it must be an array of objects, where hierarchy is clearly defined via id and parent ID (property names are configurable) */
  data: Datum[] | null;
  /** Configure duration of transitions */
  duration: number;
  /** Configure if active node should be centered when expanded and collapsed */
  setActiveNodeCentered: boolean;
  /** Configure if compact mode is enabled , when enabled, nodes are shown in compact positions, instead of horizontal spread */
  compact: boolean;
  /** Configure how much root node is offset from top  */
  rootMargin: number;
  /** Sets connection data, array of objects, SAMPLE:  [{from:"145",to:"201",label:"Conflicts of interest"}] */
  connections: Connection<Datum>[];
  /** Given a node, returns an id for equality comparisons */
  nodeId: (node: Datum) => NodeId;
  /** Given a node, returns its parent id for equality comparisons */
  parentNodeId: (node: Datum) => NodeId | undefined;
  /** Defining arrows with markers for connections */
  defs: (
    state: State<Datum>,
    visibleConnections: Connection<Datum>[]
  ) => string;
  /** You can update connections with custom styling using this function */
  connectionsUpdate: ValueFn<SVGPathElement, Connection<Datum>, void>;
  /** You can access and modify actual link DOM element in runtime using this method. */
  linkUpdate: (
    node: HierarchyNode<Datum>,
    index: number,
    nodes: HierarchyNode<Datum>[]
  ) => void;
  /** You can access and modify actual node DOM element in runtime using this method. */
  nodeUpdate: (
    node: HierarchyNode<Datum>,
    index: number,
    nodes: HierarchyNode<Datum>[]
  ) => void;
  /** Configure each node width, use with caution, it is better to have the same value set for all nodes */
  nodeWidth: (node: HierarchyNode<Datum>) => number;
  /** Configure each node height, use with caution, it is better to have the same value set for all nodes */
  nodeHeight: (node: HierarchyNode<Datum>) => number;
  /** Configure margin between two siblings, use with caution, it is better to have the same value set for all nodes */
  siblingsMargin: (node: HierarchyNode<Datum>) => number;
  /** Configure margin between parent and children, use with caution, it is better to have the same value set for all nodes */
  childrenMargin: (node: HierarchyNode<Datum>) => number;
  /** Configure margin between two nodes, use with caution, it is better to have the same value set for all nodes */
  neighbourMargin: (
    node1: HierarchyNode<Datum>,
    node2: HierarchyNode<Datum>
  ) => number;
  /** Configure margin between two nodes in compact mode, use with caution, it is better to have the same value set for all nodes */
  compactMarginPair: (node: HierarchyNode<Datum>) => number;
  /** Configure margin between two nodes in compact mode, use with caution, it is better to have the same value set for all nodes */
  compactMarginBetween: () => number;
  /** A function which is triggered when the node is clicked. */
  onNodeClick: (node: HierarchyNode<Datum>) => void;
  /** Link generator for connections */
  linkGroupArc: Link<any, DefaultLinkObject, Point>;
  /** A function which renders the given node as HTML content.
  * Node HTML content generation , remember that you can access some helper methods:

  * node=> node.data - to access node's original data
  * node=> node.leaves() - to access node's leaves
  * node=> node.descendants() - to access node's descendants
  * node=> node.children - to access node's children
  * node=> node.parent - to access node's parent
  * node=> node.depth - to access node's depth
  * node=> node.height - to access node's height
  * node=> node.width - to access node's width
  *
  * You can also access additional properties to style your node:
  *
  * d=>d.data._centeredWithDescendants - when node is centered with descendants
  * d=>d.data._directSubordinatesPaging - subordinates count in paging mode
  * d=>d.data._directSubordinates - subordinates count
  * d=>d.data._totalSubordinates - total subordinates count
  * d=>d._highlighted - when node is highlighted
  * d=>d._upToTheRootHighlighted - when node is highlighted up to the root
  * d=>d._expanded - when node is expanded
  * d=>d.data._centered - when node is centered
  */
  nodeContent: (
    node: HierarchyNode<Datum>,
    index: number,
    nodes: HierarchyNode<Datum>[],
    state: State<Datum>
  ) => string;
  /** Configure layout direction , possible values are "top", "left", "right", "bottom" */
  layout: Layout;
  /** Node expand & collapse button content and styling. You can access same helper methods as above */
  buttonContent: (params: {
    node: HierarchyNode<Datum>;
    state: State<Datum>;
  }) => string;
  /**
   *   You can customize/offset positions for each node and link by overriding these functions
   *   For example, suppose you want to move link y position 30 px bellow in top layout. You can do it like this:
   *   ```javascript
   *   const layout = chart.layoutBindings();
   *   layout.top.linkY = node => node.y + 30;
   *   chart.layoutBindings(layout);
   *   ```
   */
  layoutBindings: Record<Layout, LayoutBinding<Datum>>;

  // The properties underneath were meant to be non-public

  calc:
    | {
        id: string;
        chartWidth: number;
        chartHeight: number;
      }
    | undefined;

  /** Configure minimum number of visible nodes , after which paging button appears */
  minPagingVisibleNodes: (d: HierarchyNode<Datum>) => number;
  /** Configure exported PNG and SVG image name */
  imageName: string;
  /** Node paging button content and styling. You can access same helper methods as above. */
  pagingButton: (
    d: HierarchyNode<Datum>,
    i: number,
    arr: HTMLDivElement[],
    state: State<Datum>
  ) => string;

  /** Configure expand & collapse button width */
  nodeButtonWidth: (d: HierarchyNode<Datum>) => number;
  /** Configure expand & collapse button height */
  nodeButtonHeight: (d: HierarchyNode<Datum>) => number;
  /** Configure expand & collapse button x position */
  nodeButtonX: (d: HierarchyNode<Datum>) => number;
  /** Configure expand & collapse button y position */
  nodeButtonY: (d: HierarchyNode<Datum>) => number;

  /** Callback for zoom & panning  */
  onZoom: (event: D3ZoomEvent<SVGSVGElement, void>, d: Datum) => void;
  /** Callback for zoom & panning start */
  onZoomStart: (event: D3ZoomEvent<SVGSVGElement, void>, d: Datum) => void;
  /** Callback for zoom & panning end */
  onZoomEnd: (event: D3ZoomEvent<SVGSVGElement, void>, d: Datum) => void;

  /** When correcting links which is not working for safari */
  linkYOffset: number;

  nodeGetIsExpanded: (d: Datum) => boolean;
  nodeSetIsExpanded: (d: Datum, value: boolean) => void;
}

export type Layout = "left" | "bottom" | "right" | "top";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutBinding<Datum> {
  nodeLeftX: (node: HierarchyNode<Datum>) => number;
  nodeRightX: (node: HierarchyNode<Datum>) => number;
  nodeTopY: (node: HierarchyNode<Datum>) => number;
  nodeBottomY: (node: HierarchyNode<Datum>) => number;
  nodeJoinX: (node: Rect) => number;
  nodeJoinY: (node: Rect) => number;
  linkJoinX: (node: Rect) => number;
  linkJoinY: (node: Rect) => number;
  linkX: (node: Rect) => number;
  linkY: (node: Rect) => number;
  linkCompactXStart: (node: HierarchyNode<Datum>) => number;
  linkCompactYStart: (node: HierarchyNode<Datum>) => number;
  compactLinkMidX: (node: HierarchyNode<Datum>, state: State<Datum>) => number;
  compactLinkMidY: (node: HierarchyNode<Datum>, state: State<Datum>) => number;
  linkParentX: (node: HierarchyNode<Datum>) => number;
  linkParentY: (node: HierarchyNode<Datum>) => number;
  buttonX: (node: { width: number; height: number }) => number;
  buttonY: (node: { width: number; height: number }) => number;
  /** Returns a CSS transform */
  centerTransform: (params: {
    root: HierarchyNode<Datum>;
    rootMargin: number;
    centerY: number;
    scale: number;
    centerX: number;
    chartWidth: number;
    chartHeight: number;
  }) => string;
  compactDimension: {
    sizeColumn: (node: HierarchyNode<Datum>) => number;
    sizeRow: (node: HierarchyNode<Datum>) => number;
    reverse<T>(a: T[]): T[];
  };
  nodeFlexSize: (params: {
    height: number;
    width: number;
    siblingsMargin: number;
    childrenMargin: number;
    state: State<Datum>;
    node: HierarchyNode<Datum>;
  }) => [number, number];
  zoomTransform: (params: {
    centerY: number;
    centerX: number;
    scale: number;
  }) => string;
  diagonal(
    source: Point,
    target: Point,
    m: Point | null,
    offset?: { sy: number }
  ): string;
  /** Swaps x and y coordinates */
  swap: (d: Point) => Point;
  nodeUpdateTransform: (
    params: { width: number; height: number } & Point
  ) => string;
}

// Helper type to remove the need to explicitly declare get / set methods
export type StateGetSet<T, TSelf> = {
  [Property in keyof State<T>]: () => State<T>[Property];
} & {
  [Property in keyof State<T>]: (value: State<T>[Property]) => TSelf;
};

export interface ConcreteDatum {
  _directSubordinates?: number;
  _directSubordinatesPaging?: number;
  _upToTheRootHighlighted?: boolean;
  _highlighted?: boolean;
  _expanded?: boolean;
  _centered?: boolean;
  _filtered?: boolean;
  _filteredOut?: boolean;
  _centeredWithDescendants?: boolean;
  _pagingButton?: boolean;
  _pagingStep?: number;
}
