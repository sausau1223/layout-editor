import React from 'react';
import { renderToString } from 'react-dom/server';
import { useStore } from './src/store/useStore';
import * as fabric from 'fabric';
import PropertyPanel from './src/components/PropertyPanel';
import { JSDOM } from 'jsdom';

// Setup DOM for Fabric
const dom = new JSDOM(`<!DOCTYPE html><html><body><canvas id="c"></canvas></body></html>`);
global.window = dom.window as any;
global.document = dom.window.document;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;

try {
    // 1. Create a dummy fabric Textbox
    const text = new fabric.Textbox('New Text', {
        width: 200,
        fontFamily: 'Inter',
        fontSize: 24,
        fill: '#000000',
    });

    // 2. Set the Zustand store state to simulate "Canvas clicked"
    useStore.setState({
        activeObject: text,
        canvas: new fabric.Canvas(dom.window.document.getElementById('c') as any) as any
    });

    // 3. Try to render the PropertyPanel completely
    console.log("Starting renderToString...");
    const html = renderToString(React.createElement(PropertyPanel));
    console.log("Render successful! Length:", html.length);

} catch (e) {
    console.error("REACT CRASH DETECTED:", e);
}
