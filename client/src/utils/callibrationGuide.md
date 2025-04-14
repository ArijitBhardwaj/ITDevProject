# VCC Navigation Calibration Guide

## Calibration Points
1. **Main Entrance (Facing Northwest)**
   - Expected Heading: 215°
   - Scan QR code and verify marker direction
   - Walk forward to test southwest movement

2. **Library (Facing East)**
   - Expected Heading: 90°
   - Navigate to library waypoint
   - Verify eastward movement

## Adjustment Factors
```javascript
// src/utils/sensorUtils.js
const VCC_CALIBRATION = {
  magneticDeclination: -19.5, // Adjust ±1° as needed
  mapRotation: 32, // Adjust ±5° to match map rotation
  coordinateScale: 0.87 // Adjust ±0.05 for distance accuracy
};