import * as LocalAuthentication from "expo-local-authentication";

// True if the phone can show the system lock prompt: a biometric (fingerprint,
// face) or the device PIN/pattern. Callers fall back to the type-to-confirm
// modal when this is false.
export async function biometricAuthAvailable(): Promise<boolean> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

// Shows the system lock prompt (fingerprint/PIN) and resolves to true only if
// the user authenticated successfully.
export async function authenticateWithDeviceLock(
  promptMessage: string
): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: false,
  });
  return result.success;
}
