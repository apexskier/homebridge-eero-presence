export interface Config {
  userToken: string;
  occupancyTimeout?: number;
  pollTime?: number;
  network?: string;
  minSignal?: number;
  deviceTypes?: string[];
  enableStatusLightAccessories?: boolean;
}
