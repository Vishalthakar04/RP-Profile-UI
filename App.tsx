// App.tsx (root level) - FINAL CLEAN VERSION

import { useEffect } from "react";
import { PermissionsAndroid } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { Camera } from "react-native-vision-camera";
import { VisitProvider } from "./src/context/VisitContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {

  const requestPermissions = async () => {
    await Camera.requestCameraPermission();

    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location Permission",
        message: "This app needs access to your location.",
        buttonPositive: "Allow",
        buttonNegative: "Deny",
      }
    );
  };

  useEffect(() => {
    requestPermissions();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <VisitProvider>
          <RootNavigator />
        </VisitProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}