// src/context/VisitContext.tsx

import React, { createContext, useContext, useState, ReactNode } from "react";

/* ───────── TYPES ───────── */

interface School {
  id: string;
  name: string;
  address?: string;
}

interface VisitContextType {
  currentSchool: School | null;
  setCurrentSchool: (school: School | null) => void;

  visitId: string | null;
  setVisitId: (id: string | null) => void;

  clearVisit: () => void; // ✅ added helper
}

/* ───────── CONTEXT ───────── */

const VisitContext = createContext<VisitContextType | undefined>(undefined);

/* ───────── PROVIDER ───────── */

interface Props {
  children: ReactNode;
}

export const VisitProvider = ({ children }: Props) => {
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [visitId, setVisitId] = useState<string | null>(null);

  /* ✅ CLEAR VISIT (VERY IMPORTANT) */
  const clearVisit = () => {
    setVisitId(null);
    setCurrentSchool(null);
  };

  return (
    <VisitContext.Provider
      value={{
        currentSchool,
        setCurrentSchool,
        visitId,
        setVisitId,
        clearVisit, // ✅ exposed
      }}
    >
      {children}
    </VisitContext.Provider>
  );
};

/* ───────── HOOK ───────── */

export const useVisit = () => {
  const context = useContext(VisitContext);

  if (!context) {
    throw new Error("useVisit must be used within VisitProvider");
  }

  return context;
};