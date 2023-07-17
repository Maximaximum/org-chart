import { Selection, ValueFn } from 'd3-selection';
import { D3ZoomEvent } from 'd3-zoom';
import { Link, DefaultLinkObject } from 'd3-shape';
import { FlextreeNode } from 'd3-flextree';
import { HierarchyNode as D3HierarchyNode } from 'd3-hierarchy';

export type NodeId = string;

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

export interface Size {
  width: number;
  height: number;
}

export type Rect = Point & Size;

export interface HierarchyNode<Datum> extends FlextreeNode<Datum> {
  /**
   * The children that are currently hidden due to node being collapsed
   */
  _children: this[] | undefined;
  x: number;
  y: number;
}

export interface Elements {
  svg: Selection<SVGSVGElement, string, HTMLElement, undefined>;
  centerG: Selection<SVGGElement, string, SVGGElement, string>;
  linksWrapper: Selection<SVGGElement, string, SVGGElement, string>;
  nodesWrapper: Selection<SVGGElement, string, SVGGElement, string>;
  connectionsWrapper: Selection<SVGGElement, string, SVGGElement, string>;
  defsWrapper: Selection<SVGGElement, string, SVGSVGElement, string>;
  chart: Selection<SVGGElement, string, SVGSVGElement, string>;
}

export interface NormalLayoutAttrs<Datum> {
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
}

export interface CompactLayoutAttrs<Datum> {
  /** Configure margin between two nodes in compact mode, use with caution, it is better to have the same value set for all nodes */
  compactMarginPair: (node: HierarchyNode<Datum>) => number;
  /** Configure margin between two nodes in compact mode, use with caution, it is better to have the same value set for all nodes */
  compactMarginBetween: () => number;
}

export interface NormalLayoutBinding {
  rectSizeWithMargins: (params: {
    height: number;
    width: number;
    siblingsMargin: number;
    childrenMargin: number;
  }) => Size;
  linkX: (node: Rect) => number;
  linkY: (node: Rect) => number;
  linkTargetX: (node: Rect) => number;
  linkTargetY: (node: Rect) => number;
  /** Swaps x and y coordinates */
  swap: (d: Point) => Point;
}

export interface CompactLayoutBinding {
  compactDimension: {
    sizeColumn: (node: Rect) => number;
    sizeRow: (node: Rect) => number;
  };
  compactLinkMidX: (node: Rect, margin: number) => number;
  compactLinkMidY: (node: Rect, margin: number) => number;
  linkCompactXStart: (node: Rect, compactEven: boolean) => number;
  linkCompactYStart: (node: Rect, compactEven: boolean) => number;
}

/**
 * The configuration attributes of an organization charts.
 * All of these properties are available as get / set pairs
 * of the organization chart object, per D3 standard.
 */
export interface State<Datum>
  extends NormalLayoutAttrs<Datum>,
    CompactLayoutAttrs<Datum> {
  /** Configure zoom scale extent , if you don't want any kind of zooming, set it to [1,1] */
  scaleExtent: [number, number];
  /** Set parent container, either CSS style selector or DOM element */
  container: string | HTMLElement;
  /** Data should be removed from attrs, instead root should be accpeted directly */
  data: Datum[] | null;
  root: HierarchyNode<Datum> | undefined;
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
    /** Link <path> element */
    this: SVGPathElement,
    node: HierarchyNode<Datum>,
    index: number,
    nodes: HierarchyNode<Datum>[]
  ) => void;
  /** Function used to render a given node data inside a node wrapper svg g element. */
  drawNode: (
    containers: Selection<
      SVGGElement,
      HierarchyNode<Datum>,
      SVGGElement,
      string
    >
  ) => void;
  /** Link generator for connections */
  linkGroupArc: Link<any, DefaultLinkObject, Point>;
  /** Configure layout direction , possible values are "top", "left", "right", "bottom" */
  layout: Layout;
  /**
   *   You can customize/offset positions for each node and link by overriding these functions
   *   For example, suppose you want to move link y position 30 px bellow in top layout. You can do it like this:
   *   ```javascript
   *   const layout = chart.layoutBindings();
   *   layout.top.linkY = node => node.y + 30;
   *   chart.layoutBindings(layout);
   *   ```
   */
  layoutBindings: Record<Layout, LayoutBinding>;
  nodeGetIsExpanded: (d: Datum) => boolean;
  nodeSetIsExpanded: (d: Datum, value: boolean) => void;
  centeredNode: HierarchyNode<Datum> | undefined;
  centerWithDescendants: boolean;

  // The properties underneath were meant to be non-public

  /** Configure minimum number of visible nodes, after which paging button appears */
  minPagingVisibleNodes: (d: D3HierarchyNode<Datum>) => number;
  /** Configure exported PNG and SVG image name */
  imageName: string;

  /** Callback for zoom & panning  */
  onZoom: (event: D3ZoomEvent<SVGSVGElement, void>, d: Datum) => void;
  /** Callback for zoom & panning start */
  onZoomStart: (event: D3ZoomEvent<SVGSVGElement, void>, d: Datum) => void;
  /** Callback for zoom & panning end */
  onZoomEnd: (event: D3ZoomEvent<SVGSVGElement, void>, d: Datum) => void;
}

export type Layout = 'left' | 'bottom' | 'right' | 'top';

export interface NodePositionBinding {
  left: (node: Rect) => number;
  right: (node: Rect) => number;
  top: (node: Rect) => number;
  bottom: (node: Rect) => number;
}

export interface LayoutBinding {
  normalLayoutBinding: NormalLayoutBinding;
  compactLayoutBinding: CompactLayoutBinding;
  nodeEdgePositionRelativeToNodePosition: NodePositionBinding;
  actualAbsoluteNodePosition: {
    x: (node: Rect) => number;
    y: (node: Rect) => number;
  };

  /** Returns a CSS transform */
  centerTransform: (params: {
    rootMargin: number;
    centerY: number;
    scale: number;
    centerX: number;
    chartWidth: number;
    chartHeight: number;
  }) => string;

  zoomTransform: (params: {
    centerY: number;
    centerX: number;
    scale: number;
  }) => string;
  diagonal(source: Point, target: Point, m?: Point): string;
}

// Helper type to remove the need to explicitly declare get / set methods
export type StateGetSet<T, TSelf> = {
  [Property in keyof State<T>]: () => State<T>[Property];
} & {
  [Property in keyof State<T>]: (value: State<T>[Property]) => TSelf;
};

export interface ConcreteDatum {
  /** when node is highlighted up to the root */
  _upToTheRootHighlighted?: boolean;
  /** when node is highlighted */
  _highlighted?: boolean;
  _expanded?: boolean;
}
