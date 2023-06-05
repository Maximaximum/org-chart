import { ValueFn } from 'd3';
import { BaseType, selection, Selection } from 'd3-selection';

function patternify<
  GElement extends BaseType,
  Datum,
  PElement extends BaseType,
  PDatum,
  GPElement extends BaseType,
  GPDatum
>(
  this: Selection<PElement, PDatum, GPElement, GPDatum>,
  params: {
    selector: string;
    tag: any;
    data?: Datum[] | ValueFn<PElement, PDatum, Datum[] | Iterable<Datum>>;
  }
) {
  var container = this;
  var selector = params.selector;
  var elementTag = params.tag;
  var data = params.data || [selector];

  // Pattern in action
  var selection = container
    .selectAll<GElement, Datum | string>('.' + selector)
    .data(data as (Datum | string)[], (d, i) => {
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
}

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
