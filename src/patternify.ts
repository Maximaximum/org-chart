import { ValueFn } from 'd3';
import { BaseType, selection, Selection } from 'd3-selection';

function patternify<
  TTagName extends keyof ElementTagNameMap,
  Datum,
  PElement extends BaseType,
  PDatum,
  GPElement extends BaseType,
  GPDatum
>(
  this: Selection<PElement, PDatum, GPElement, GPDatum>,
  params: {
    className: string;
    tag: TTagName;
    data: Datum[] | ValueFn<PElement, PDatum, Datum[] | Iterable<Datum>>;
  }
): Selection<ElementTagNameMap[TTagName], Datum, PElement, PDatum>;

function patternify<
  TTagName extends keyof ElementTagNameMap,
  Datum,
  PElement extends BaseType,
  PDatum,
  GPElement extends BaseType,
  GPDatum
>(
  this: Selection<PElement, PDatum, GPElement, GPDatum>,
  params: {
    className: string;
    tag: TTagName;
  }
): Selection<ElementTagNameMap[TTagName], string, PElement, PDatum>;

function patternify<
  TTagName extends keyof ElementTagNameMap,
  Datum,
  PElement extends BaseType,
  PDatum,
  GPElement extends BaseType,
  GPDatum
>(
  this: Selection<PElement, PDatum, GPElement, GPDatum>,
  params: {
    className: string;
    tag: TTagName;
    data?: Datum[] | ValueFn<PElement, PDatum, Datum[] | Iterable<Datum>>;
  }
) {
  const container = this;
  const className = params.className;
  const elementTag = params.tag;
  const data = params.data || [className];

  // Pattern in action
  const selection = container
    .selectAll<ElementTagNameMap[TTagName], Datum | string>('.' + className)
    .data(data as (Datum | string)[], (d, i) => {
      if (typeof d === 'object') {
        if ((d as any).id) {
          return (d as any).id;
        }
      }
      return i;
    });

  return selection.join<ElementTagNameMap[TTagName], string | Datum>(
    (enter) => enter.append(elementTag).attr('class', className),
    (update) => update,
    (exit) => exit.remove()
  );
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
