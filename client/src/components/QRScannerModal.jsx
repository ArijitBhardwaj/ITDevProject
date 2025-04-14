import React from "react";
import { useEffect, useRef } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";

const QrScannerModal = ({ onScan, onClose }) => {
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const controlsRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    codeReaderRef.current = new BrowserQRCodeReader();

    const startScanner = async () => {
      try {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (videoRef.current) {
          // Assign the webcam stream to the <video> element
          videoRef.current.srcObject = stream;

          // Start continuous decoding from the video element
          // decodeFromVideoElement(...) returns a promise that resolves
          // to an IScannerControls object, or we can also get it from
          // the callback's third param
          controlsRef.current =
            await codeReaderRef.current.decodeFromVideoElement(
              videoRef.current,
              (result, error, controls) => {
                // We can also store the controls param
                // (but we'll just rely on the promise return here).
                if (result && isMounted.current) {
                  onScan(result.getText());
                  onClose();
                }
              }
            );
        }
      } catch (error) {
        console.error("Camera error:", error);
        if (isMounted.current) onClose();
      }
    };

    startScanner();

    return () => {
      // Mark component as unmounted
      isMounted.current = false;

      // 1) Stop scanning (releases camera)
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }

      // 2) Stop the video tracks if any
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="scanner-overlay">
      <div className="scanner-container">
        <video
          ref={videoRef}
          style={{ width: "100%", height: "auto" }}
          autoPlay
          playsInline
          muted
        />
        <button onClick={onClose} className="close-button">
          Close Scanner
        </button>
      </div>
    </div>
  );
};

export default QrScannerModal;
