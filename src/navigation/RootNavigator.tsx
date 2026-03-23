// src/navigation/RootNavigator.tsx

import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import your screens here as we migrate them
import Login from "../screens/auth/login";
import VerifyOtpScreen from "../screens/auth/verifyOtp";
import Dashboard from "../screens/dashboard/mainpage";
import Schools from "../screens/school/schoolList";
import VisitCheckin from "../screens/school/schoolVisit/visitCheckin";
import VisitForm from "../screens/school/schoolVisit/visitForm";
import ClassObservation from "../screens/school/schoolVisit/classObservation";
import ObservationSummary from "../screens/school/schoolVisit/observationSummary";
import VisitChecklist from "../screens/school/schoolVisit/visitChecklist";
import FinishVisit from "../screens/school/schoolVisit/finishVisit";
import ModuleProgress from "../screens/school/schoolProgress/moduleProgress";
import SchoolDetails from "../screens/school/schoolDetails/School-Details";
import ProgramDetails from "../screens/school/schoolDetails/programDetails";
import SectionsManagement from "../screens/school/schoolDetails/sectionManagement";
import ProgramsList from "../screens/school/schoolSection/programList";
import VisitScheduleScreen from "../screens/school/scheduleVisit/scheduleVisit";
import ProfileScreen from "../screens/profile/Profile";
import  AddVisitScreen from "../screens/school/scheduleVisit/AddVisitScreen";
const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
      {/* screens will be added here page by page */}
      {/* <Stack.Screen name="Login" component={LoginScreen} /> */}
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <Stack.Screen name="Dashboard" component={Dashboard} />
      <Stack.Screen name="Schools" component={Schools} />
      <Stack.Screen name="VisitCheckin" component={VisitCheckin} />
      <Stack.Screen name="visitForm" component={VisitForm} />
      <Stack.Screen name="ClassObservation" component={ClassObservation} />
      <Stack.Screen name="ObservationSummary" component={ObservationSummary} />
      <Stack.Screen name="VisitChecklist" component={VisitChecklist} />
      <Stack.Screen name="FinishVisit" component={FinishVisit} />
      <Stack.Screen name="ModuleProgress" component={ModuleProgress} />
      <Stack.Screen name="SectionsManagement" component={SectionsManagement} />
      <Stack.Screen name="SchoolDetails" component={SchoolDetails} />
      <Stack.Screen name="ProgramDetails" component={ProgramDetails} />
      <Stack.Screen name="ProgramsList" component={ProgramsList} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Visits" component={VisitScheduleScreen} />
<Stack.Screen name="AddVisit" component={AddVisitScreen} />    </Stack.Navigator>
  );
}