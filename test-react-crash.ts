import { JSDOM } from 'jsdom';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useStore } from './src/store/useStore.ts';
import * as fabric from 'fabric';
import PropertyPanel from './src/components/PropertyPanel.tsx';

const dom = new JSDOM(`<!DOCTYPE html><html><body><canvas id="c"></canvas></body></html>`);
global.window = dom.window as any;
global.document = dom.window.document as any;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement as any;

try {
    const text = new fabric.Textbox('New Text', {
        width: 200,
        fontFamily: 'Inter',
        fontSize: 24,
        fill: '#000000',
    });

    useStore.setState({
        activeObject: text,
        canvas: new fabric.Canvas(dom.window.document.getElementById('c') as any) as any
    });

    console.log("Starting renderToString...");
    const html = renderToString(React.createElement(PropertyPanel));
    console.log("Render successful! Length:", html.length);
} catch (e) {
    console.error("REACT CRASH DETECTED:", e);
}
