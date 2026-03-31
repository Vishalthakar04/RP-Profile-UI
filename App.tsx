// App.tsx
import React, { useEffect } from "react";
import { PermissionsAndroid } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { Camera } from "react-native-vision-camera";
import { VisitProvider } from "./src/context/VisitContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  useEffect(() => {
    Camera.requestCameraPermission();
    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location Permission",
        message: "This app needs access to your location.",
        buttonPositive: "Allow",
        buttonNegative: "Deny",
      }
    );
  }, []);

  return (
    // ✅ SafeAreaProvider at root — measures device insets for all children
    // ✅ No SafeAreaView here — each screen + AppHeader handles its own insets
    <SafeAreaProvider>
      <VisitProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </VisitProvider>
    </SafeAreaProvider>
  );
}