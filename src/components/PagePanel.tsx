import React from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, FileText } from 'lucide-react';

const PagePanel: React.FC = () => {
    const { pages, currentPageIndex, addPage, deletePage, switchPage } = useStore();

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderBottom: '1px solid var(--panel-border)',
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(20px)',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
        }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', marginRight: '8px', display: 'flex', alignItems: 'center' }}>
                <FileText size={16} style={{ marginRight: '6px' }} />
                Pages
            </span>

            {pages.map((_, index) => (
                <div
                    key={index}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: currentPageIndex === index ? 'var(--accent-color)' : 'transparent',
                        color: currentPageIndex === index ? 'white' : 'var(--text-primary)',
                        padding: '4px 12px',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        border: `1px solid ${currentPageIndex === index ? 'var(--accent-color)' : 'var(--panel-border)'}`,
                        transition: 'all 0.2s',
                    }}
                    onClick={() => switchPage(index)}
                >
                    Page {index + 1}
                    {pages.length > 1 && (
                        <div
                            style={{
                                marginLeft: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '2px',
                                borderRadius: '50%',
                                background: currentPageIndex === index ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                deletePage(index);
                            }}
                        >
                            <Trash2 size={12} />
                        </div>
                    )}
                </div>
            ))}

            <button
                className="btn glass"
                style={{ borderRadius: '50%', padding: '6px', marginLeft: '8px' }}
                onClick={addPage}
                title="Add New Page"
            >
                <Plus size={16} />
            </button>
        </div>
    );
};

export default PagePanel;
