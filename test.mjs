import * as fabric from 'fabric';

async function test() {
    const canvas = new fabric.Canvas(null, { width: 500, height: 500 });
    const tb = new fabric.Textbox('Hello', { width: 100, fontSize: 20 });
    console.log("Initial height:", tb.height);

    tb.set('height', 300);
    // Force recalculation?
    canvas.add(tb);
    console.log("After setting height:", tb.height);
}

test();
