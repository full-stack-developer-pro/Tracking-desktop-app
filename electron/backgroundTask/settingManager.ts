import DataService from "../../src/services/DataServices";
import {
  DEFAULT_SETTINGS,
  TrackingSettings,
} from "../../src/types/trackingSettings";

class SettingsManager {
  private currentSettings: TrackingSettings = DEFAULT_SETTINGS;
  private companyId: string = "";

  setCompanyId(companyId: string) {
    this.companyId = companyId;
  }

  async fetchSettings(): Promise<TrackingSettings> {
    try {
      if (!this.companyId) {
        console.warn("No company ID set, using default settings");
        return DEFAULT_SETTINGS;
      }

      const response = await DataService.getTrackingSettings(this.companyId);

      if (response.status === 200) {
        this.currentSettings = { ...DEFAULT_SETTINGS, ...response.data };
        console.log("Tracking settings loaded:", this.currentSettings);
        return this.currentSettings;
      }
    } catch (error) {
      console.error("Failed to fetch tracking settings:", error);
    }

    return DEFAULT_SETTINGS;
  }

  getSettings(): TrackingSettings {
    return this.currentSettings;
  }

  isWithinWorkingHours(): boolean {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    if (!this.currentSettings.daysActive.includes(currentDay)) {
      return false;
    }

    return (
      currentTime >= this.currentSettings.workingHours.start &&
      currentTime <= this.currentSettings.workingHours.end
    );
  }

  shouldCaptureBasedOnSettings(): boolean {
    if (!this.currentSettings.enabled) {
      return false;
    }

    return this.isWithinWorkingHours();
  }

  getScreenshotInterval(): { min: number; max: number } {
    return this.currentSettings.screenshotInterval;
  }
}

export const settingsManager = new SettingsManager();
