import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Undo, Redo, Download, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import jsPDF from 'jspdf';
import * as fabric from 'fabric';

const Toolbar: React.FC = () => {
    const { zoom, setZoom, canvas, history, historyIndex, undo, redo, pages } = useStore();
    const [isExporting, setIsExporting] = useState(false);

    const handleZoomIn = () => setZoom(Math.min(zoom + 0.25, 4));
    const handleZoomOut = () => setZoom(Math.max(zoom - 0.25, 0.25));

    const exportPDF = async () => {
        if (!canvas || pages.length === 0) return;
        setIsExporting(true);

        try {
            // A4 page dimensions mapped to pixels roughly in Editor (794x1123)
            const exportWidth = 794;
            const exportHeight = 1123;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [exportWidth, exportHeight]
            });

            // Create a temporary unseen canvas for rendering multiple pages
            const tempCanvasEl = document.createElement('canvas');
            const tempCanvas = new fabric.Canvas(tempCanvasEl, {
                width: exportWidth,
                height: exportHeight,
                backgroundColor: '#ffffff'
            });

            // Generate each page
            for (let i = 0; i < pages.length; i++) {
                const stateStr = pages[i];
                if (stateStr && stateStr !== '') {
                    await tempCanvas.loadFromJSON(stateStr);
                } else {
                    tempCanvas.clear();
                }

                // Ensure background is always white before rendering to JPEG, 
                // because loadFromJSON might override it with transparency (which turns black in JPEG)
                tempCanvas.backgroundColor = '#ffffff';
                tempCanvas.requestRenderAll();

                // Wait a tiny bit for images to be fully rendered in temp canvas
                await new Promise(resolve => setTimeout(resolve, 50));

                const imgData = tempCanvas.toDataURL({
                    format: 'jpeg',
                    quality: 0.95,
                    multiplier: 2 // Higher resolution for export
                });

                if (i > 0) {
                    pdf.addPage([exportWidth, exportHeight], 'portrait');
                }
                pdf.addImage(imgData, 'JPEG', 0, 0, exportWidth, exportHeight);
            }

            tempCanvas.dispose();

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            pdf.save(`Layout_Document_${timestamp}.pdf`);
        } catch (err) {
            console.error('Failed to export multi-page PDF', err);
            alert('PDF export failed. Check console for details.');
        } finally {
            setIsExporting(false);
        }
    };

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex >= 0 && historyIndex < history.length - 1;

    return (
        <div
            className="glass-panel"
            style={{
                height: 64,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                justifyContent: 'space-between',
                zIndex: 10
            }}
        >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <h2 style={{ marginRight: 24, fontSize: 18, fontWeight: 600 }}>Steven Layout Editor<span style={{ color: 'var(--accent-color)', fontSize: 12, marginLeft: 8 }}>v1.0</span></h2>

                <button
                    title="Undo"
                    onClick={undo}
                    disabled={!canUndo}
                    style={{ opacity: canUndo ? 1 : 0.5, cursor: canUndo ? 'pointer' : 'not-allowed' }}
                >
                    <Undo size={18} />
                </button>
                <button
                    title="Redo"
                    onClick={redo}
                    disabled={!canRedo}
                    style={{ opacity: canRedo ? 1 : 0.5, cursor: canRedo ? 'pointer' : 'not-allowed' }}
                >
                    <Redo size={18} />
                </button>

                <div style={{ width: 1, height: 24, background: 'var(--panel-border)', margin: '0 8px' }} />

                <button onClick={handleZoomOut} title="Zoom Out">
                    <ZoomOut size={18} />
                </button>
                <span style={{ fontSize: 13, minWidth: 48, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                <button onClick={handleZoomIn} title="Zoom In">
                    <ZoomIn size={18} />
                </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    className="primary"
                    onClick={exportPDF}
                    disabled={isExporting}
                    style={{ opacity: isExporting ? 0.7 : 1, cursor: isExporting ? 'wait' : 'pointer' }}
                >
                    {isExporting ? (
                        <Loader2 size={16} className="spin" style={{ marginRight: 8 }} />
                    ) : (
                        <Download size={16} style={{ marginRight: 8 }} />
                    )}
                    {isExporting ? 'Exporting...' : 'Export PDF'}
                </button>
            </div>
        </div>
    );
};

export default Toolbar;
