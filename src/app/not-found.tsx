export default function NotFound() {
  return (
    <div className="not-found-shell">
      <div className="window">
        <div className="title-bar">
          <div className="title-bar-text">Page not found</div>
        </div>
        <div className="window-body">
          <p className="not-found-message">
            The page you requested does not exist.
          </p>
          <div className="not-found-actions">
            <form action="/">
              <button type="submit" className="default">
                Back to desktop
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
