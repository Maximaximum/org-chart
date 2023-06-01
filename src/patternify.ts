import { BaseType, selection, Selection } from 'd3-selection';

const patternify = function <
  GElement extends BaseType,
  Datum,
  PElement extends BaseType,
  PDatum,
  TData extends any[] | null | undefined
>(
  this: Selection<GElement, Datum, PElement, PDatum>,
  params: {
    selector: string;
    tag: any;
    data?: TData;
  }
) {
  var container = this;
  var selector = params.selector;
  var elementTag = params.tag;
  var data = params.data || [selector];

  // Pattern in action
  var selection = container
    .selectAll('.' + selector)
    .data(data, (d, i: any) => {
      if (typeof d === 'object') {
        if ((d as any).id) {
          return (d as any).id;
        }
      }
      return i;
    });
  selection.exit().remove();
  selection = selection.enter().append(elementTag).merge(selection);
  selection.attr('class', selector);
  return selection;
};

selection.prototype.patternify = patternify;

declare module 'd3-selection' {
  interface Selection<
    GElement extends BaseType,
    Datum,
    PElement extends BaseType,
    PDatum
  > {
    patternify: typeof patternify;
  }
}
