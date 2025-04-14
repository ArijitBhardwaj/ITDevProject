// src/utils/sensorUtils.js

// A naive Pedestrian Dead Reckoning approach using device orientation & motion

import allCoords from "./allCoordinatesArray.js";

export class PedestrianDeadReckoning {
  constructor(initialPosition = { x: 0, y: 0 }) {
    this.position = { ...initialPosition };
    this.stepLength = 0.7; // average step length in meters
    this.heading = 0; // 0..360 degrees
    this.stepCount = 0;
    this.lastAccelerationZ = 0;
    this.isTracking = false;
  }

  startTracking() {
    // iOS might not fire events unless user granted permission first
    if (typeof DeviceOrientationEvent !== "undefined") {
      window.addEventListener("deviceorientation", this.handleOrientation);
    }
    if (typeof DeviceMotionEvent !== "undefined") {
      window.addEventListener("devicemotion", this.handleMotion);
    }
    this.isTracking = true;
  }

  stopTracking() {
    window.removeEventListener("deviceorientation", this.handleOrientation);
    window.removeEventListener("devicemotion", this.handleMotion);
    this.isTracking = false;
  }

  // store heading from alpha
  handleOrientation = (event) => {
    // event.alpha => 0..360, typically "0" = device pointed north,
    // but it can vary by manufacturer.
    this.heading = event.alpha || 0;
  };

  // naive step detection from Z-acc changes
  handleMotion = (event) => {
    // accelerationIncludingGravity is more stable for stepping
    const accZ = event.accelerationIncludingGravity?.z;
    if (accZ == null) return;

    // if difference from last reading is big => assume step
    if (Math.abs(accZ - this.lastAccelerationZ) > 2.5) {
      this.handleStep();
    }
    this.lastAccelerationZ = accZ;
  };

  // each step => move in "heading" direction
  handleStep() {
    if (!this.isTracking) return;

    // heading degrees => radians
    const rad = (this.heading - 90) * (Math.PI / 180);

    // update position
    this.position.x += Math.cos(rad) * this.stepLength;
    this.position.y += Math.sin(rad) * this.stepLength;
    this.stepCount++;
  }
}

// For example, storing known campus "room => coordinate" so you
// can match user typed location -> (x,y)
export const ROOM_COORDINATES = allCoords.reduce((acc, item) => {
  acc[item.id] = {
    x: item.coordinates.x,
    y: item.coordinates.y,
  };
  return acc;
}, {});
