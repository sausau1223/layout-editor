import * as fabric from 'fabric';

const snappingDistance = 10;

export const initAligningGuidelines = (canvas: fabric.Canvas) => {
    const aligningLineOffset = 5;
    const aligningLineWidth = 1;
    const aligningLineColor = 'rgb(255,0,0)';
    let viewportTransform: number[] | undefined;
    let zoom = 1;

    let verticalLines: { x: number, y1: number, y2: number }[] = [];
    let horizontalLines: { y: number, x1: number, x2: number }[] = [];

    canvas.on('mouse:down', () => {
        viewportTransform = canvas.viewportTransform;
        zoom = canvas.getZoom();
    });

    canvas.on('object:moving', (e) => {
        const activeObject = e.target;
        const canvasObjects = canvas.getObjects();
        const activeObjectCenter = activeObject.getCenterPoint();
        const activeObjectBoundingRect = activeObject.getBoundingRect();
        const activeObjectHeight = activeObjectBoundingRect.height / viewportTransform![3];
        const activeObjectWidth = activeObjectBoundingRect.width / viewportTransform![0];
        let horizontalInTheRange = false;
        let verticalInTheRange = false;
        const transform = canvas._currentTransform;

        if (!transform) return;

        // It should be trivial to DRY this up by encapsulating (object and canvas)
        // alignment checks into separate functions.
        verticalLines = [];
        horizontalLines = [];

        canvasObjects.forEach((obj) => {
            if (obj === activeObject || !obj.visible) return;

            const objectCenter = obj.getCenterPoint();
            const objectBoundingRect = obj.getBoundingRect();
            const objectHeight = objectBoundingRect.height / viewportTransform![3];
            const objectWidth = objectBoundingRect.width / viewportTransform![0];

            // Snap to objects
            // center to center X
            if (Math.abs(objectCenter.x - activeObjectCenter.x) < snappingDistance) {
                verticalInTheRange = true;
                verticalLines.push({
                    x: objectCenter.x,
                    y1: (objectCenter.y < activeObjectCenter.y)
                        ? (objectCenter.y - objectHeight / 2 - aligningLineOffset)
                        : (objectCenter.y + objectHeight / 2 + aligningLineOffset),
                    y2: (activeObjectCenter.y > objectCenter.y)
                        ? (activeObjectCenter.y + activeObjectHeight / 2 + aligningLineOffset)
                        : (activeObjectCenter.y - activeObjectHeight / 2 - aligningLineOffset)
                });
                activeObject.setPositionByOrigin(new fabric.Point(objectCenter.x, activeObjectCenter.y), 'center', 'center');
            }

            // center to center Y
            if (Math.abs(objectCenter.y - activeObjectCenter.y) < snappingDistance) {
                horizontalInTheRange = true;
                horizontalLines.push({
                    y: objectCenter.y,
                    x1: (objectCenter.x < activeObjectCenter.x)
                        ? (objectCenter.x - objectWidth / 2 - aligningLineOffset)
                        : (objectCenter.x + objectWidth / 2 + aligningLineOffset),
                    x2: (activeObjectCenter.x > objectCenter.x)
                        ? (activeObjectCenter.x + activeObjectWidth / 2 + aligningLineOffset)
                        : (activeObjectCenter.x - activeObjectWidth / 2 - aligningLineOffset)
                });
                activeObject.setPositionByOrigin(new fabric.Point(activeObjectCenter.x, objectCenter.y), 'center', 'center');
            }
        });

        // Snap to center of canvas
        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();
        const canvasCenterX = canvasWidth / 2 / zoom;
        const canvasCenterY = canvasHeight / 2 / zoom;

        if (Math.abs(canvasCenterX - activeObjectCenter.x) < snappingDistance) {
            verticalInTheRange = true;
            verticalLines.push({
                x: canvasCenterX,
                y1: 0,
                y2: canvasHeight / zoom
            });
            activeObject.setPositionByOrigin(new fabric.Point(canvasCenterX, activeObjectCenter.y), 'center', 'center');
        }

        if (Math.abs(canvasCenterY - activeObjectCenter.y) < snappingDistance) {
            horizontalInTheRange = true;
            horizontalLines.push({
                y: canvasCenterY,
                x1: 0,
                x2: canvasWidth / zoom
            });
            activeObject.setPositionByOrigin(new fabric.Point(activeObjectCenter.x, canvasCenterY), 'center', 'center');
        }


        if (!horizontalInTheRange) {
            horizontalLines = [];
        }

        if (!verticalInTheRange) {
            verticalLines = [];
        }
    });

    canvas.on('before:render', () => {
        canvas.clearContext(canvas.contextTop);
    });

    // We use after:render to draw the lines over the top of the existing canvas rendering
    canvas.on('after:render', () => {
        if (verticalLines.length > 0 || horizontalLines.length > 0) {
            const ctx = canvas.contextTop;
            const originalTransform = ctx.getTransform();

            // Apply zoom/pan transformation before drawing lines
            const vpt = canvas.viewportTransform;
            if (vpt) {
                ctx.setTransform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
            }

            ctx.save();
            ctx.lineWidth = aligningLineWidth / zoom;
            ctx.strokeStyle = aligningLineColor;

            verticalLines.forEach((line) => {
                ctx.beginPath();
                ctx.moveTo(line.x, line.y1);
                ctx.lineTo(line.x, line.y2);
                ctx.stroke();
            });

            horizontalLines.forEach((line) => {
                ctx.beginPath();
                ctx.moveTo(line.x1, line.y);
                ctx.lineTo(line.x2, line.y);
                ctx.stroke();
            });

            ctx.restore();
            // Restore Original Transform
            ctx.setTransform(originalTransform);
        }
    });

    canvas.on('mouse:up', () => {
        verticalLines = [];
        horizontalLines = [];
        canvas.requestRenderAll();
    });
};
