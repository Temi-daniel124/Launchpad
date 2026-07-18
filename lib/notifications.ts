import Constants, { ExecutionEnvironment } from "expo-constants";

export type NotificationPermissionResult =
  | { status: "granted" | "denied" | "undetermined" }
  | { status: "unavailable-in-expo-go" };

export function isRunningInExpoGo() {
  return (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === "expo"
  );
}

export async function requestNotificationPermissions(): Promise<NotificationPermissionResult> {
  if (isRunningInExpoGo()) {
    return { status: "unavailable-in-expo-go" };
  }

  const Notifications = await import("expo-notifications");
  const { status } = await Notifications.requestPermissionsAsync();
  return { status };
}
