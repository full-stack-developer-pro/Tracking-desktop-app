export interface TrackingSettings {
  companyId: string;
  screenshotInterval: {
    min: number;
    max: number;
  };
  workingHours: {
    start: string;
    end: string;
    timezone: string;
  };
  daysActive: number[];
  captureOnInactivity: boolean;
  inactivityThreshold: number;
  quality: "low" | "medium" | "high";
  enabled: boolean;
}

export const DEFAULT_SETTINGS: TrackingSettings = {
  companyId: "",
  screenshotInterval: { min: 10, max: 20 },
  workingHours: { start: "09:00", end: "18:00", timezone: "UTC" },
  daysActive: [1, 2, 3, 4, 5, 6],
  captureOnInactivity: true,
  inactivityThreshold: 5,
  quality: "medium",
  enabled: true,
};
