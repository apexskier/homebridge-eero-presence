import { Config } from './config';

export class StatusPrinterStatusPrinter {
  'ok'?: boolean;
  'message'?: string;
}

/**
 * Telemetry info about printer, all values except state are optional
 */
export interface StatusPrinter {
  state: StatusPrinterStateEnum;
  tempNozzle?: number;
  targetNozzle?: number;
  tempBed?: number;
  targetBed?: number;
  /**
   * Available only when printer is not moving
   */
  axisX?: number;
  /**
   * Available only when printer is not moving
   */
  axisY?: number;
  axisZ?: number;
  flow?: number;
  speed?: number;
  fanHotend?: number;
  fanPrint?: number;
  statusPrinter?: StatusPrinterStatusPrinter;
  statusConnect?: StatusPrinterStatusPrinter;
}

export enum StatusPrinterStateEnum {
  Idle = 'IDLE',
  Busy = 'BUSY',
  Printing = 'PRINTING',
  Paused = 'PAUSED',
  Finished = 'FINISHED',
  Stopped = 'STOPPED',
  Error = 'ERROR',
  Atttention = 'ATTTENTION',
  Ready = 'READY',
}

export class Info {
  'mmu'?: boolean;
  'name'?: string;
  'location'?: string;
  'farmMode'?: boolean;
  'nozzleDiameter'?: number;
  'minExtrusionTemp'?: number;
  'serial'?: string;
  'sdReady'?: boolean;
  'activeCamera'?: boolean;
  'hostname'?: string;
  'port'?: string;
  'networkErrorChime'?: boolean;
}

export async function getInfo(config: Config) {
  const { DigestClient } = await import('digest-fetch');
  const client = new DigestClient(config.username, config.password, {
    basic: true,
  });

  const response = await client.fetch(
    new URL('/api/v1/info', `http://${config.ip}`).toString(),
  );
  if (!response.ok) {
    throw new Error('Error fetching /api/v1/info');
  }

  if (response.status === 401) {
    throw new Error('unauthorized');
  }

  if (response.status !== 200) {
    throw new Error(`Unexpected status code ${response.status}`);
  }

  return (await response.json()) as Info;
}

export async function getStatus(config: Config) {
  const { DigestClient } = await import('digest-fetch');
  const client = new DigestClient(config.username, config.password, {
    basic: true,
  });

  const response = await client.fetch(
    new URL('/api/v1/status', `http://${config.ip}`).toString(),
  );
  if (!response.ok) {
    throw new Error('Error fetching /api/v1/status');
  }

  if (response.status !== 200) {
    throw new Error(`Unexpected status code ${response.status}`);
  }

  return (await response.json()) as {
    printer: StatusPrinter;
  };
}
