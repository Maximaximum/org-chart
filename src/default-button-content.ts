import {
  ConcreteDatum,
  HierarchyNode,
  Layout,
  State,
} from "./d3-org-chart.types";
import { linkColor } from "./default-colors";

const arrowPaths: Record<Layout, string> = {
  top: '<path d="M11.457 8.07005L3.49199 16.4296C3.35903 16.569 3.28485 16.7543 3.28485 16.9471C3.28485 17.1398 3.35903 17.3251 3.49199 17.4646L3.50099 17.4736C3.56545 17.5414 3.64304 17.5954 3.72904 17.6324C3.81504 17.6693 3.90765 17.6883 4.00124 17.6883C4.09483 17.6883 4.18745 17.6693 4.27344 17.6324C4.35944 17.5954 4.43703 17.5414 4.50149 17.4736L12.0015 9.60155L19.4985 17.4736C19.563 17.5414 19.6405 17.5954 19.7265 17.6324C19.8125 17.6693 19.9052 17.6883 19.9987 17.6883C20.0923 17.6883 20.1849 17.6693 20.2709 17.6324C20.3569 17.5954 20.4345 17.5414 20.499 17.4736L20.508 17.4646C20.641 17.3251 20.7151 17.1398 20.7151 16.9471C20.7151 16.7543 20.641 16.569 20.508 16.4296L12.543 8.07005C12.4729 7.99653 12.3887 7.93801 12.2954 7.89801C12.202 7.85802 12.1015 7.8374 12 7.8374C11.8984 7.8374 11.798 7.85802 11.7046 7.89801C11.6113 7.93801 11.527 7.99653 11.457 8.07005Z" fill="#716E7B" stroke="#716E7B"/>',
  bottom:
    '<path d="M19.497 7.98903L12 15.297L4.503 7.98903C4.36905 7.85819 4.18924 7.78495 4.002 7.78495C3.81476 7.78495 3.63495 7.85819 3.501 7.98903C3.43614 8.05257 3.38462 8.12842 3.34944 8.21213C3.31427 8.29584 3.29615 8.38573 3.29615 8.47653C3.29615 8.56733 3.31427 8.65721 3.34944 8.74092C3.38462 8.82463 3.43614 8.90048 3.501 8.96403L11.4765 16.74C11.6166 16.8765 11.8044 16.953 12 16.953C12.1956 16.953 12.3834 16.8765 12.5235 16.74L20.499 8.96553C20.5643 8.90193 20.6162 8.8259 20.6517 8.74191C20.6871 8.65792 20.7054 8.56769 20.7054 8.47653C20.7054 8.38537 20.6871 8.29513 20.6517 8.21114C20.6162 8.12715 20.5643 8.05112 20.499 7.98753C20.3651 7.85669 20.1852 7.78345 19.998 7.78345C19.8108 7.78345 19.6309 7.85669 19.497 7.98753V7.98903Z" fill="#716E7B" stroke="#716E7B"/>',
  left: '<path d="M14.283 3.50094L6.51 11.4749C6.37348 11.615 6.29707 11.8029 6.29707 11.9984C6.29707 12.194 6.37348 12.3819 6.51 12.5219L14.283 20.4989C14.3466 20.5643 14.4226 20.6162 14.5066 20.6516C14.5906 20.6871 14.6808 20.7053 14.772 20.7053C14.8632 20.7053 14.9534 20.6871 15.0374 20.6516C15.1214 20.6162 15.1974 20.5643 15.261 20.4989C15.3918 20.365 15.4651 20.1852 15.4651 19.9979C15.4651 19.8107 15.3918 19.6309 15.261 19.4969L7.9515 11.9984L15.261 4.50144C15.3914 4.36756 15.4643 4.18807 15.4643 4.00119C15.4643 3.81431 15.3914 3.63482 15.261 3.50094C15.1974 3.43563 15.1214 3.38371 15.0374 3.34827C14.9534 3.31282 14.8632 3.29456 14.772 3.29456C14.6808 3.29456 14.5906 3.31282 14.5066 3.34827C14.4226 3.38371 14.3466 3.43563 14.283 3.50094V3.50094Z" fill="#716E7B" stroke="#716E7B"/>',
  right:
    '<path d="M7.989 3.49944C7.85817 3.63339 7.78492 3.8132 7.78492 4.00044C7.78492 4.18768 7.85817 4.36749 7.989 4.50144L15.2985 11.9999L7.989 19.4969C7.85817 19.6309 7.78492 19.8107 7.78492 19.9979C7.78492 20.1852 7.85817 20.365 7.989 20.4989C8.05259 20.5643 8.12863 20.6162 8.21261 20.6516C8.2966 20.6871 8.38684 20.7053 8.478 20.7053C8.56916 20.7053 8.6594 20.6871 8.74338 20.6516C8.82737 20.6162 8.90341 20.5643 8.967 20.4989L16.74 12.5234C16.8765 12.3834 16.9529 12.1955 16.9529 11.9999C16.9529 11.8044 16.8765 11.6165 16.74 11.4764L8.967 3.50094C8.90341 3.43563 8.82737 3.38371 8.74338 3.34827C8.6594 3.31282 8.56916 3.29456 8.478 3.29456C8.38684 3.29456 8.2966 3.31282 8.21261 3.34827C8.12863 3.38371 8.05259 3.43563 7.989 3.50094V3.49944Z" fill="#716E7B" stroke="#716E7B"/>',
};

function numChildrenSpan(
  _directSubordinatesPaging: number | undefined,
  addMargin: boolean
) {
  const margin = addMargin ? "margin-left:1px;" : "";
  return `<span style="${margin}color:#716E7B">${_directSubordinatesPaging} </span>`;
}

function getOppositeDirection(layout: Layout): Layout {
  switch (layout) {
    case "top":
      return "bottom";
    case "bottom":
      return "top";
    case "left":
      return "right";
    case "right":
      return "left";
  }
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

function isLayoutVertical(layout: Layout) {
  return layout === "bottom" || layout === "top";
}

export function defaultButtonContent<Datum extends ConcreteDatum>({
  node,
  state: { layout },
}: {
  node: HierarchyNode<Datum>;
  state: State<Datum>;
}) {
  return outerWrap(
    wrapIconPath(arrowPaths[getArrowDirection(layout, !node.children)]) +
      numChildrenSpan(
        node.data._directSubordinatesPaging,
        isLayoutVertical(layout)
      )
  );
}
