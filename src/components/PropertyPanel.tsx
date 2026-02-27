import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Trash2, MoveUp, MoveDown, ChevronsUp, ChevronsDown, Lock, Unlock, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import * as fabric from 'fabric';

const PropertyPanel: React.FC = () => {
    const { activeObject, canvas, setActiveObject } = useStore();
    const [, setUpdater] = useState(0);

    // Force re-render when object properties change
    useEffect(() => {
        if (canvas) {
            const handleModified = () => setUpdater(prev => prev + 1);
            canvas.on('object:modified', handleModified);
            canvas.on('selection:changed', handleModified);

            // For text inline formatting selection updates
            const handleSelectionChanged = () => {
                if (activeObject && (activeObject as any).isEditing) {
                    lastSelectionRef.current = {
                        start: (activeObject as any).selectionStart,
                        end: (activeObject as any).selectionEnd
                    };
                }
                handleModified();
            };

            if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'text' || activeObject.type === 'textbox')) {
                activeObject.on('selection:changed', handleSelectionChanged);
            }

            return () => {
                canvas.off('object:modified', handleModified);
                canvas.off('selection:changed', handleModified);
                if (activeObject) {
                    activeObject.off('selection:changed', handleSelectionChanged);
                }
            };
        }
    }, [canvas, activeObject]);

    if (!activeObject) {
        return (
            <div className="glass-panel" style={{ width: 280, padding: 16, borderLeft: '1px solid var(--panel-border)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                    No element selected
                </p>
            </div>
        );
    }

    const isText = activeObject.type === 'i-text' || activeObject.type === 'text' || activeObject.type === 'textbox';
    const isImage = activeObject.type === 'image';

    const lastSelectionRef = useRef<{ start: number, end: number } | null>(null);

    // Reset selection memory when changing objects to prevent out-of-bounds crash on new or shorter objects
    useEffect(() => {
        lastSelectionRef.current = null;
    }, [activeObject]);

    const updateProp = (key: string, value: any) => {
        if (!canvas || !activeObject) return;

        // Handle inline text styling if currently editing and text is selected
        const objAsText = activeObject as any;

        // During a click on the property panel, isEditing might briefly become false,
        // so we check if there's a valid selection range instead of strictly checking isEditing.
        let sStart = objAsText.selectionStart;
        let sEnd = objAsText.selectionEnd;

        // Retain selection if the user clicked an input and lost focus on the canvas
        if ((sStart === undefined || sStart === sEnd) && lastSelectionRef.current) {
            sStart = lastSelectionRef.current.start;
            sEnd = lastSelectionRef.current.end;
        }

        const textLen = objAsText.text ? objAsText.text.length : 0;

        if (
            (activeObject.type === 'i-text' || activeObject.type === 'text' || activeObject.type === 'textbox') &&
            sStart !== undefined &&
            sEnd !== undefined &&
            sStart !== sEnd &&
            sStart < textLen // Prevent out of bounds crash
        ) {
            // Apply style only to the selected portion by temporarily overriding the hidden selection state
            const origStart = objAsText.selectionStart;
            const origEnd = objAsText.selectionEnd;
            objAsText.selectionStart = sStart;
            objAsText.selectionEnd = sEnd;

            objAsText.setSelectionStyles({ [key]: value });

            // Restore actual selection state to avoid corrupting internal behavior
            objAsText.selectionStart = origStart;
            objAsText.selectionEnd = origEnd;

            activeObject.setCoords();
            canvas.requestRenderAll();
            canvas.fire('object:modified', { target: activeObject });
            setUpdater(prev => prev + 1);
            return;
        }

        // Default behavior: apply to the whole object
        activeObject.set(key, value);
        activeObject.setCoords();
        canvas.requestRenderAll();

        // Fire event to ensure history captures this change immediately when using external inputs
        canvas.fire('object:modified', { target: activeObject });
        setUpdater(prev => prev + 1); // trigger local re-render
    };

    const getStyleValue = (key: string) => {
        if (!activeObject) return undefined;
        const objAsText = activeObject as any;

        let sStart = objAsText.selectionStart;
        if (sStart === undefined || sStart === objAsText.selectionEnd) {
            if (lastSelectionRef.current) {
                sStart = lastSelectionRef.current.start;
            }
        }

        const textLen = objAsText.text ? objAsText.text.length : 0;

        if (
            (activeObject.type === 'i-text' || activeObject.type === 'text' || activeObject.type === 'textbox') &&
            sStart !== undefined && sStart !== null &&
            sStart < textLen // Prevent out of bounds crash during render
        ) {
            // Get the style of the first selected character or current cursor position
            const style = objAsText.getSelectionStyles(sStart, sStart + 1) || [];
            if (style.length > 0 && style[0][key] !== undefined) {
                return style[0][key];
            }
        }

        // Fallback to object property
        return activeObject.get(key);
    };

    const deleteObject = () => {
        if (!canvas || !activeObject) return;
        canvas.remove(activeObject);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        setActiveObject(null);
        // Fire event to trigger auto-save in CanvasArea
        canvas.fire('object:modified');
        setUpdater(prev => prev + 1);
    };

    const toggleLock = () => {
        if (!canvas || !activeObject) return;
        const isCurrentlyLocked = activeObject.lockMovementX;
        activeObject.set({
            lockMovementX: !isCurrentlyLocked,
            lockMovementY: !isCurrentlyLocked,
            lockRotation: !isCurrentlyLocked,
            lockScalingX: !isCurrentlyLocked,
            lockScalingY: !isCurrentlyLocked,
            hasControls: isCurrentlyLocked // hide resize handles when locked
        });
        canvas.requestRenderAll();
        canvas.fire('object:modified', { target: activeObject });
        setUpdater(prev => prev + 1);
    };

    const isLocked = activeObject?.lockMovementX || false;

    const handleLayerChange = (action: 'forward' | 'backward' | 'front' | 'back') => {
        if (!canvas || !activeObject) return;

        // In Fabric v7 with preserveObjectStacking = true, standard methods might fail to visually update.
        // We calculate the object's current position to manipulate the index directly.
        const objects = canvas.getObjects();
        const currentIndex = objects.indexOf(activeObject);
        if (currentIndex === -1) return;

        let newIndex = currentIndex;
        if (action === 'forward' && currentIndex < objects.length - 1) {
            newIndex = currentIndex + 1;
        } else if (action === 'backward' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        } else if (action === 'front') {
            newIndex = objects.length - 1;
        } else if (action === 'back') {
            newIndex = 0;
        }

        if (newIndex !== currentIndex && canvas.moveObjectTo) {
            canvas.moveObjectTo(activeObject, newIndex);
        } else {
            // Fallback for older/newer Fabric methods if moveObjectTo is missing
            if (action === 'forward') activeObject.bringForward();
            if (action === 'backward') activeObject.sendBackwards();
            if (action === 'front') activeObject.bringToFront();
            if (action === 'back') activeObject.sendToBack();
        }

        canvas.requestRenderAll();

        // Fire event to trigger auto-save in CanvasArea
        canvas.fire('object:modified', { target: activeObject });
        setUpdater(prev => prev + 1);
    };

    const applyFilter = (type: 'brightness' | 'contrast' | 'grayscale', value?: number | boolean, commitHistory: boolean = true) => {
        if (!canvas || !activeObject || activeObject.type !== 'image') return;
        const img = activeObject as fabric.Image;

        // Initialize filters array if not present
        if (!img.filters) {
            img.filters = [];
        }

        // Remove existing filter of this type
        const existingFilterIndex = img.filters.findIndex(f => {
            if (type === 'brightness') return f instanceof fabric.filters.Brightness;
            if (type === 'contrast') return f instanceof fabric.filters.Contrast;
            if (type === 'grayscale') return f instanceof fabric.filters.Grayscale;
            return false;
        });

        if (existingFilterIndex > -1) {
            img.filters.splice(existingFilterIndex, 1);
        }

        // Add new filter if value requires it
        if (type === 'brightness' && typeof value === 'number' && value !== 0) {
            img.filters.push(new fabric.filters.Brightness({ brightness: value }));
        } else if (type === 'contrast' && typeof value === 'number' && value !== 0) {
            img.filters.push(new fabric.filters.Contrast({ contrast: value }));
        } else if (type === 'grayscale' && value === true) {
            img.filters.push(new fabric.filters.Grayscale());
        }

        img.applyFilters();
        canvas.requestRenderAll();

        if (commitHistory) {
            canvas.fire('object:modified', { target: img });
        }
        setUpdater(prev => prev + 1);
    };

    // Helper functions to get current filter values
    const getFilterValue = (type: 'brightness' | 'contrast' | 'grayscale') => {
        if (!activeObject || activeObject.type !== 'image') return type === 'grayscale' ? false : 0;
        const img = activeObject as fabric.Image;
        const filter = img.filters?.find(f => {
            if (type === 'brightness') return f instanceof fabric.filters.Brightness;
            if (type === 'contrast') return f instanceof fabric.filters.Contrast;
            if (type === 'grayscale') return f instanceof fabric.filters.Grayscale;
            return false;
        });

        if (!filter) return type === 'grayscale' ? false : 0;
        if (type === 'brightness') return (filter as fabric.filters.Brightness).brightness;
        if (type === 'contrast') return (filter as fabric.filters.Contrast).contrast;
        if (type === 'grayscale') return true;
        return 0;
    };

    return (
        <div
            className="glass-panel"
            style={{
                width: 280,
                display: 'flex',
                flexDirection: 'column',
                padding: 16,
                borderLeft: '1px solid var(--panel-border)',
                overflowY: 'auto'
            }}
            onMouseDown={e => {
                // Prevent canvas text editor from losing focus when clicking buttons on the panel
                if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'SELECT') {
                    e.preventDefault();
                }
            }}
        >
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--panel-border)', paddingBottom: 8 }}>
                Properties
            </h3>

            <div className="prop-group">
                <label>Geometry</label>
                <div className="prop-row">
                    <div className="prop-col">
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>X</span>
                        <input
                            type="number"
                            value={Math.round(activeObject.left || 0)}
                            onChange={e => updateProp('left', parseInt(e.target.value))}
                        />
                    </div>
                    <div className="prop-col">
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Y</span>
                        <input
                            type="number"
                            value={Math.round(activeObject.top || 0)}
                            onChange={e => updateProp('top', parseInt(e.target.value))}
                        />
                    </div>
                </div>
                <div className="prop-row">
                    <div className="prop-col">
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Width</span>
                        <input
                            type="number"
                            value={Math.round((activeObject.width || 0) * (activeObject.scaleX || 1))}
                            onChange={e => {
                                const w = parseInt(e.target.value);
                                updateProp('scaleX', w / activeObject.width);
                            }}
                        />
                    </div>
                    <div className="prop-col">
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Height</span>
                        <input
                            type="number"
                            value={Math.round((activeObject.height || 0) * (activeObject.scaleY || 1))}
                            onChange={e => {
                                const h = parseInt(e.target.value);
                                updateProp('scaleY', h / activeObject.height);
                            }}
                        />
                    </div>
                </div>
                <div className="prop-row">
                    <div className="prop-col">
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Rotation</span>
                        <input
                            type="number"
                            value={Math.round(activeObject.angle || 0)}
                            onChange={e => updateProp('angle', parseInt(e.target.value))}
                        />
                    </div>
                    <div className="prop-col">
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Opacity</span>
                        <input
                            type="number"
                            min="0" max="1" step="0.1"
                            value={activeObject.opacity ?? 1}
                            onChange={e => updateProp('opacity', parseFloat(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            <div className="prop-group">
                <label>Layer Order</label>
                <div className="prop-row" style={{ gap: 8 }}>
                    <button
                        style={{ flex: 1, border: '1px solid var(--panel-border)' }}
                        onClick={() => handleLayerChange('front')}
                        title="Bring to Front"
                    >
                        <ChevronsUp size={16} />
                    </button>
                    <button
                        style={{ flex: 1, border: '1px solid var(--panel-border)' }}
                        onClick={() => handleLayerChange('forward')}
                        title="Bring Forward"
                    >
                        <MoveUp size={16} />
                    </button>
                    <button
                        style={{ flex: 1, border: '1px solid var(--panel-border)' }}
                        onClick={() => handleLayerChange('backward')}
                        title="Send Backward"
                    >
                        <MoveDown size={16} />
                    </button>
                    <button
                        style={{ flex: 1, border: '1px solid var(--panel-border)' }}
                        onClick={() => handleLayerChange('back')}
                        title="Send to Back"
                    >
                        <ChevronsDown size={16} />
                    </button>
                </div>
            </div>

            {isText && (
                <div className="prop-group">
                    <label>Text Layout</label>
                    <div className="prop-row">
                        <select
                            value={getStyleValue('fontFamily') as string || 'Inter'}
                            onChange={e => updateProp('fontFamily', e.target.value)}
                            style={{ flex: 1 }}
                        >
                            <option value="Inter">Inter</option>
                            <option value="Arial">Arial</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Courier New">Courier New</option>
                        </select>
                    </div>

                    <div className="prop-row" style={{ gap: 4 }}>
                        <button
                            style={{ flex: 1, padding: 4, background: getStyleValue('fontWeight') === 'bold' ? 'var(--accent-color)' : 'transparent', color: getStyleValue('fontWeight') === 'bold' ? 'white' : 'inherit', border: '1px solid var(--panel-border)' }}
                            onClick={() => updateProp('fontWeight', getStyleValue('fontWeight') === 'bold' ? 'normal' : 'bold')}
                            title="Bold"
                        >
                            <Bold size={16} />
                        </button>
                        <button
                            style={{ flex: 1, padding: 4, background: getStyleValue('fontStyle') === 'italic' ? 'var(--accent-color)' : 'transparent', color: getStyleValue('fontStyle') === 'italic' ? 'white' : 'inherit', border: '1px solid var(--panel-border)' }}
                            onClick={() => updateProp('fontStyle', getStyleValue('fontStyle') === 'italic' ? 'normal' : 'italic')}
                            title="Italic"
                        >
                            <Italic size={16} />
                        </button>
                        <button
                            style={{ flex: 1, padding: 4, background: getStyleValue('underline') ? 'var(--accent-color)' : 'transparent', color: getStyleValue('underline') ? 'white' : 'inherit', border: '1px solid var(--panel-border)' }}
                            onClick={() => updateProp('underline', !getStyleValue('underline'))}
                            title="Underline"
                        >
                            <Underline size={16} />
                        </button>
                        <button
                            style={{ flex: 1, padding: 4, background: getStyleValue('linethrough') ? 'var(--accent-color)' : 'transparent', color: getStyleValue('linethrough') ? 'white' : 'inherit', border: '1px solid var(--panel-border)' }}
                            onClick={() => updateProp('linethrough', !getStyleValue('linethrough'))}
                            title="Strikethrough"
                        >
                            <Strikethrough size={16} />
                        </button>
                    </div>

                    <div className="prop-row" style={{ gap: 4 }}>
                        <button
                            style={{ flex: 1, padding: 4, background: activeObject.textAlign === 'left' || !activeObject.textAlign ? 'var(--bg-tertiary)' : 'transparent', border: '1px solid var(--panel-border)' }}
                            onClick={() => updateProp('textAlign', 'left')}
                            title="Align Left"
                        >
                            <AlignLeft size={16} />
                        </button>
                        <button
                            style={{ flex: 1, padding: 4, background: activeObject.textAlign === 'center' ? 'var(--bg-tertiary)' : 'transparent', border: '1px solid var(--panel-border)' }}
                            onClick={() => updateProp('textAlign', 'center')}
                            title="Align Center"
                        >
                            <AlignCenter size={16} />
                        </button>
                        <button
                            style={{ flex: 1, padding: 4, background: activeObject.textAlign === 'right' ? 'var(--bg-tertiary)' : 'transparent', border: '1px solid var(--panel-border)' }}
                            onClick={() => updateProp('textAlign', 'right')}
                            title="Align Right"
                        >
                            <AlignRight size={16} />
                        </button>
                        <button
                            style={{ flex: 1, padding: 4, background: activeObject.textAlign === 'justify' ? 'var(--bg-tertiary)' : 'transparent', border: '1px solid var(--panel-border)' }}
                            onClick={() => updateProp('textAlign', 'justify')}
                            title="Justify"
                        >
                            <AlignJustify size={16} />
                        </button>
                    </div>

                    <div className="prop-row">
                        <div className="prop-col" style={{ flex: 1 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Size</span>
                            <input
                                type="number"
                                value={getStyleValue('fontSize') as number || 24}
                                onChange={e => updateProp('fontSize', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="prop-col" style={{ flex: 1 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Line Heigth</span>
                            <select
                                value={(getStyleValue('lineHeight') as number) || 1.16}
                                onChange={e => updateProp('lineHeight', parseFloat(e.target.value))}
                            >
                                <option value="1">1.0</option>
                                <option value="1.16">Default</option>
                                <option value="1.5">1.5</option>
                                <option value="2">2.0</option>
                            </select>
                        </div>
                    </div>

                    <div className="prop-row" style={{ marginTop: 8 }}>
                        <div className="prop-col" style={{ flex: 1 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Text Color</span>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={getStyleValue('fill') as string || '#000000'}
                                    onChange={e => updateProp('fill', e.target.value)}
                                    style={{ flex: 1, height: 28, padding: 0, border: 'none', background: 'none' }}
                                />
                            </div>
                        </div>
                        <div className="prop-col" style={{ flex: 1 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Highlight</span>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <input
                                    type="color"
                                    value={getStyleValue('textBackgroundColor') as string || '#ffffff'}
                                    onChange={e => updateProp('textBackgroundColor', e.target.value)}
                                    style={{ flex: 1, height: 28, padding: 0, border: 'none', background: 'none' }}
                                />
                                <button
                                    style={{ padding: '0 8px', height: 28, fontSize: 11, border: '1px solid var(--panel-border)' }}
                                    onClick={() => updateProp('textBackgroundColor', null)}
                                    title="Clear Highlight"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isImage && (
                <div className="prop-group">
                    <label>Image Filters</label>
                    <div className="prop-row" style={{ flexDirection: 'column', gap: 12 }}>
                        <div className="prop-col" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Brightness</span>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{Math.round((getFilterValue('brightness') as number) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="-1" max="1" step="0.05"
                                value={getFilterValue('brightness') as number}
                                onChange={e => applyFilter('brightness', parseFloat(e.target.value), false)}
                                onMouseUp={e => applyFilter('brightness', parseFloat((e.target as any).value), true)}
                                onTouchEnd={e => applyFilter('brightness', parseFloat((e.target as any).value), true)}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="prop-col" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Contrast</span>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{Math.round((getFilterValue('contrast') as number) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="-1" max="1" step="0.05"
                                value={getFilterValue('contrast') as number}
                                onChange={e => applyFilter('contrast', parseFloat(e.target.value), false)}
                                onMouseUp={e => applyFilter('contrast', parseFloat((e.target as any).value), true)}
                                onTouchEnd={e => applyFilter('contrast', parseFloat((e.target as any).value), true)}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="prop-row" style={{ alignItems: 'center', marginTop: 8 }}>
                            <input
                                type="checkbox"
                                id="grayscale-check"
                                checked={getFilterValue('grayscale') as boolean}
                                onChange={e => applyFilter('grayscale', e.target.checked)}
                                style={{ marginRight: 8, cursor: 'pointer' }}
                            />
                            <label htmlFor="grayscale-check" style={{ fontSize: 12, cursor: 'pointer', marginBottom: 0 }}>
                                Grayscale (Black & White)
                            </label>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', gap: 8 }}>
                <button
                    style={{ flex: 1, color: isLocked ? 'var(--accent-color)' : 'var(--text-primary)', border: `1px solid ${isLocked ? 'var(--accent-color)' : 'var(--panel-border)'}` }}
                    onClick={toggleLock}
                >
                    {isLocked ? <Lock size={16} style={{ marginRight: 8 }} /> : <Unlock size={16} style={{ marginRight: 8 }} />}
                    {isLocked ? 'Unlock' : 'Lock'}
                </button>
                <button
                    style={{ flex: 1, color: 'var(--danger-color)', border: '1px solid var(--danger-color)' }}
                    onClick={deleteObject}
                >
                    <Trash2 size={16} style={{ marginRight: 8 }} />
                    Delete
                </button>
            </div>
        </div>
    );
};

export default PropertyPanel;
