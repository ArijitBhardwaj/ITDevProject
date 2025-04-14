import allCoords from "./allCoordinatesArray.js";

// Vancouver-specific calibration constants
const VCC_CALIBRATION = {
  magneticDeclination: -19.5, // Vancouver's magnetic declination
  mapRotation: 32, // Map's clockwise rotation from true north
  coordinateScale: 0.87, // Scaling factor for map accuracy
};

export class PedestrianDeadReckoning {
  constructor(initialPosition) {
    this.position = initialPosition;
    this.stepLength = 0.7 * VCC_CALIBRATION.coordinateScale;
    this.heading = 0;
    this.stepCount = 0;
    this.lastAcceleration = 0;
    this.isTracking = false;
  }

  startTracking() {
    if (typeof DeviceOrientationEvent !== "undefined") {
      window.addEventListener("deviceorientation", this.handleOrientation);
    }
    if (typeof DeviceMotionEvent !== "undefined") {
      window.addEventListener("devicemotion", this.handleMotion);
    }
    this.isTracking = true;
  }

  handleOrientation = (event) => {
    if (!event.alpha) return;

    // Compensate for magnetic declination and map rotation
    const rawHeading = event.alpha;
    this.heading =
      (rawHeading +
        VCC_CALIBRATION.magneticDeclination +
        VCC_CALIBRATION.mapRotation +
        360) %
      360;
  };

  handleMotion = (event) => {
    const acc = event.acceleration.z;
    if (Math.abs(acc - this.lastAcceleration) > 2.5) {
      this.handleStep();
    }
    this.lastAcceleration = acc;
  };

  handleStep = () => {
    if (!this.isTracking) return;

    const rad = (this.heading - 90) * (Math.PI / 180);
    this.position.x += Math.cos(rad) * this.stepLength;
    this.position.y += Math.sin(rad) * this.stepLength;
    this.stepCount++;
  };

  stopTracking() {
    window.removeEventListener("deviceorientation", this.handleOrientation);
    window.removeEventListener("devicemotion", this.handleMotion);
    this.isTracking = false;
  }
}

export const ROOM_COORDINATES = allCoords.reduce((acc, item) => {
  acc[item.id] = item.coordinates;
  return acc;
}, {});
