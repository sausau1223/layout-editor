import React, { useRef } from 'react';
import { Type, Image as ImageIcon, MousePointer2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import * as fabric from 'fabric';

const Sidebar: React.FC = () => {
    const { canvas, toolMode, setToolMode } = useStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleTextMode = () => {
        setToolMode(toolMode === 'text' ? 'select' : 'text');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!canvas || !e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        if (file.size > 20 * 1024 * 1024) {
            alert('Image size exceeds 20MB limit');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (f) => {
            const data = f.target?.result as string;

            // For Fabric v7, Image.fromURL might be deprecated or behaves differently.
            // A safer, more standard approach is creating an HTMLImageElement first.
            const imgElement = document.createElement('img');
            imgElement.src = data;
            imgElement.onload = () => {
                const img = new fabric.Image(imgElement, {
                    left: 100,
                    top: 100,
                    id: crypto.randomUUID()
                } as any);

                if (img.width && img.width > 500) {
                    img.scaleToWidth(500);
                }

                canvas.add(img);
                canvas.setActiveObject(img);
                canvas.requestRenderAll();
            };
        };
        reader.readAsDataURL(file);

        // Reset input and tool mode
        setToolMode('select');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div
            className="glass-panel responsive-sidebar"
            style={{
                width: 64,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px 0',
                gap: '16px',
                borderRight: '1px solid var(--panel-border)'
            }}
        >
            <button
                onClick={() => setToolMode('select')}
                className={toolMode === 'select' ? 'active' : ''}
                style={{ flexDirection: 'column', gap: 4, width: '90%' }}
                title="Select"
            >
                <MousePointer2 size={20} />
            </button>

            <button
                onClick={toggleTextMode}
                className={toolMode === 'text' ? 'active' : ''}
                style={{ flexDirection: 'column', gap: 4, width: '90%' }}
                title="Add Text"
            >
                <Type size={20} />
            </button>

            <button
                onClick={() => {
                    setToolMode('image');
                    fileInputRef.current?.click();
                }}
                className={toolMode === 'image' ? 'active' : ''}
                style={{ flexDirection: 'column', gap: 4, width: '90%' }}
                title="Add Image"
            >
                <ImageIcon size={20} />
            </button>
            <input
                type="file"
                accept="image/jpeg, image/png, image/gif, image/webp"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleImageUpload}
            />
        </div>
    );
};

export default Sidebar;
