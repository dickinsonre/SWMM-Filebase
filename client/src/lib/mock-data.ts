import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface InpFile {
  id: string;
  filename: string;
  directory: string;
  size: string;
  lastModified: string;
  nodeCount: number;
  linkCount: number;
  subcatchmentCount: number;
  description?: string;
}

export const mockInpFiles: InpFile[] = [
  {
    id: "1",
    filename: "S1_Residential.inp",
    directory: "Project_Alpha/North_Catchment",
    size: "2.4 MB",
    lastModified: "2024-05-15",
    nodeCount: 145,
    linkCount: 152,
    subcatchmentCount: 45,
    description: "Base residential layout for North Sector"
  },
  {
    id: "2",
    filename: "S1_Commercial.inp",
    directory: "Project_Alpha/North_Catchment",
    size: "1.8 MB",
    lastModified: "2024-05-16",
    nodeCount: 89,
    linkCount: 94,
    subcatchmentCount: 22,
    description: "Proposed commercial zone expansion"
  },
  {
    id: "3",
    filename: "Downtown_Relief.inp",
    directory: "Project_Alpha/City_Center",
    size: "5.1 MB",
    lastModified: "2024-06-01",
    nodeCount: 450,
    linkCount: 480,
    subcatchmentCount: 120,
    description: "Flood relief tunnel options"
  },
  {
    id: "4",
    filename: "Existing_Conditions_2024.inp",
    directory: "Project_Beta/Baseline",
    size: "8.2 MB",
    lastModified: "2024-04-10",
    nodeCount: 890,
    linkCount: 915,
    subcatchmentCount: 340,
    description: "Calibrated model against 2023 flow data"
  },
  {
    id: "5",
    filename: "Future_Buildout_Max.inp",
    directory: "Project_Beta/Scenarios",
    size: "9.5 MB",
    lastModified: "2024-06-12",
    nodeCount: 1100,
    linkCount: 1150,
    subcatchmentCount: 410,
    description: "Maximum imperviousness scenario"
  }
];
