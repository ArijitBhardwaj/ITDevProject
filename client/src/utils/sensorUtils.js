import allCoords from "./allCoordinatesArray.js";

// Vancouver-specific calibration constants
export const VCC_CALIBRATION = {
  magneticDeclination: -19.5, // Vancouver's approx. magnetic declination
  mapRotation: 32,            // Map's clockwise rotation from true north
  coordinateScale: 0.87,      // Scaling factor, if needed for your coordinate system
};

export const ROOM_COORDINATES = allCoords.reduce((acc, item) => {
  acc[item.id] = item.coordinates;
  return acc;
}, {});