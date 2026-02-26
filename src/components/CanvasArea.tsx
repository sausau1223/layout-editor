import React, { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import localforage from 'localforage';
import { useStore } from '../store/useStore';
import { initAligningGuidelines, applyTextboxRules } from '../utils/snapping';

const CanvasArea: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { setCanvas, setActiveObject, zoom, workspaceSize, toolMode } = useStore();

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        const initCanvas = new fabric.Canvas(canvasRef.current, {
            width: workspaceSize.width,
            height: workspaceSize.height,
            backgroundColor: '#ffffff',
            preserveObjectStacking: true
        });

        setCanvas(initCanvas);
        initAligningGuidelines(initCanvas);

        initCanvas.on('selection:created', () => setActiveObject(initCanvas.getActiveObject()));
        initCanvas.on('selection:updated', () => setActiveObject(initCanvas.getActiveObject()));
        initCanvas.on('selection:cleared', () => setActiveObject(null));
        initCanvas.on('object:modified', () => {
            setActiveObject(initCanvas.getActiveObject());
            saveToLocal(initCanvas);
        });

        // Global scaling interceptor to handle Word-style textbox resizing
        initCanvas.on('object:scaling', (e: any) => {
            const obj = e.target;
            if (obj && (obj.type === 'textbox' || obj.type === 'i-text')) {
                const scaleX = obj.scaleX || 1;
                const scaleY = obj.scaleY || 1;

                const newWidth = (obj.width || 200) * scaleX;
                const newHeight = (obj.height || 50) * scaleY;

                // Stop text from scaling visually by locking scale values
                // and assign the scaled height as minimumHeight for our custom patch
                obj.set({
                    width: newWidth,
                    minimumHeight: newHeight,
                    scaleX: 1,
                    scaleY: 1
                });
            }
        });

        // Removed ineffective object:added event

        initCanvas.on('mouse:down', (options) => {
            const currentMode = useStore.getState().toolMode;
            if (currentMode === 'text' && !options.target) {
                const pointer = initCanvas.getScenePoint(options.e);
                const text = new fabric.Textbox('New Text', {
                    left: pointer.x,
                    top: pointer.y,
                    width: 200, // Initial width to allow auto-wrapping when user types long texts
                    fontFamily: 'Inter',
                    fontSize: 24,
                    fill: '#000000',
                    editable: true,
                    // splitByGrapheme is natively supported by Textbox for CJK
                    id: crypto.randomUUID()
                } as any);

                initCanvas.add(text);
                applyTextboxRules(initCanvas);
                initCanvas.setActiveObject(text);
                initCanvas.requestRenderAll();
                saveToLocal(initCanvas);
                useStore.getState().setToolMode('select');
            }
        });

        const handleDrop = (e: any) => {
            e.preventDefault();
            const dt = e.dataTransfer;
            if (dt.files && dt.files.length > 0) {
                const file = dt.files[0];
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (f) => {
                        const data = f.target?.result as string;
                        const imgElement = document.createElement('img');
                        imgElement.src = data;
                        imgElement.onload = () => {
                            const img = new fabric.Image(imgElement, {
                                originX: 'center',
                                originY: 'center',
                                id: crypto.randomUUID()
                            } as any);

                            if (img.width && img.width > 500) {
                                img.scaleToWidth(500);
                            }

                            const pointer = initCanvas.getScenePoint(e);
                            img.set({ left: pointer.x, top: pointer.y });

                            initCanvas.add(img);
                            initCanvas.setActiveObject(img);
                            initCanvas.renderAll();
                            saveToLocal(initCanvas);
                        };
                    };
                    reader.readAsDataURL(file);
                }
            }
        };

        const container = containerRef.current;
        container.addEventListener('dragover', (e) => e.preventDefault());
        container.addEventListener('drop', handleDrop);

        // Load from localforage (IndexedDB)
        Promise.all([
            localforage.getItem('layout_editor_state_v2'),
            localforage.getItem('layout_editor_state') // For backwards compatibility
        ]).then(async ([savedV2, savedV1]) => {
            const stateObj = savedV2 as any;

            if (stateObj && stateObj.pages && Array.isArray(stateObj.pages)) {
                try {
                    const store = useStore.getState();
                    store.setHistoryRestoring(true);
                    store.setPages(stateObj.pages);
                    store.setCurrentPageIndex(stateObj.currentPageIndex || 0);

                    const activePageStr = stateObj.pages[stateObj.currentPageIndex || 0];
                    if (activePageStr) {
                        await initCanvas.loadFromJSON(activePageStr);
                        applyTextboxRules(initCanvas);
                    }
                    initCanvas.requestRenderAll();
                    store.setHistoryRestoring(false);
                    store.saveHistory(stateObj.pages, stateObj.currentPageIndex || 0);
                } catch (e) {
                    console.error('Error loading V2 canvas state:', e);
                    useStore.getState().setHistoryRestoring(false);
                }
            } else if (savedV1 && typeof savedV1 === 'string') {
                try {
                    // Migrate V1 to V2
                    const store = useStore.getState();
                    store.setHistoryRestoring(true);
                    const newPages = [savedV1];
                    store.setPages(newPages);
                    store.setCurrentPageIndex(0);

                    await initCanvas.loadFromJSON(savedV1);
                    applyTextboxRules(initCanvas);
                    initCanvas.requestRenderAll();
                    store.setHistoryRestoring(false);
                    store.saveHistory(newPages, 0);
                } catch (e) {
                    console.error('Error loading V1 canvas state:', e);
                    useStore.getState().setHistoryRestoring(false);
                }
            } else {
                // Completely blank new project
                const json = (initCanvas as any).toJSON(['id', 'minimumHeight']);
                const newPages = [JSON.stringify(json)];
                useStore.getState().setPages(newPages);
                useStore.getState().saveHistory(newPages, 0);
            }
        }).catch(err => console.error("Error fetching local state", err));

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const activeObjects = initCanvas.getActiveObjects();
                if (activeObjects && activeObjects.length > 0) {

                    // Don't delete if we are actively typing inside a text box
                    const activeObj = initCanvas.getActiveObject();
                    if (activeObj && activeObj.type === 'textbox' && (activeObj as any).isEditing) {
                        return;
                    }

                    // Don't trigger browser back navigation on backspace
                    if (e.key === 'Backspace') {
                        e.preventDefault();
                    }

                    activeObjects.forEach(obj => {
                        initCanvas.remove(obj);
                    });
                    initCanvas.discardActiveObject();
                    initCanvas.requestRenderAll();

                    // Trigger save
                    initCanvas.fire('object:modified', { target: activeObjects[0] });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            initCanvas.dispose();
            container.removeEventListener('dragover', (e) => e.preventDefault());
            container.removeEventListener('drop', handleDrop);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        const canvas = useStore.getState().canvas;
        if (canvas) {
            canvas.setZoom(zoom);
            canvas.setDimensions({
                width: workspaceSize.width * zoom,
                height: workspaceSize.height * zoom
            });
        }
    }, [zoom, workspaceSize]);

    useEffect(() => {
        const canvas = useStore.getState().canvas;
        if (canvas) {
            canvas.defaultCursor = toolMode === 'text' ? 'text' : 'default';
        }
    }, [toolMode]);

    const saveToLocal = async (canvas: any) => {
        const state = useStore.getState();
        if (state.isHistoryRestoring) return; // Prevent history loop

        try {
            const json = canvas.toJSON(['id', 'minimumHeight']);
            const stateString = JSON.stringify(json);

            const newPages = [...state.pages];
            newPages[state.currentPageIndex] = stateString;

            // update store pages directly without history triggering yet
            state.setPages(newPages);

            await localforage.setItem('layout_editor_state_v2', {
                pages: newPages,
                currentPageIndex: state.currentPageIndex
            });
            state.saveHistory(newPages, state.currentPageIndex);
        } catch (error) {
            console.error('Could not save to localforage.', error);
        }
    };

    return (
        <div
            ref={containerRef}
            style={{
                flex: 1,
                backgroundColor: 'var(--canvas-bg)',
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 40
            }}
        >
            <div
                style={{
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    background: 'white',
                    cursor: toolMode === 'text' ? 'text' : 'default'
                }}
            >
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
};

export default CanvasArea;
