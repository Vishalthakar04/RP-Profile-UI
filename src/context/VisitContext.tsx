// src/context/VisitContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "visit_state_v1";

interface School {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  is_adopted?: boolean;   // ← ADD
}

export interface LastScreen {
  name: string;
  params?: Record<string, any>;
}

interface VisitContextType {
  currentSchool: School | null;
  setCurrentSchool: (school: School | null) => void;
  visitId: string | null;
  setVisitId: (id: string | null) => void;
  lastScreen: LastScreen | null;
  setLastScreen: (s: LastScreen | null) => void;
  clearVisit: () => void;
  hydrated: boolean;
}

const VisitContext = createContext<VisitContextType>({
  currentSchool: null,
  setCurrentSchool: () => {},
  visitId: null,
  setVisitId: () => {},
  lastScreen: null,
  setLastScreen: () => {},
  clearVisit: () => {},
  hydrated: false,
});

export const VisitProvider = ({ children }: { children: ReactNode }) => {
  const [currentSchool, setCurrentSchoolState] = useState<School | null>(null);
  const [visitId, setVisitIdState]             = useState<string | null>(null);
  const [lastScreen, setLastScreenState]       = useState<LastScreen | null>(null);
  const [hydrated, setHydrated]                = useState(false);

  // ── Restore on mount ───────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const saved = JSON.parse(raw);
            if (saved.visitId)       setVisitIdState(saved.visitId);
            if (saved.currentSchool) setCurrentSchoolState(saved.currentSchool);
            if (saved.lastScreen)    setLastScreenState(saved.lastScreen);
          } catch {
            // corrupted — ignore
          }
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  // ── Persist helper ─────────────────────────────────────────────────────
  const persist = (
    vId: string | null,
    school: School | null,
    screen: LastScreen | null
  ) => {
    if (vId) {
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ visitId: vId, currentSchool: school, lastScreen: screen })
      ).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  };

  const setCurrentSchool = (school: School | null) => {
    setCurrentSchoolState(school);
    persist(visitId, school, lastScreen);
  };

  const setVisitId = (id: string | null) => {
    setVisitIdState(id);
    persist(id, currentSchool, lastScreen);
  };

  const setLastScreen = (screen: LastScreen | null) => {
    setLastScreenState(screen);
    persist(visitId, currentSchool, screen);
  };

  const clearVisit = () => {
    setVisitIdState(null);
    setCurrentSchoolState(null);
    setLastScreenState(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  return (
    <VisitContext.Provider
      value={{
        currentSchool,
        setCurrentSchool,
        visitId,
        setVisitId,
        lastScreen,
        setLastScreen,
        clearVisit,
        hydrated,
      }}
    >
      {children}
    </VisitContext.Provider>
  );
};

export const useVisit = () => useContext(VisitContext);