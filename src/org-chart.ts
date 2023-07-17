import './patternify';

import { select, Selection, create } from 'd3-selection';
import { max, min, sum, cumsum } from 'd3-array';
import { stratify } from 'd3-hierarchy';
import { zoom, zoomIdentity, ZoomBehavior, D3ZoomEvent } from 'd3-zoom';
import { flextree } from 'd3-flextree';
import { DefaultLinkObject, Link, linkHorizontal } from 'd3-shape';

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
} from './d3-org-chart.types';
import { toDataURL } from './to-data-url';
import { downloadImage } from './download-image';
import { defaultLayoutBindings } from './default-layout-bindings';
import { connectionArrowhead, connectionLabel } from './connection-defs';
import { highlightColor, linkColor } from './default-colors';
import {
  DefaultNodeRenderer,
  defaultNodeSelector,
} from './default-node-renderer';
import { PagingNodeRenderer, pagingNodeSelector } from './paging-node-renderer';
import { CompactLayout } from './compact-layout';
import { NormalLayout } from './normal-layout';

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

  // TODO Should be private
  pagination = new PagingNodeRenderer(this);
  defaultNodeRenderer = new DefaultNodeRenderer(this);

  private _attrs = {
    /*  INTENDED FOR PUBLIC OVERRIDE */
    container: 'body',
    data: null,
    root: undefined,
    connections: [],
    nodeId: (d) => (d as any).nodeId || (d as any).id,
    parentNodeId: (d) => (d as any).parentNodeId || (d as any).parentId,
    rootMargin: 40,
    nodeWidth: (d3Node) => 250,
    nodeHeight: (d) => 150,

    // #region NormalLayout properties
    neighbourMargin: (n1, n2) => 80,
    siblingsMargin: (d3Node) => 20,
    childrenMargin: (d) => 60,
    // #endregion

    // #region CompactLayout properties
    compact: true,
    compactMarginPair: (d) => 100,
    compactMarginBetween: () => 20,
    // #endregion

    minPagingVisibleNodes: (d) => 2000,
    scaleExtent: [0.001, 20],
    duration: 400,
    imageName: 'Chart',
    setActiveNodeCentered: true,
    layout: 'top',
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
          (d) => (this.pagination.paginationButtonNodes.has(d.data) ? [d] : []),
          function (d) {
            return attrs.nodeId(d.data);
          }
        );

      const defaultNodes = containers
        .selectAll<SVGGElement, HierarchyNode<Datum>>(defaultNodeSelector)
        .data(
          (d) =>
            !this.pagination.paginationButtonNodes.has(d.data) ? [d] : [],
          function (d) {
            return attrs.nodeId(d.data);
          }
        );

      this.pagination.draw(pagingNodes);
      this.defaultNodeRenderer.draw(defaultNodes);

      containers
        .style('border-color', (d) =>
          d.data._highlighted || d.data._upToTheRootHighlighted
            ? highlightColor
            : 'none'
        )
        .style('border-width', (d) =>
          d.data._highlighted || d.data._upToTheRootHighlighted ? 10 : 0
        )
        .style('border-style', 'solid');
    },
    linkUpdate: function (d, i, arr) {
      d3.select<SVGPathElement, HierarchyNode<Datum>>(this)
        .attr('stroke', (d) =>
          d.data._upToTheRootHighlighted ? highlightColor : linkColor
        )
        .attr('stroke-width', (d) => (d.data._upToTheRootHighlighted ? 5 : 1));

      if (d.data._upToTheRootHighlighted) {
        d3.select(this).raise();
      }
    },
    defs: (state, visibleConnections) => {
      return `
      <defs>
        ${visibleConnections
          .map((conn) => {
            return [connectionLabel(conn), connectionArrowhead(conn)].join('');
          })
          .join('')}
      </defs>
      `;
    },
    connectionsUpdate: function (d, i, arr) {
      d3.select<SVGPathElement, Connection<Datum>>(this)
        .attr('stroke', (d) => highlightColor)
        .attr('stroke-linecap', 'round')
        .attr('stroke-width', (d) => '5')
        .attr('pointer-events', 'none')
        .attr('marker-start', (d) => `url(#${d.from + '_' + d.to})`)
        .attr('marker-end', (d) => `url(#arrow-${d.from + '_' + d.to})`);
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

    const attrs = this.getChartState();

    this.defaultNodeRenderer.expandToggleClick.subscribe((d) => {
      this.toggleExpandNode(d);

      if (attrs.setActiveNodeCentered) {
        attrs.centeredNode = d;
      }

      // Redraw Graph
      this.rerender();
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
      console.log('ORG CHART - Data is empty');
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
        .on('start', (event, d) => attrs.onZoomStart(event, d))
        .on('end', (event, d) => attrs.onZoomEnd(event, d))
        .on('zoom', (event, d) => {
          attrs.onZoom(event, d);
          this.zoomed(event, d);
        })
        .scaleExtent(attrs.scaleExtent);
    }

    // *************************  DRAWING **************************
    container.call(this.drawContainers, {
      rootMargin: attrs.rootMargin,
    });

    // Display tree contents
    this._attrs.root = createHierarchyFromData(
      attrs.data,
      this.pagination,
      attrs
    );
    this.rerender();

    this.firstDraw = false;

    return this;
  }

  /**
   * This function basically redraws visible graph, based on nodes state
   */
  rerender() {
    const attrs = this.getChartState();

    const layout = this.layoutFactory(attrs.compact);

    const treeData = layout.createFlextreeNodes();

    const nodes = treeData.descendants() as any as HierarchyNode<Datum>[];

    const nodeWrapperGElements = this.drawNodeWrappers(
      this.elements.nodesWrapper,
      nodes,
      {
        layoutBinding: this.getLayoutBinding(),
        duration: attrs.duration,
        nodeId: attrs.nodeId,
      }
    );

    nodeWrapperGElements.call(this.drawNodes);

    // Get all links
    const links = nodes
      .slice(1)
      .filter((l) => !this.pagination.paginationButtonNodes.has(l.data));

    // Connections
    const visibleConnections = this.getVisibleConnections(nodes);

    this.elements.defsWrapper.html(
      attrs.defs.bind(this)(attrs, visibleConnections)
    );

    this.elements.linksWrapper.call(
      this.drawLinks,
      links,
      (d) => layout.getLinkSourcePoint(d),
      (d) => layout.getLinkTargetPoint(d.parent!),
      (d) => layout.getLinkMiddlePoint(d)
    );
    this.elements.connectionsWrapper.call(
      this.drawConnections,
      visibleConnections
    );

    this.translateChartGroupIfNeeded();
  }

  private getVisibleConnections(nodes: HierarchyNode<Datum>[]) {
    const attrs = this.getChartState();
    const allNodesMap = new Map(
      attrs.root!.descendants().map((d) => [attrs.nodeId(d.data), d])
    );
    const visibleNodesMap = new Map(
      nodes.map((d) => [attrs.nodeId(d.data), d])
    );

    attrs.connections.forEach((connection) => {
      const source = allNodesMap.get(connection.from)!;
      const target = allNodesMap.get(connection.to)!;
      connection._source = source;
      connection._target = target;
    });
    return attrs.connections.filter(
      (d) => visibleNodesMap.get(d.from) && visibleNodesMap.get(d.to)
    );
  }

  toggleExpandNode(node: HierarchyNode<Datum>) {
    this._attrs.nodeSetIsExpanded(
      node.data,
      !this._attrs.nodeGetIsExpanded(node.data)
    );
    updateChildrenProperty(node, this._attrs.nodeGetIsExpanded);
  }

  /**
   * Ensure that all the node's ancestors are expanded so that the node becomes visible
   * @param node to make visible
   */
  ensureAncestorsAreExpanded(node: HierarchyNode<Datum>) {
    this._attrs.nodeSetIsExpanded(node.data, true);
    updateChildrenProperty(node, this._attrs.nodeGetIsExpanded);

    if (node.parent) {
      this.ensureAncestorsAreExpanded(node.parent);
    }
  }

  collapse(d: HierarchyNode<Datum>) {
    this._attrs.nodeSetIsExpanded(d.data, false);
    updateChildrenProperty(d, this._attrs.nodeGetIsExpanded);
  }

  expand(d: HierarchyNode<Datum>) {
    this._attrs.nodeSetIsExpanded(d.data, true);
    updateChildrenProperty(d, this._attrs.nodeGetIsExpanded);
  }

  /* Zoom handler function */
  zoomed(event: D3ZoomEvent<SVGSVGElement, void>, d: Datum) {
    const chart = this.elements.chart;

    // Get d3 event's transform object
    const transform = event.transform;

    // Store it
    this.lastTransform = transform;

    // Reposition and rescale chart accordingly
    chart.attr('transform', transform.toString());
  }

  zoomTreeBounds(
    {
      x0,
      x1,
      y0,
      y1,
    }: {
      x0: number;
      x1: number;
      y0: number;
      y1: number;
    },
    animate = true,
    scale = true
  ) {
    const { duration } = this.getChartState();
    const w = this.elements.svg.node()!.clientWidth;
    const h = this.elements.svg.node()!.clientHeight;
    let scaleVal = Math.min(8, 0.9 / Math.max((x1 - x0) / w, (y1 - y0) / h));
    let identity = d3.zoomIdentity.translate(w / 2, h / 2);
    identity = identity.scale(scale ? scaleVal : this.lastTransform.k);

    identity = identity.translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    // Transition zoom wrapper component into specified bounds
    this.elements.svg
      .transition()
      .duration(animate ? duration : 0)
      .call(this.zoomBehavior!.transform as any, identity);
    this.elements.centerG
      .transition()
      .duration(animate ? duration : 0)
      .attr('transform', 'translate(0,0)');
  }

  fit({
    nodes,
    animate = true,
    scale = true,
  }: {
    nodes?: Iterable<HierarchyNode<Datum>>;
    animate?: boolean;
    scale?: boolean;
  } = {}) {
    const attrs = this.getChartState();
    let descendants = nodes || attrs.root!.descendants();
    const nodePosition =
      this.getLayoutBinding().nodeEdgePositionRelativeToNodePosition;

    const minX = d3.min(
      descendants,
      (d) => d.x + nodePosition.left(this.getNodeRect(d))
    );
    const maxX = d3.max(
      descendants,
      (d) => d.x + nodePosition.right(this.getNodeRect(d))
    );
    const minY = d3.min(
      descendants,
      (d) => d.y + nodePosition.top(this.getNodeRect(d))
    );
    const maxY = d3.max(
      descendants,
      (d) => d.y + nodePosition.bottom(this.getNodeRect(d))
    );

    this.zoomTreeBounds(
      {
        x0: minX! - 50,
        x1: maxX! + 50,
        y0: minY! - 50,
        y1: maxY! + 50,
      },
      animate,
      scale
    );
    return this;
  }

  // This function can be invoked via chart.setExpanded API, it expands or collapses particular node
  setExpanded(id: NodeId, expandedFlag = true) {
    const attrs = this.getChartState();
    // Retrieve node by node Id
    const node = attrs
      .root!.descendants()
      .filter(({ data }) => attrs.nodeId(data) == id)[0];

    if (!node) {
      console.log(
        `ORG CHART - ${
          expandedFlag ? 'EXPAND' : 'COLLAPSE'
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
    const node = attrs
      .root!.descendants()
      .filter((d) => attrs.nodeId(d.data) === nodeId)[0];
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
    const node = attrs
      .root!.descendants()
      .filter((d) => attrs.nodeId(d.data) === nodeId)[0];
    node.data._highlighted = true;
    attrs.nodeSetIsExpanded(node.data, true);
    this._attrs.centeredNode = node;
    return this;
  }

  setUpToTheRootHighlighted(nodeId: NodeId) {
    const attrs = this.getChartState();
    const node = attrs
      .root!.descendants()
      .filter((d) => attrs.nodeId(d.data) === nodeId)[0];
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
    attrs.root!.descendants().forEach((d) => {
      d.data._highlighted = false;
      d.data._upToTheRootHighlighted = false;
    });
    this.rerender();
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
    const selection = this.elements.svg.selectAll('img');
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
              that.rerender();
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
    this._attrs.root!.descendants().forEach((d) => {
      this._attrs.nodeSetIsExpanded(d.data, true);
    });
    this.render();
    return this;
  }

  collapseAll() {
    this._attrs.root!.descendants().forEach((d) => {
      this._attrs.nodeSetIsExpanded(d.data, false);
    });
    this.render();
    return this;
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
        tag: 'svg',
        className: 'svg-chart-container',
      })
      .style('width', '100%')
      .style('height', '100%');

    if (this.firstDraw) {
      svg
        .call(this.zoomBehavior! as any)
        .on('dblclick.zoom', null)
        .attr('cursor', 'move');
    }

    //Add container g element
    const chart = svg.patternify({
      tag: 'g',
      className: 'chart',
    });

    // Add one more container g element, for better positioning controls
    const centerG = chart.patternify({
      tag: 'g',
      className: 'center-group',
    });

    const linksWrapper = centerG.patternify({
      tag: 'g',
      className: 'links-wrapper',
    });

    const nodesWrapper = centerG.patternify({
      tag: 'g',
      className: 'nodes-wrapper',
    });

    const connectionsWrapper = centerG.patternify({
      tag: 'g',
      className: 'connections-wrapper',
    });

    const defsWrapper = svg.patternify({
      tag: 'g',
      className: 'defs-wrapper',
    });

    if (this.firstDraw) {
      centerG.attr('transform', () => {
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
      .attr('opacity', 0)
      .duration(attrs.duration)
      .attr('transform', (rect) => {
        const nodePosition =
          this.getLayoutBinding().nodeEdgePositionRelativeToNodePosition;
        const x = rect.x + nodePosition.left(this.getNodeRect(rect));
        const y = rect.y + nodePosition.top(this.getNodeRect(rect));
        return `translate(${x},${y})`;
      })
      .attr('opacity', 1);

    return nodeWrapperGElements;
  };

  private drawConnections = (
    connectionsWrapper: Selection<SVGGElement, string, SVGGElement, string>,
    visibleConnections: Connection<Datum>[]
  ) => {
    const attrs = this.getChartState();

    const connectionsSel = connectionsWrapper
      .selectAll<SVGPathElement, Connection<Datum>>('path.connection')
      .data(visibleConnections);

    // Enter any new connections at the parent's previous position.
    const connEnter = connectionsSel
      .enter()
      .insert('path', 'g')
      .attr('class', 'connection')
      .attr('d', (d) => {
        const animationSource = this.getAnimationSourceRect(d._source);
        const targetP =
          this.getLayoutBinding().normalLayoutBinding.links.target;

        const xo = targetP.x(animationSource);
        const yo = targetP.y(animationSource);
        const o = { x: xo, y: yo };
        return this.getLayoutBinding().diagonal(o, o);
      });

    // Get connections update selection
    const connUpdate = connEnter.merge(connectionsSel);

    // Styling connections
    connUpdate.attr('fill', 'none');

    // Transition back to the parent element position
    connUpdate
      .transition()
      .duration(attrs.duration)
      .attr('d', (d) => {
        const binding = this.getLayoutBinding().normalLayoutBinding;

        return attrs.linkGroupArc({
          source: {
            x: binding.links.source.x(this.getNodeRect(d._source)),
            y: binding.links.source.y(this.getNodeRect(d._source)),
          },
          target: {
            x: binding.links.target.x(this.getNodeRect(d._target)),
            y: binding.links.target.y(this.getNodeRect(d._target)),
          },
        } as any);
      });

    // Allow external modifications
    connUpdate.each(attrs.connectionsUpdate);

    // Remove any  links which is exiting after animation
    const connExit = connectionsSel
      .exit()
      .transition()
      .duration(attrs.duration)
      .attr('opacity', 0)
      .remove();
  };

  private drawLinks = (
    linksWrapper: Selection<SVGGElement, string, SVGGElement, string>,
    links: HierarchyNode<Datum>[],
    getSourcePointFn: (d: HierarchyNode<Datum>) => Point,
    getTargetPointFn: (d: HierarchyNode<Datum>) => Point,
    getMiddlePointFn: (d: HierarchyNode<Datum>) => Point | undefined
  ) => {
    const attrs = this.getChartState();
    // Get links selection
    const linkSelection = linksWrapper
      .selectAll<SVGPathElement, HierarchyNode<Datum>>('path.link')
      .data(links, (d) => attrs.nodeId(d.data)!);

    // Enter any new links at the parent's previous position.
    const linkEnter = linkSelection
      .enter()
      .insert('path', 'g')
      .attr('class', 'link')
      .attr('d', (d) => {
        const targetP =
          this.getLayoutBinding().normalLayoutBinding.links.target;

        const xo = targetP.x(this.getAnimationSourceRect(d));
        const yo = targetP.y(this.getAnimationSourceRect(d));
        const o = { x: xo, y: yo };
        return this.getLayoutBinding().diagonal(o, o, o);
      });

    // Get links update selection
    const linkUpdate = linkEnter.merge(linkSelection);

    // Styling links
    linkUpdate.attr('fill', 'none');

    linkUpdate.style('display', (d) =>
      this.pagination.paginationButtonNodes.has(d.data) ? 'none' : 'auto'
    );

    // Allow external modifications
    linkUpdate.each(attrs.linkUpdate as any);

    // Transition back to the parent element position
    linkUpdate
      .transition()
      .duration(attrs.duration)
      .attr('d', (d) => {
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
      .attr('d', (d) => {
        const targetP =
          this.getLayoutBinding().normalLayoutBinding.links.target;

        const xo = targetP.x(
          this.getAnimationSourceRect(d as HierarchyNode<Datum>)
        );
        const yo = targetP.y(
          this.getAnimationSourceRect(d as HierarchyNode<Datum>)
        );
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
    attrs: {
      layoutBinding: LayoutBinding;
      duration: number;
      nodeId: (node: Datum) => NodeId;
    }
  ) {
    return nodesWrapper
      .selectAll<SVGGElement, HierarchyNode<Datum>>('g.node')
      .data(nodes, ({ data }) => attrs.nodeId(data))
      .join(
        (enter) => {
          // Enter any new nodes at the parent's previous position.
          return enter
            .append('g')
            .attr('class', 'node')
            .attr('transform', (d) => {
              const parentRect = this.getAnimationSourceRect(d);
              const position =
                this.getLayoutBinding().actualAbsoluteNodePosition;
              const xj = position.x(parentRect);
              const yj = position.y(parentRect);
              return `translate(${xj},${yj})`;
            });
        },
        (update) => update,
        (exit) => {
          // Remove any exiting nodes after transition
          return exit
            .attr('opacity', 1)
            .transition()
            .duration(attrs.duration)
            .attr('transform', (d) => {
              const parentRect = this.getAnimationSourceRect(d);
              const position =
                this.getLayoutBinding().actualAbsoluteNodePosition;
              const xj = position.x(parentRect);
              const yj = position.y(parentRect);
              return `translate(${xj},${yj})`;
            })
            .on('end', function (this) {
              d3.select(this).remove();
            })
            .attr('opacity', 0);
        }
      )
      .attr('cursor', 'default')
      .style('font', '12px sans-serif');
  }

  private getAnimationSourceRect(d: HierarchyNode<Datum>) {
    return d.parent
      ? this.getNodeRect(d.parent)
      : {
          x: 0,
          y: 0,
          height: 0,
          width: 0,
        };
  }

  private layoutFactory(compact: boolean) {
    return compact
      ? new CompactLayout(
          this.getLayoutBinding().normalLayoutBinding,
          this.getLayoutBinding().compactLayoutBinding,
          this.getChartState(),
          this._attrs.root!
        )
      : new NormalLayout(
          this.getLayoutBinding().normalLayoutBinding,
          this.getChartState(),
          this._attrs.root!
        );
  }

  getNodeRect(d: HierarchyNode<Datum>) {
    return {
      x: d.x,
      y: d.y,
      height: this._attrs.nodeHeight(d),
      width: this._attrs.nodeWidth(d),
    };
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

export function updateChildrenProperty<Datum>(
  node: HierarchyNode<Datum>,
  nodeGetIsExpanded: (d: Datum) => boolean
) {
  if (nodeGetIsExpanded(node.data)) {
    // Expand children
    node.children = node.children || node._children;
    node._children = undefined;
  } else {
    // Collapse them
    node._children = node._children || node.children;
    node.children = undefined;
  }
}

export function createHierarchyFromData<Datum extends ConcreteDatum>(
  data: Datum[],
  pagination: PagingNodeRenderer<Datum>,
  attrs: Pick<
    State<Datum>,
    'nodeId' | 'parentNodeId' | 'minPagingVisibleNodes' | 'nodeGetIsExpanded'
  >
) {
  // Store new root by converting flat data to hierarchy
  const root = d3
    .stratify<Datum>()
    .id((d) => attrs.nodeId(d))
    .parentId((d) => attrs.parentNodeId(d))(data);

  pagination.initPagination(root, attrs.minPagingVisibleNodes);

  const root2 = d3
    .stratify<Datum>()
    .id((d) => attrs.nodeId(d))
    .parentId((d) => attrs.parentNodeId(d))(
    data.filter(
      (d) => !pagination.nodesHiddenDueToPagination.has(attrs.nodeId(d))
    )
  ) as any;

  for (const node of root2.descendants()) {
    updateChildrenProperty(node, attrs.nodeGetIsExpanded);
  }

  return root2;
}
