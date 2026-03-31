// src/context/useVisitResume.tsx — final clean version

import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useVisit } from "./VisitContext";

const STEP_LABELS: Record<string, string> = {
  VisitCheckin:       "Step 1 — Check-in",
  visitForm:          "Step 2 — Visit Form",
  ClassObservation:   "Step 3 — Observation",
  ObservationSummary: "Step 4 — Summary",
  VisitChecklist:     "Step 5 — Checklist",
  FinishVisit:        "Step 6 — Finish Visit",
};

export function useVisitResume() {
  const navigation = useNavigation<any>();
  const { visitId, currentSchool, lastScreen, clearVisit, hydrated } = useVisit();
  const prompted = useRef(false);

  useEffect(() => {
    if (!hydrated)        return;
    if (prompted.current) return;
    if (!visitId || !lastScreen) return;

    prompted.current = true;

    const stepLabel  = STEP_LABELS[lastScreen.name] ?? lastScreen.name;
    const schoolName = currentSchool?.name ?? "your school";

    Alert.alert(
      "Resume your visit?",
      `You have an unfinished visit at ${schoolName}.\n\nLeft at: ${stepLabel}`,
      [
        {
          text: "Resume",
          onPress: () => navigation.navigate(lastScreen.name, lastScreen.params ?? {}),
        },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => clearVisit(),
        },
      ],
      { cancelable: false }
    );
  }, [hydrated]);
}