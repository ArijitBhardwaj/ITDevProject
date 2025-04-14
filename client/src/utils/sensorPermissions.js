// src/utils/sensorPermissions.js

/**
 * requestSensorPermissions()
 *
 * On iOS 13+, you must request user permission for motion sensors.
 * This function attempts to do so if needed, else returns true.
 */
export async function requestSensorPermissions() {
  try {
    // If the device & browser have requestPermission, do so
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      const orientationPerm = await DeviceOrientationEvent.requestPermission();
      const motionPerm = await DeviceMotionEvent.requestPermission();

      return orientationPerm === "granted" && motionPerm === "granted";
    }

    // For Android or older iOS, no special request needed
    return true;
  } catch (error) {
    console.error("Sensor permission error:", error);
    return false;
  }
}
