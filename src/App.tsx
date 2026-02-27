
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import PropertyPanel from './components/PropertyPanel';
import CanvasArea from './components/CanvasArea';
import PagePanel from './components/PagePanel';

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <Toolbar />
      <div className="main-layout" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <div className="canvas-workspace" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <PagePanel />
          <CanvasArea />
        </div>
        <PropertyPanel />
      </div>
      <div
        style={{
          height: 32,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          background: 'var(--panel-bg)',
          borderTop: '1px solid var(--panel-border)',
          fontSize: 12,
          color: 'var(--text-secondary)'
        }}
        className="glass-panel status-bar"
      >
        <span>Status: Ready</span>
      </div>
    </div>
  );
}

export default App;
