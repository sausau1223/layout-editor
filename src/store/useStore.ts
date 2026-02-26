import { create } from 'zustand';
import localforage from 'localforage';

export type ToolMode = 'select' | 'text' | 'image';

interface EditorState {
    canvas: any | null;
    setCanvas: (canvas: any) => void;
    activeObject: any | null;
    setActiveObject: (obj: any | null) => void;
    zoom: number;
    setZoom: (zoom: number) => void;
    workspaceSize: { width: number; height: number };
    toolMode: ToolMode;
    setToolMode: (mode: ToolMode) => void;

    // Multi-page Support & History (Undo / Redo)
    pages: string[]; // Array of canvas JSON strings
    currentPageIndex: number;
    setPages: (pages: string[]) => void;
    setCurrentPageIndex: (index: number) => void;
    addPage: () => void;
    deletePage: (index: number) => void;
    switchPage: (index: number) => void;

    history: { pages: string[], currentPageIndex: number }[];
    historyIndex: number;
    isHistoryRestoring: boolean;
    setHistoryRestoring: (restoring: boolean) => void;
    saveHistory: (pages: string[], currentIndex: number) => void;
    undo: () => void;
    redo: () => void;
}

export const useStore = create<EditorState>((set, get) => ({
    canvas: null,
    setCanvas: (canvas) => set({ canvas }),
    activeObject: null,
    setActiveObject: (obj) => set({ activeObject: obj }),
    zoom: 1,
    setZoom: (zoom) => set({ zoom }),
    workspaceSize: { width: 794, height: 1123 }, // A4 at ~96 DPI mapping
    toolMode: 'select',
    setToolMode: (mode) => set({ toolMode: mode }),

    pages: [''],
    currentPageIndex: 0,
    setPages: (pages) => set({ pages }),
    setCurrentPageIndex: (index) => set({ currentPageIndex: index }),

    addPage: () => {
        const { pages, saveHistory, canvas, setHistoryRestoring } = get();
        // create empty canvas json
        const emptyCanvas = { version: "7.0.6", objects: [] }; // Minimal valid fabric JSON
        const emptyState = JSON.stringify(emptyCanvas);
        const newPages = [...pages, emptyState];

        set({ pages: newPages, currentPageIndex: newPages.length - 1, activeObject: null });

        if (canvas) {
            setHistoryRestoring(true);
            canvas.loadFromJSON(emptyState).then(() => {
                canvas.requestRenderAll();
                setHistoryRestoring(false);
            }).catch((err: any) => {
                console.error('Failed to load empty page', err);
                setHistoryRestoring(false);
            });
        }

        saveHistory(newPages, newPages.length - 1);
    },

    deletePage: (index) => {
        const { pages, currentPageIndex, saveHistory, canvas, setHistoryRestoring } = get();
        if (pages.length <= 1) return; // Cannot delete the last remaining page

        const newPages = pages.filter((_, i) => i !== index);
        let newIndex = currentPageIndex;
        if (currentPageIndex >= newPages.length) {
            newIndex = newPages.length - 1;
        } else if (currentPageIndex === index) {
            newIndex = Math.max(0, index - 1);
        }

        set({ pages: newPages, currentPageIndex: newIndex, activeObject: null });

        // Load the new active page's content into the canvas
        const state = newPages[newIndex];
        if (canvas && state && state !== '') {
            setHistoryRestoring(true);
            canvas.loadFromJSON(state).then(() => {
                canvas.requestRenderAll();
                setHistoryRestoring(false);
            }).catch((err: any) => {
                console.error('Failed to load page after deletion', err);
                setHistoryRestoring(false);
            });
        }

        saveHistory(newPages, newIndex);
    },

    switchPage: (index) => {
        const { pages, canvas, setHistoryRestoring } = get();
        if (index < 0 || index >= pages.length) return;

        set({ currentPageIndex: index, activeObject: null });

        const state = pages[index];
        if (canvas && state && state !== '') {
            setHistoryRestoring(true);
            canvas.loadFromJSON(state).then(() => {
                canvas.requestRenderAll();
                setHistoryRestoring(false);
            }).catch((err: any) => {
                console.error('Failed to switch page', err);
                setHistoryRestoring(false);
            });
        } else if (canvas && state === '') {
            setHistoryRestoring(true);
            canvas.clear();
            canvas.backgroundColor = '#ffffff';
            canvas.requestRenderAll();
            setHistoryRestoring(false);
        }
    },

    history: [],
    historyIndex: -1,
    isHistoryRestoring: false,
    setHistoryRestoring: (restoring) => set({ isHistoryRestoring: restoring }),
    saveHistory: (pagesState, indexState) => set((prev) => {
        if (prev.isHistoryRestoring) return prev;
        const newHistory = prev.history.slice(0, prev.historyIndex + 1);
        newHistory.push({ pages: [...pagesState], currentPageIndex: indexState });
        if (newHistory.length > 30) {
            newHistory.shift();
        }
        // Save to indexed db for persistence
        localforage.setItem('layout_editor_state_v2', { pages: pagesState, currentPageIndex: indexState }).catch(console.error);
        return {
            history: newHistory,
            historyIndex: newHistory.length - 1,
            pages: [...pagesState],
            currentPageIndex: indexState
        };
    }),
    undo: async () => {
        const { historyIndex, history, canvas, setHistoryRestoring } = get();
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const stateObj = history[newIndex];
            set({
                historyIndex: newIndex,
                pages: stateObj.pages,
                currentPageIndex: stateObj.currentPageIndex,
                activeObject: null
            });
            const stateStr = stateObj.pages[stateObj.currentPageIndex];

            if (canvas && stateStr) {
                setHistoryRestoring(true);
                try {
                    await canvas.loadFromJSON(stateStr);
                    canvas.requestRenderAll();
                    localforage.setItem('layout_editor_state_v2', stateObj).catch(console.error);
                } catch (err) {
                    console.error('Undo load failed', err);
                } finally {
                    setHistoryRestoring(false);
                }
            } else if (canvas) {
                canvas.clear();
                canvas.backgroundColor = '#ffffff';
                canvas.requestRenderAll();
            }
        }
    },
    redo: async () => {
        const { historyIndex, history, canvas, setHistoryRestoring } = get();
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            const stateObj = history[newIndex];
            set({
                historyIndex: newIndex,
                pages: stateObj.pages,
                currentPageIndex: stateObj.currentPageIndex,
                activeObject: null
            });
            const stateStr = stateObj.pages[stateObj.currentPageIndex];

            if (canvas && stateStr) {
                setHistoryRestoring(true);
                try {
                    await canvas.loadFromJSON(stateStr);
                    canvas.requestRenderAll();
                    localforage.setItem('layout_editor_state_v2', stateObj).catch(console.error);
                } catch (err) {
                    console.error('Redo load failed', err);
                } finally {
                    setHistoryRestoring(false);
                }
            }
        }
    }
}));

