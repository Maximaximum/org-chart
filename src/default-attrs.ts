import { HierarchyNode, State } from './d3-org-chart.types';

import { selection, select } from 'd3-selection';
import { max, min, sum, cumsum } from 'd3-array';
import { tree, stratify } from 'd3-hierarchy';
import { zoom, zoomIdentity } from 'd3-zoom';
import { flextree } from 'd3-flextree';
import { linkHorizontal } from 'd3-shape';
import { getTextWidth } from './get-text-width';
import { defaultLayoutBindings } from './default-layout-bindings';

const d3 = {
  selection,
  select,
  max,
  min,
  sum,
  cumsum,
  tree,
  stratify,
  zoom,
  zoomIdentity,
  linkHorizontal,
  flextree,
};

type Datum = any;

export const defaultAttrs: Partial<State<Datum>> = {
  /* NOT INTENDED FOR PUBLIC OVERRIDE */

  id: `ID${Math.floor(Math.random() * 1000000)}`, // Id for event handlings
  firstDraw: true, // Whether chart is drawn for the first time
  ctx: document.createElement('canvas').getContext('2d')!,
  expandLevel: 1,
  nodeDefaultBackground: 'none',
  lastTransform: { x: 0, y: 0, k: 1 } as any, // Panning and zooming values
  zoomBehavior: null,

  /*  INTENDED FOR PUBLIC OVERRIDE */

  svgWidth: 800, // Configure svg width
  svgHeight: window.innerHeight - 100, // Configure svg height
  container: 'body', // Set parent container, either CSS style selector or DOM element
  data: null, // Set data, it must be an array of objects, where hierarchy is clearly defined via id and parent ID (property names are configurable)
  connections: [], // Sets connection data, array of objects, SAMPLE:  [{from:"145",to:"201",label:"Conflicts of interest"}]
  defaultFont: 'Helvetica', // Set default font
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
  pagingStep: (d: HierarchyNode<Datum>) => 5, // Configure how many nodes to show when making new nodes appear
  minPagingVisibleNodes: (d: HierarchyNode<Datum>) => 2000, // Configure minimum number of visible nodes , after which paging button appears
  scaleExtent: [0.001, 20], // Configure zoom scale extent , if you don't want any kind of zooming, set it to [1,1]
  duration: 400, // Configure duration of transitions
  imageName: 'Chart', // Configure exported PNG and SVG image name
  setActiveNodeCentered: true, // Configure if active node should be centered when expanded and collapsed
  layout: 'top', // Configure layout direction , possible values are "top", "left", "right", "bottom"
  compact: true, // Configure if compact mode is enabled , when enabled, nodes are shown in compact positions, instead of horizontal spread
  onZoomStart: (d: any) => {}, // Callback for zoom & panning start
  onZoom: (d: any) => {}, // Callback for zoom & panning
  onZoomEnd: (d: any) => {}, // Callback for zoom & panning end
  onNodeClick: (d) => d, // Callback for node click

  /*
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
    d
  ) => `<div style="padding:5px;font-size:10px;">Sample Node(id=${d.id}), override using <br/>
        <code>chart.nodeContent({data}=>{ <br/>
         &nbsp;&nbsp;&nbsp;&nbsp;return '' // Custom HTML <br/>
         })</code>
         <br/>
         Or check different <a href="https://github.com/bumbeishvili/org-chart#jump-to-examples" target="_blank">layout examples</a>
         </div>`,

  /* Node expand & collapse button content and styling. You can access same helper methods as above */
  buttonContent: ({ node, state }) => {
    const icons = {
      left: (d: any) =>
        d
          ? `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.283 3.50094L6.51 11.4749C6.37348 11.615 6.29707 11.8029 6.29707 11.9984C6.29707 12.194 6.37348 12.3819 6.51 12.5219L14.283 20.4989C14.3466 20.5643 14.4226 20.6162 14.5066 20.6516C14.5906 20.6871 14.6808 20.7053 14.772 20.7053C14.8632 20.7053 14.9534 20.6871 15.0374 20.6516C15.1214 20.6162 15.1974 20.5643 15.261 20.4989C15.3918 20.365 15.4651 20.1852 15.4651 19.9979C15.4651 19.8107 15.3918 19.6309 15.261 19.4969L7.9515 11.9984L15.261 4.50144C15.3914 4.36756 15.4643 4.18807 15.4643 4.00119C15.4643 3.81431 15.3914 3.63482 15.261 3.50094C15.1974 3.43563 15.1214 3.38371 15.0374 3.34827C14.9534 3.31282 14.8632 3.29456 14.772 3.29456C14.6808 3.29456 14.5906 3.31282 14.5066 3.34827C14.4226 3.38371 14.3466 3.43563 14.283 3.50094V3.50094Z" fill="#716E7B" stroke="#716E7B"/>
                  </svg></span><span style="color:#716E7B">${node.data._directSubordinatesPaging} </span></div>`
          : `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7.989 3.49944C7.85817 3.63339 7.78492 3.8132 7.78492 4.00044C7.78492 4.18768 7.85817 4.36749 7.989 4.50144L15.2985 11.9999L7.989 19.4969C7.85817 19.6309 7.78492 19.8107 7.78492 19.9979C7.78492 20.1852 7.85817 20.365 7.989 20.4989C8.05259 20.5643 8.12863 20.6162 8.21261 20.6516C8.2966 20.6871 8.38684 20.7053 8.478 20.7053C8.56916 20.7053 8.6594 20.6871 8.74338 20.6516C8.82737 20.6162 8.90341 20.5643 8.967 20.4989L16.74 12.5234C16.8765 12.3834 16.9529 12.1955 16.9529 11.9999C16.9529 11.8044 16.8765 11.6165 16.74 11.4764L8.967 3.50094C8.90341 3.43563 8.82737 3.38371 8.74338 3.34827C8.6594 3.31282 8.56916 3.29456 8.478 3.29456C8.38684 3.29456 8.2966 3.31282 8.21261 3.34827C8.12863 3.38371 8.05259 3.43563 7.989 3.50094V3.49944Z" fill="#716E7B" stroke="#716E7B"/>
                      </svg></span><span style="color:#716E7B">${node.data._directSubordinatesPaging} </span></div>`,
      bottom: (d: any) =>
        d
          ? `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M19.497 7.98903L12 15.297L4.503 7.98903C4.36905 7.85819 4.18924 7.78495 4.002 7.78495C3.81476 7.78495 3.63495 7.85819 3.501 7.98903C3.43614 8.05257 3.38462 8.12842 3.34944 8.21213C3.31427 8.29584 3.29615 8.38573 3.29615 8.47653C3.29615 8.56733 3.31427 8.65721 3.34944 8.74092C3.38462 8.82463 3.43614 8.90048 3.501 8.96403L11.4765 16.74C11.6166 16.8765 11.8044 16.953 12 16.953C12.1956 16.953 12.3834 16.8765 12.5235 16.74L20.499 8.96553C20.5643 8.90193 20.6162 8.8259 20.6517 8.74191C20.6871 8.65792 20.7054 8.56769 20.7054 8.47653C20.7054 8.38537 20.6871 8.29513 20.6517 8.21114C20.6162 8.12715 20.5643 8.05112 20.499 7.98753C20.3651 7.85669 20.1852 7.78345 19.998 7.78345C19.8108 7.78345 19.6309 7.85669 19.497 7.98753V7.98903Z" fill="#716E7B" stroke="#716E7B"/>
                   </svg></span><span style="margin-left:1px;color:#716E7B" >${node.data._directSubordinatesPaging} </span></div>
                   `
          : `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M11.457 8.07005L3.49199 16.4296C3.35903 16.569 3.28485 16.7543 3.28485 16.9471C3.28485 17.1398 3.35903 17.3251 3.49199 17.4646L3.50099 17.4736C3.56545 17.5414 3.64304 17.5954 3.72904 17.6324C3.81504 17.6693 3.90765 17.6883 4.00124 17.6883C4.09483 17.6883 4.18745 17.6693 4.27344 17.6324C4.35944 17.5954 4.43703 17.5414 4.50149 17.4736L12.0015 9.60155L19.4985 17.4736C19.563 17.5414 19.6405 17.5954 19.7265 17.6324C19.8125 17.6693 19.9052 17.6883 19.9987 17.6883C20.0923 17.6883 20.1849 17.6693 20.2709 17.6324C20.3569 17.5954 20.4345 17.5414 20.499 17.4736L20.508 17.4646C20.641 17.3251 20.7151 17.1398 20.7151 16.9471C20.7151 16.7543 20.641 16.569 20.508 16.4296L12.543 8.07005C12.4729 7.99653 12.3887 7.93801 12.2954 7.89801C12.202 7.85802 12.1015 7.8374 12 7.8374C11.8984 7.8374 11.798 7.85802 11.7046 7.89801C11.6113 7.93801 11.527 7.99653 11.457 8.07005Z" fill="#716E7B" stroke="#716E7B"/>
                   </svg></span><span style="margin-left:1px;color:#716E7B" >${node.data._directSubordinatesPaging} </span></div>
                `,
      right: (d: any) =>
        d
          ? `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M7.989 3.49944C7.85817 3.63339 7.78492 3.8132 7.78492 4.00044C7.78492 4.18768 7.85817 4.36749 7.989 4.50144L15.2985 11.9999L7.989 19.4969C7.85817 19.6309 7.78492 19.8107 7.78492 19.9979C7.78492 20.1852 7.85817 20.365 7.989 20.4989C8.05259 20.5643 8.12863 20.6162 8.21261 20.6516C8.2966 20.6871 8.38684 20.7053 8.478 20.7053C8.56916 20.7053 8.6594 20.6871 8.74338 20.6516C8.82737 20.6162 8.90341 20.5643 8.967 20.4989L16.74 12.5234C16.8765 12.3834 16.9529 12.1955 16.9529 11.9999C16.9529 11.8044 16.8765 11.6165 16.74 11.4764L8.967 3.50094C8.90341 3.43563 8.82737 3.38371 8.74338 3.34827C8.6594 3.31282 8.56916 3.29456 8.478 3.29456C8.38684 3.29456 8.2966 3.31282 8.21261 3.34827C8.12863 3.38371 8.05259 3.43563 7.989 3.50094V3.49944Z" fill="#716E7B" stroke="#716E7B"/>
                   </svg></span><span style="color:#716E7B">${node.data._directSubordinatesPaging} </span></div>`
          : `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M14.283 3.50094L6.51 11.4749C6.37348 11.615 6.29707 11.8029 6.29707 11.9984C6.29707 12.194 6.37348 12.3819 6.51 12.5219L14.283 20.4989C14.3466 20.5643 14.4226 20.6162 14.5066 20.6516C14.5906 20.6871 14.6808 20.7053 14.772 20.7053C14.8632 20.7053 14.9534 20.6871 15.0374 20.6516C15.1214 20.6162 15.1974 20.5643 15.261 20.4989C15.3918 20.365 15.4651 20.1852 15.4651 19.9979C15.4651 19.8107 15.3918 19.6309 15.261 19.4969L7.9515 11.9984L15.261 4.50144C15.3914 4.36756 15.4643 4.18807 15.4643 4.00119C15.4643 3.81431 15.3914 3.63482 15.261 3.50094C15.1974 3.43563 15.1214 3.38371 15.0374 3.34827C14.9534 3.31282 14.8632 3.29456 14.772 3.29456C14.6808 3.29456 14.5906 3.31282 14.5066 3.34827C14.4226 3.38371 14.3466 3.43563 14.283 3.50094V3.50094Z" fill="#716E7B" stroke="#716E7B"/>
                   </svg></span><span style="color:#716E7B">${node.data._directSubordinatesPaging} </span></div>`,
      top: (d: any) =>
        d
          ? `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.457 8.07005L3.49199 16.4296C3.35903 16.569 3.28485 16.7543 3.28485 16.9471C3.28485 17.1398 3.35903 17.3251 3.49199 17.4646L3.50099 17.4736C3.56545 17.5414 3.64304 17.5954 3.72904 17.6324C3.81504 17.6693 3.90765 17.6883 4.00124 17.6883C4.09483 17.6883 4.18745 17.6693 4.27344 17.6324C4.35944 17.5954 4.43703 17.5414 4.50149 17.4736L12.0015 9.60155L19.4985 17.4736C19.563 17.5414 19.6405 17.5954 19.7265 17.6324C19.8125 17.6693 19.9052 17.6883 19.9987 17.6883C20.0923 17.6883 20.1849 17.6693 20.2709 17.6324C20.3569 17.5954 20.4345 17.5414 20.499 17.4736L20.508 17.4646C20.641 17.3251 20.7151 17.1398 20.7151 16.9471C20.7151 16.7543 20.641 16.569 20.508 16.4296L12.543 8.07005C12.4729 7.99653 12.3887 7.93801 12.2954 7.89801C12.202 7.85802 12.1015 7.8374 12 7.8374C11.8984 7.8374 11.798 7.85802 11.7046 7.89801C11.6113 7.93801 11.527 7.99653 11.457 8.07005Z" fill="#716E7B" stroke="#716E7B"/>
                    </svg></span><span style="margin-left:1px;color:#716E7B">${node.data._directSubordinatesPaging} </span></div>
                    `
          : `<div style="display:flex;"><span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.497 7.98903L12 15.297L4.503 7.98903C4.36905 7.85819 4.18924 7.78495 4.002 7.78495C3.81476 7.78495 3.63495 7.85819 3.501 7.98903C3.43614 8.05257 3.38462 8.12842 3.34944 8.21213C3.31427 8.29584 3.29615 8.38573 3.29615 8.47653C3.29615 8.56733 3.31427 8.65721 3.34944 8.74092C3.38462 8.82463 3.43614 8.90048 3.501 8.96403L11.4765 16.74C11.6166 16.8765 11.8044 16.953 12 16.953C12.1956 16.953 12.3834 16.8765 12.5235 16.74L20.499 8.96553C20.5643 8.90193 20.6162 8.8259 20.6517 8.74191C20.6871 8.65792 20.7054 8.56769 20.7054 8.47653C20.7054 8.38537 20.6871 8.29513 20.6517 8.21114C20.6162 8.12715 20.5643 8.05112 20.499 7.98753C20.3651 7.85669 20.1852 7.78345 19.998 7.78345C19.8108 7.78345 19.6309 7.85669 19.497 7.98753V7.98903Z" fill="#716E7B" stroke="#716E7B"/>
                    </svg></span><span style="margin-left:1px;color:#716E7B">${node.data._directSubordinatesPaging} </span></div>
                `,
    };
    return `<div style="border:1px solid #E4E2E9;border-radius:3px;padding:3px;font-size:9px;margin:auto auto;background-color:white"> ${icons[
      state.layout
    ](node.children)}  </div>`;
  },
  /* Node paging button content and styling. You can access same helper methods as above. */
  pagingButton: (
    d: HierarchyNode<Datum>,
    i: number,
    arr: any[],
    state: State<Datum>
  ) => {
    const step = state.pagingStep(d.parent!);
    const currentIndex = d.parent!.data._pagingStep;
    const diff = d.parent!.data._directSubordinatesPaging - currentIndex;
    const min = Math.min(diff, step);
    return `
               <div style="margin-top:90px;">
                  <div style="display:flex;width:170px;border-radius:20px;padding:5px 15px; padding-bottom:4px;;background-color:#E5E9F2">
                  <div><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.59 7.41L10.18 12L5.59 16.59L7 18L13 12L7 6L5.59 7.41ZM16 6H18V18H16V6Z" fill="#716E7B" stroke="#716E7B"/>
                  </svg>
                  </div><div style="line-height:2"> Show next ${min}  nodes </div></div>
               </div>
            `;
  },
  /* You can access and modify actual node DOM element in runtime using this method. */
  nodeUpdate: function (d, i, arr) {
    d3.select(this as any)
      .select('.node-rect')
      .attr('stroke', (d: any) =>
        d.data._highlighted || d.data._upToTheRootHighlighted
          ? '#E27396'
          : 'none'
      )
      .attr(
        'stroke-width',
        d.data._highlighted || d.data._upToTheRootHighlighted ? 10 : 1
      );
  },
  /* You can access and modify actual link DOM element in runtime using this method. */
  linkUpdate: function (d, i, arr) {
    d3.select(this as any)
      .attr('stroke', (d: any) =>
        d.data._upToTheRootHighlighted ? '#E27396' : '#E4E2E9'
      )
      .attr('stroke-width', (d: any) =>
        d.data._upToTheRootHighlighted ? 5 : 1
      );

    if (d.data._upToTheRootHighlighted) {
      d3.select(this as any).raise();
    }
  },

  // Defining arrows with markers for connections
  defs: function (state, visibleConnections) {
    return `<defs>
                ${visibleConnections
                  .map((conn) => {
                    const labelWidth = getTextWidth(conn.label, {
                      ctx: state.ctx,
                      fontSize: 2,
                      defaultFont: state.defaultFont,
                    });
                    return `
                   <marker id="${conn.from + '_' + conn.to}" refX="${
                      conn._source.x < conn._target.x ? -7 : 7
                    }" refY="5" markerWidth="500"  markerHeight="500"  orient="${
                      conn._source.x < conn._target.x
                        ? 'auto'
                        : 'auto-start-reverse'
                    }" >
                   <rect rx=0.5 width=${
                     conn.label ? labelWidth + 3 : 0
                   } height=3 y=1  fill="#E27396"></rect>
                   <text font-size="2px" x=1 fill="white" y=3>${
                     conn.label || ''
                   }</text>
                   </marker>

                   <marker id="arrow-${
                     conn.from + '_' + conn.to
                   }"  markerWidth="500"  markerHeight="500"  refY="2"  refX="1" orient="${
                      conn._source.x < conn._target.x
                        ? 'auto'
                        : 'auto-start-reverse'
                    }" >
                   <path transform="translate(0)" d='M0,0 V4 L2,2 Z' fill='#E27396' />
                   </marker>
                `;
                  })
                  .join('')}
                </defs>
                `;
  },
  /* You can update connections with custom styling using this function */
  connectionsUpdate: function (d, i, arr) {
    d3.select(this)
      .attr('stroke', (d) => '#E27396')
      .attr('stroke-linecap', 'round')
      .attr('stroke-width', (d) => '5')
      .attr('pointer-events', 'none')
      .attr('marker-start', (d: any) => `url(#${d.from + '_' + d.to})`)
      .attr('marker-end', (d: any) => `url(#arrow-${d.from + '_' + d.to})`);
  },
  // Link generator for connections
  linkGroupArc: d3
    .linkHorizontal()
    .x((d: any) => d.x)
    .y((d: any) => d.y),

  /**
   *   You can customize/offset positions for each node and link by overriding these functions
   *   For example, suppose you want to move link y position 30 px bellow in top layout. You can do it like this:
   *   ```javascript
   *   const layout = chart.layoutBindings();
   *   layout.top.linkY = node => node.y + 30;
   *   chart.layoutBindings(layout);
   *   ```
   */
  layoutBindings: defaultLayoutBindings,
};
