import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const RootComponent = () => {
  const [splitCount, setSplitCount] = useState<number>(() => {
    const saved = localStorage.getItem('splitCount');
    return saved ? parseInt(saved, 10) : 1;
  });

  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    localStorage.setItem('splitCount', splitCount.toString());
  }, [splitCount]);

  const getWidth = () => `${100 / splitCount}%`;

  return (
    <div className="container" style={{ maxWidth: "100%", overflowY: 'hidden' }}>
      <div
        className="split-toggle-wrapper"
        onMouseEnter={() => setShowMenu(true)}
        onMouseLeave={() => setShowMenu(false)}
      >
        <button className="toggle-btn">
          {splitCount === 1 ? "|≡" : "≡|"}
        </button>

        {showMenu && (
          <div className="split-menu">
            {[1, 2, 3, 4].map((count) => (
              <button
                key={count}
                className={`split-option ${splitCount === count ? 'active' : ''}`}
                onClick={() => setSplitCount(count)}
              >
                {count}
              </button>
            ))}
          </div>
        )}
      </div>

      {splitCount === 1 ? (
        <div className="single">
          <App splitCount={splitCount} />
        </div>
      ) : (
        <div className="split-container">
          {Array.from({ length: splitCount }).map((_, idx) => (
            <div className="split-item" style={{ width: getWidth() }} key={idx}>
              <App splitCount={splitCount} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);

reportWebVitals();
