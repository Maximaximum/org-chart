import { Selection, ValueFn, BaseType } from 'd3-selection';
import { ZoomBehavior } from 'd3-zoom';
import { Link, DefaultLinkObject } from 'd3-shape';
import { HierarchyNode as D3HierarchyNode } from 'd3-hierarchy';
import { FlextreeLayout } from 'd3-flextree';

export type NodeId = string | number;

export interface Connection {
  from: NodeId;
  to: NodeId;
  label: string;
  _source: any;
  _target: any;
}

export interface Point {
  x: number;
  y: number;
}

export interface HierarchyNode<Datum> extends D3HierarchyNode<Datum> {
  firstCompactNode: any;
  _children: any[] | null;
  width: any;
  x: any;
  y: any;
  x0: any;
  y0: any;
  compactEven: any;
  flexCompactDim: number[] | null;
  firstCompact: any;
  row: any;
}

/**
 * The configuration attributes of an organization charts.
 * All of these properties are available as get / set pairs
 * of the organization chart object, per D3 standard.
 */
export interface State<Datum> {
  svgWidth: number;
  svgHeight: number;
  scaleExtent: [number, number];
  /** CSS selector string, for example "#my-chart" */
  container: string | Element;
  /** CSS color, for example "#2C3E50" */
  defaultTextFill: string;
  /** Font name, for example "Helvetica" */
  defaultFont: string;
  data: Datum[] | null;
  duration: number;
  setActiveNodeCentered: boolean;
  compact: boolean;
  rootMargin: number;
  connections: Connection[];
  /** Given a node, returns an id for equality comparisons */
  nodeId: (node: HierarchyNode<Datum> | Datum) => NodeId | undefined;
  /** Given a node, returns its parent id for equality comparisons */
  parentNodeId: (node: HierarchyNode<Datum> | Datum) => NodeId | undefined;
  /** CSS color, for example "#2C3E50" */
  backgroundColor: string;
  svg: Selection<SVGSVGElement, string, null, undefined>;
  /** Return type is the string representation of a SVG <defs> element */
  defs: (state: State<Datum>, visibleConnections: Connection[]) => string;
  connectionsUpdate: ValueFn<BaseType, Datum, void>;
  linkUpdate: (
    node: HierarchyNode<Datum>,
    index: number,
    nodes: Array<HierarchyNode<Datum>>
  ) => void;
  nodeUpdate: (
    node: HierarchyNode<Datum>,
    index: number,
    nodes: Array<HierarchyNode<Datum>>
  ) => void;
  nodeWidth: (node: HierarchyNode<Datum>) => number;
  nodeHeight: (node: HierarchyNode<Datum>) => number;
  siblingsMargin: (node: HierarchyNode<Datum>) => number;
  childrenMargin: (node: HierarchyNode<Datum>) => number;
  neightbourMargin: (
    node1: HierarchyNode<Datum>,
    node2: HierarchyNode<Datum>
  ) => number;
  compactMarginPair: (node: HierarchyNode<Datum>) => number;
  compactMarginBetween: (node: HierarchyNode<Datum>) => number;
  /** A function which is triggered when the node is clicked. */
  onNodeClick: (node: NodeId) => void;
  linkGroupArc: Link<any, DefaultLinkObject, [number, number]>;
  /** A function which renders the given node as HTML content. */
  nodeContent: (
    node: HierarchyNode<Datum>,
    index: number,
    nodes: Array<HierarchyNode<Datum>>,
    state: State<Datum>
  ) => string;
  layout: Layout;
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

  centerG: any;
  linksWrapper: any;
  nodesWrapper: any;
  connectionsWrapper: any;
  defsWrapper: any;
  chart: any;
  flexTreeLayout: FlextreeLayout<unknown>;
  minPagingVisibleNodes: any;
  imageName: any;
  diagonal: any;
  hdiagonal: any;
  pagingButton: any;

  nodeButtonWidth: any;
  nodeButtonHeight: any;
  nodeButtonX: any;
  nodeButtonY: any;

  onZoom: any;
  onZoomStart: any;
  onZoomEnd: any;

  neighbourMargin: any;
  linkYOffset: any;

  root: HierarchyNode<Datum>;
  allNodes: ReadonlyArray<HierarchyNode<Datum>>;
}

export type Layout = 'left' | 'bottom' | 'right' | 'top';

export interface LayoutBinding<Datum> {
  nodeLeftX: (node: HierarchyNode<Datum>) => number;
  nodeRightX: (node: HierarchyNode<Datum>) => number;
  nodeTopY: (node: HierarchyNode<Datum>) => number;
  nodeBottomY: (node: HierarchyNode<Datum>) => number;
  nodeJoinX: (node: HierarchyNode<Datum>) => number;
  nodeJoinY: (node: HierarchyNode<Datum>) => number;
  linkJoinX: (node: HierarchyNode<Datum>) => number;
  linkJoinY: (node: HierarchyNode<Datum>) => number;
  linkX: (node: HierarchyNode<Datum>) => number;
  linkY: (node: HierarchyNode<Datum>) => number;
  linkCompactXStart: (node: HierarchyNode<Datum>) => number;
  linkCompactYStart: (node: HierarchyNode<Datum>) => number;
  compactLinkMidX: (node: HierarchyNode<Datum>, state: State<Datum>) => number;
  compactLinkMidY: (node: HierarchyNode<Datum>, state: State<Datum>) => number;
  linkParentX: (node: HierarchyNode<Datum>) => number;
  linkParentY: (node: HierarchyNode<Datum>) => number;
  buttonX: (node: HierarchyNode<Datum>) => number;
  buttonY: (node: HierarchyNode<Datum>) => number;
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
  diagonal(source: Point, target: Point, m: Point | null, offset?: any): string;
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
