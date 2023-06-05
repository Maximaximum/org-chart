import { HierarchyNode } from './d3-org-chart.types';

export function defaultNodeContent<Datum>(d: HierarchyNode<Datum>) {
  return `<div style="padding:5px;font-size:10px;">Sample Node(id=${d.id}), override using <br/>
          <code>chart.nodeContent({data}=>{ <br/>
           &nbsp;&nbsp;&nbsp;&nbsp;return '' // Custom HTML <br/>
           })</code>
           <br/>
           Or check different <a href="https://github.com/bumbeishvili/org-chart#jump-to-examples" target="_blank">layout examples</a>
           </div>`;
}
