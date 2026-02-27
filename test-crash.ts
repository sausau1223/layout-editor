import * as fabric from 'fabric';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><html><body><canvas id="c"></canvas></body></html>`);
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).HTMLCanvasElement = dom.window.HTMLCanvasElement;

const originalCalcTextHeight = (fabric.Textbox.prototype as any).calcTextHeight;
if (originalCalcTextHeight) {
    (fabric.Textbox.prototype as any).calcTextHeight = function (...args: any[]) {
        const textHeight = originalCalcTextHeight.apply(this, args);
        if (this.minimumHeight && textHeight < this.minimumHeight) {
            return this.minimumHeight;
        }
        return textHeight;
    };
}

try {
    const canvas = new fabric.Canvas(dom.window.document.getElementById('c') as any, { width: 500, height: 500 });
    const text = new fabric.Textbox('New Text', {
        left: 100,
        top: 100,
        width: 200,
        fontFamily: 'Inter',
        fontSize: 24,
        fill: '#000000',
    });
    canvas.add(text);
    console.log("Success");
} catch (e) {
    console.error("Error creating textbox:", e);
}
