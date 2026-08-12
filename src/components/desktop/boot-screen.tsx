export function BootScreen() {
  return (
    <div className="boot-shell">
      <div className="window">
        <div className="title-bar">
          <div className="title-bar-text">Kanban Board</div>
        </div>
        <div className="window-body">
          <p className="boot-message">Starting...</p>
          <div className="progress-indicator segmented">
            <span className="progress-indicator-bar boot-progress-bar" />
          </div>
        </div>
        <div className="status-bar">
          <p className="status-bar-field">Please wait</p>
        </div>
      </div>
    </div>
  );
}
