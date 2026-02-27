import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><html><body><canvas id="c"></canvas></body></html>`);
global.window = dom.window as any;
global.document = dom.window.document;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;

import * as fabric from 'fabric';

try {
    const text = new fabric.Textbox('New Text', {
        width: 200,
        fontFamily: 'Inter',
        fontSize: 24,
        fill: '#000000',
    });

    console.log("text._textLines:", text._textLines);

    console.log("Testing getSelectionStyles(-1, 0)");
    const style1 = text.getSelectionStyles(-1, 0);
    console.log("STYLE FETCHED:", style1);

    console.log("Testing getSelectionStyles(0, 1) when width is large");
    text.set('width', 1000);
    const style2 = text.getSelectionStyles(0, 1);
    console.log("STYLE FETCHED 2:", style2);

    console.log("Testing getSelectionStyles(10, 11)");
    const style3 = text.getSelectionStyles(10, 11);
    console.log("STYLE FETCHED 3:", style3);

} catch (e) {
    console.error("CRASH:", e);
}
