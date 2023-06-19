import { ValueFn } from "d3";
import { BaseType, selection, Selection } from "d3-selection";

function patternify<
  Datum,
  PElement extends BaseType,
  PDatum,
  GPElement extends BaseType,
  GPDatum,
  TTagName extends keyof ElementTagNameMap
>(
  this: Selection<PElement, PDatum, GPElement, GPDatum>,
  params: {
    className: string;
    tag: TTagName;
    data: Datum[] | ValueFn<PElement, PDatum, Datum[] | Iterable<Datum>>;
  }
): Selection<ElementTagNameMap[TTagName], Datum, PElement, PDatum>;

function patternify<
  Datum,
  PElement extends BaseType,
  PDatum,
  GPElement extends BaseType,
  GPDatum,
  TTagName extends keyof ElementTagNameMap
>(
  this: Selection<PElement, PDatum, GPElement, GPDatum>,
  params: {
    className: string;
    tag: TTagName;
  }
): Selection<ElementTagNameMap[TTagName], string, PElement, PDatum>;

function patternify<
  Datum,
  PElement extends BaseType,
  PDatum,
  GPElement extends BaseType,
  GPDatum,
  TTagName extends keyof ElementTagNameMap
>(
  this: Selection<PElement, PDatum, GPElement, GPDatum>,
  params: {
    className: string;
    tag: TTagName;
    data?: Datum[] | ValueFn<PElement, PDatum, Datum[] | Iterable<Datum>>;
  }
) {
  var container = this;
  var className = params.className;
  var elementTag = params.tag;
  var data = params.data || [className];

  // Pattern in action
  var selection = container
    .selectAll<ElementTagNameMap[TTagName], Datum | string>("." + className)
    .data(data as (Datum | string)[], (d, i) => {
      if (typeof d === "object") {
        if ((d as any).id) {
          return (d as any).id;
        }
      }
      return i;
    });

  return selection
    .join<ElementTagNameMap[TTagName], string | Datum>(elementTag)
    .attr("class", className);
}

selection.prototype.patternify = patternify;

declare module "d3-selection" {
  interface Selection<
    GElement extends BaseType,
    Datum,
    PElement extends BaseType,
    PDatum
  > {
    patternify: typeof patternify;
  }
}
