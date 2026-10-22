import * as React from "react";
globalThis.React = React;
import { register } from "tsx/esm/api";
import { fileURLToPath } from "node:url";
register({tsconfig:fileURLToPath(new URL("../tsconfig.json",import.meta.url))});
import { JSDOM } from "jsdom";
const dom = new JSDOM('<!doctype html><html lang="en"><head><title>Workspace test</title></head><body></body></html>',{url:'http://localhost/',pretendToBeVisual:true});
for (const key of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver','getComputedStyle','localStorage','Event','CustomEvent','NodeFilter','HTMLSelectElement','MouseEvent','KeyboardEvent','HTMLInputElement','HTMLTextAreaElement']) {
 Object.defineProperty(globalThis,key,{value:key==='getComputedStyle'?dom.window.getComputedStyle.bind(dom.window):dom.window[key],configurable:true,writable:true});
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = query => ({matches:query.includes('1024'),media:query,addEventListener(){},removeEventListener(){}});
