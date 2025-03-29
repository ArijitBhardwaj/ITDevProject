import { useState } from "react";
import QrScannerModal from "../components/QRScannerModal"; // path may differ
import { ErrorBoundary } from "react-error-boundary";

const TestingLandingPage = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [userCurrentLocation, setUserCurrentLocation] = useState("");
  const [userDestination, setUserDestination] = useState("");
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [isInitializingScanner, setIsInitializingScanner] = useState(false);

  const handleScan = (data) => {
    try {
      const validCodes = ["A1", "B2", "C3", "D4"];
      if (validCodes.includes(data)) {
        setUserCurrentLocation(data);
        setShowScanner(false);
        setScanError(null);
      } else {
        throw new Error(
          "Invalid QR code. Please scan a test code (A1/B2/C3/D4)"
        );
      }
    } catch (error) {
      setScanError(error.message);
      setShowScanner(false);
    }
  };

  const handleStartScan = async () => {
    try {
      setIsInitializingScanner(true);
      setScanError(null);

      // OPTIONAL camera permission check (some browsers/devices may not fully support it)
      const permissions = await navigator.permissions.query({ name: "camera" });
      if (permissions.state === "denied") {
        throw new Error(
          "Camera access blocked. Please enable in browser settings."
        );
      }

      setShowScanner(true);
    } catch (error) {
      setScanError(error.message);
    } finally {
      setIsInitializingScanner(false);
    }
  };

  const handleSubmit = async () => {
    if (!userCurrentLocation || !userDestination) {
      setScanError("Please scan a QR code and enter destination");
      return;
    }

    try {
      setLoading(true);
      setScanError(null);

      const response = await fetch(
        "http://192.168.1.67:5001/api/navigation/calculate-path",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start: userCurrentLocation,
            end: userDestination,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setInstructions(data.instructions);
      } else {
        throw new Error(data.error || "Path calculation failed");
      }
    } catch (error) {
      setScanError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="testing-container">
      <h1>Navigation Testing Page</h1>

      {scanError && (
        <div className="error-banner">
          <span>{scanError}</span>
          <button
            onClick={() => setScanError(null)}
            aria-label="Dismiss error message"
          >
            ×
          </button>
        </div>
      )}

      <div className="scan-section">
        <button
          onClick={handleStartScan}
          disabled={showScanner || loading || isInitializingScanner}
          aria-busy={isInitializingScanner}
        >
          {isInitializingScanner
            ? "Initializing Camera..."
            : showScanner
            ? "Scanning..."
            : "Start QR Scanning"}
        </button>

        {showScanner && (
          <QrScannerModal
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>

      {userCurrentLocation && (
        <div className="location-display">
          <span className="location-label">Current Location:</span>
          <span className="location-value">{userCurrentLocation}</span>
        </div>
      )}

      <div className="destination-input">
        <input
          type="text"
          placeholder="Enter destination (A1/B2/C3/D4)"
          value={userDestination}
          onChange={(e) => setUserDestination(e.target.value.toUpperCase())}
          disabled={loading}
          aria-label="Enter destination"
        />
      </div>

      <button
        className="submit-button"
        onClick={handleSubmit}
        disabled={loading || !userCurrentLocation}
        aria-busy={loading}
      >
        {loading ? (
          <div className="loading-indicator">
            <span className="spinner" aria-hidden="true"></span>
            Calculating Route...
          </div>
        ) : (
          "Get Directions"
        )}
      </button>

      {instructions.length > 0 && (
        <div className="instructions-container">
          <h3>Navigation Steps:</h3>
          <ol aria-label="Navigation instructions">
            {instructions.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="error-fallback">
      <h2>Scanner Error</h2>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary} className="retry-button">
        Try Again
      </button>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <TestingLandingPage />
    </ErrorBoundary>
  );
}
