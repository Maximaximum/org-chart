import './patternify';

import { BaseType, Selection } from 'd3-selection';

import { HierarchyNode, State, ConcreteDatum } from './d3-org-chart.types';
import { nodeBackground } from './default-colors';
import { OrgChart } from './org-chart';
import { Layout } from './d3-org-chart.types';
import { linkColor } from './default-colors';
import {
  getOppositeDirection,
  isLayoutVertical,
} from './default-layout-bindings';
import { arrowPaths } from './arrow-paths';
import { Subject } from 'rxjs';

export const defaultNodeSelector = '.default-node-wrapper';

function numChildrenSpan(
  totalChildrenNumber: number | undefined,
  addMargin: boolean
) {
  const margin = addMargin ? 'margin-left:1px;' : '';
  return `<span style="${margin}color:#716E7B">${totalChildrenNumber} </span>`;
}

function getArrowDirection(layout: Layout, opposite: boolean) {
  return opposite ? getOppositeDirection(layout) : layout;
}

function wrapIconPath(content: string) {
  return `<span style="align-items:center;display:flex;"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${content}</svg></span>`;
}

function outerWrap(content: string) {
  return `<div style="border:1px solid ${linkColor};border-radius:3px;padding:3px;font-size:9px;margin:auto auto;background-color:white"><div style="display:flex;">${content}</div></div>`;
}

function buttonContent(
  isExpanded: boolean,
  layout: Layout,
  totalChildrenNumber: number
) {
  return outerWrap(
    wrapIconPath(arrowPaths[getArrowDirection(layout, !isExpanded)]) +
      numChildrenSpan(totalChildrenNumber, isLayoutVertical(layout))
  );
}

export class DefaultNodeRenderer<Datum extends ConcreteDatum> {
  constructor(private chart: OrgChart<Datum>) {}

  expandToggleClick = new Subject<HierarchyNode<Datum>>();

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
      (enter) => enter.append('g').attr('class', 'default-node-wrapper'),
      (update) => update,
      (exit) => exit.remove()
    );

    // Add foreignObject element inside rectangle
    containerSelection
      .patternify({
        tag: 'foreignObject',
        className: 'node-foreign-object',
        data: (d) => [d],
      })
      .style('overflow', 'visible')
      .style('background', nodeBackground)
      .style('border-radius', '3px')
      .attr('width', (d) => this.chart.getNodeRect(d).width)
      .attr('height', (d) => this.chart.getNodeRect(d).height)
      .attr('x', 0)
      .attr('y', 0)

      .patternify({
        tag: 'xhtml:div' as 'div',
        className: 'node-foreign-object-div',
        data: (d) => [d],
      })
      .style('width', '100%')
      .style('height', '100%')
      .html(function (d, i, arr) {
        return `<div style="padding:5px;font-size:10px;">Sample Node(id=${d.id}), override using <br/>
          <code>chart.nodeContent({data}=>{ <br/>
           &nbsp;&nbsp;&nbsp;&nbsp;return '' // Custom HTML <br/>
           })</code>
           <br/>
           Or check different <a href="https://github.com/bumbeishvili/org-chart#jump-to-examples" target="_blank">layout examples</a>
           </div>`;
      });

    containerSelection
      .selectAll<SVGGElement, HierarchyNode<Datum>>('.node-button-g')
      .data(
        (d) => (d.children || d._children ? [d] : []),
        (n) => attrs.nodeId(n.data)
      )
      .call(
        this.drawNodeExpandCollapseButton,
        attrs,
        (d) => this.chart.pagination.totalChildrenNumber.get(d)!
      );

    return containerSelection;
  };

  private drawNodeExpandCollapseButton = <TParent extends BaseType, TPDatum>(
    nodeContainer: Selection<
      SVGGElement,
      HierarchyNode<Datum>,
      TParent,
      TPDatum
    >,
    attrs: State<Datum>,
    getNodeTotalChildren: (node: Datum) => number
  ) => {
    const nodeButtonHeight = 40;
    const nodeButtonWidth = 40;
    const nodeButtonX = -nodeButtonWidth / 2;
    const nodeButtonY = -nodeButtonHeight / 2;

    nodeContainer
      .join(
        (enter) => enter.append('g').attr('class', 'node-button-g'),
        (update) => update,
        (exit) => exit.remove()
      )
      .style('cursor', 'pointer')
      .on('click', (event: PointerEvent, d) => {
        this.expandToggleClick.next(d);
      })
      .attr('transform', (node) => {
        const x = this.chart
          .getLayoutBinding()
          .buttonX(this.chart.getNodeRect(node));
        const y = this.chart
          .getLayoutBinding()
          .buttonY(this.chart.getNodeRect(node));
        return `translate(${x},${y})`;
      })

      .patternify({
        tag: 'foreignObject',
        className: 'node-button-foreign-object',
        data: (d) => [d],
      })
      .attr('width', (d) => nodeButtonWidth)
      .attr('height', (d) => nodeButtonHeight)
      .attr('x', (d) => nodeButtonX)
      .attr('y', (d) => nodeButtonY)
      .style('overflow', 'visible')

      .patternify({
        tag: 'xhtml:div' as 'div',
        className: 'node-button-div',
        data: (d) => [d],
      })
      .style('display', 'flex')
      .style('width', '100%')
      .style('height', '100%')
      .html((node) => {
        return buttonContent(
          attrs.nodeGetIsExpanded(node.data),
          attrs.layout,
          getNodeTotalChildren(node.data)
        );
      });
  };
}
