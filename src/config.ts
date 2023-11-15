export interface Config {
  userToken: string;
  pollTime?: number;
  network?: string;
  minSignal?: number;
  deviceTypes?: string[];
}
