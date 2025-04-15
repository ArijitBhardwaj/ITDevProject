import allCoords from "./allCoordinatesArray.js";

// Vancouver-specific calibration constants
const VCC_CALIBRATION = {
  magneticDeclination: -19.5, // Vancouver's magnetic declination
  mapRotation: 32, // Map's clockwise rotation from true north
  coordinateScale: 0.87, // Scaling factor for map accuracy
};



export const ROOM_COORDINATES = allCoords.reduce((acc, item) => {
  acc[item.id] = item.coordinates;
  return acc;
}, {});
