"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
} from "react";

interface TableContextType {
  tableNumber: string | null;
  setTableNumber: (table: string) => void;
  numberOfDiners: number;
  setNumberOfDiners: (diners: number) => void;
}

const TableContext = createContext<TableContextType | undefined>(undefined);

export const TableProvider = ({ children }: { children: ReactNode }) => {
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [numberOfDiners, setNumberOfDiners] = useState(1);

  const value = useMemo(
    () => ({
      tableNumber,
      setTableNumber,
      numberOfDiners,
      setNumberOfDiners,
    }),
    [tableNumber, numberOfDiners]
  );

  return (
    <TableContext.Provider value={value}>{children}</TableContext.Provider>
  );
};

export const useTable = () => {
  const context = useContext(TableContext);
  if (context === undefined) {
    throw new Error("useTable must be used within a TableProvider");
  }
  return context;
};
