export async function requestSensorPermissions() {
    try {
      // If the device & browser have requestPermission for orientation, do so
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        const orientationPerm = await DeviceOrientationEvent.requestPermission();
        return orientationPerm === "granted";
      }
  
      // Otherwise, no special request needed
      return true;
    } catch (error) {
      console.error("Sensor permission error:", error);
      return false;
    }
  }