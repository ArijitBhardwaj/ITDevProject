export async function requestSensorPermissions() {
  try {
    // iOS 13+ requires a direct user request for device orientation data
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      const orientationPerm = await DeviceOrientationEvent.requestPermission();
      return orientationPerm === "granted";
    }

    // Otherwise, on most other browsers, no special request is needed
    return true;
  } catch (error) {
    console.error("Sensor permission error:", error);
    return false;
  }
}
