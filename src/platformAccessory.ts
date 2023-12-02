import { Service, PlatformAccessory } from "homebridge";

import { EeroPresenceHomebridgePlatform } from "./platform";
import { Config } from "./config";

export interface AccessoryContext {
  eero: {
    location: string;
    model: string;
    serial: string;
    url: string;
    resources: {
      led_action: string;
    };
  };
  config: Config;
}

export class EeroPresencePlatformAccessory {
  sensorService: Service;
  statusLightService: Service;

  constructor(
    private readonly platform: EeroPresenceHomebridgePlatform,
    private readonly accessory: PlatformAccessory<AccessoryContext>,
  ) {
    // set accessory information
    const accessoryCharacteristics = this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, "Eero")
      .setCharacteristic(
        this.platform.Characteristic.Model,
        this.accessory.context.eero.model,
      );
    accessoryCharacteristics.setCharacteristic(
      this.platform.Characteristic.SerialNumber,
      this.accessory.context.eero.serial,
    );

    this.sensorService =
      this.accessory.getService(this.platform.Service.OccupancySensor) ||
      this.accessory.addService(this.platform.Service.OccupancySensor);

    this.statusLightService =
      this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb);

    // future feature: support the nightlight attribute of the eero response
    // to allow control if the eero has a nightlight

    this.statusLightService
      .getCharacteristic(this.platform.Characteristic.Name)
      .setValue("Status light");

    this.statusLightService
      .getCharacteristic(this.platform.Characteristic.On)
      .onGet(async () => {
        this.platform.log.debug("getting on", this.accessory.displayName);
        const {
          data: { led_on },
        } = await (
          await this.fetch(
            `https://api-user.e2ro.com/${this.accessory.context.eero.url}`,
          )
        ).json();
        return led_on;
      })
      .onSet(async (value) => {
        this.platform.log.debug(
          "setting on",
          value,
          this.accessory.displayName,
        );
        await this.fetch(
          `https://api-user.e2ro.com${this.accessory.context.eero.resources.led_action}`,
          {
            method: "PUT",
            body: JSON.stringify({
              led_on: value,
            }),
          },
        );
      });

    this.statusLightService
      .getCharacteristic(this.platform.Characteristic.Brightness)
      .onGet(async () => {
        this.platform.log.debug(
          "getting brightness",
          this.accessory.displayName,
        );
        const {
          data: { led_brightness },
        } = await (
          await this.fetch(
            `https://api-user.e2ro.com/${this.accessory.context.eero.url}`,
          )
        ).json();
        return led_brightness;
      })
      .onSet(async (value) => {
        this.platform.log.debug(
          "setting brightness",
          value,
          this.accessory.displayName,
        );
        await this.fetch(
          `https://api-user.e2ro.com${this.accessory.context.eero.resources.led_action}`,
          {
            method: "PUT",
            body: JSON.stringify({
              led_on: !!value,
              led_brightness: value,
            }),
          },
        );
      });
  }

  async fetch(input: RequestInfo | URL, init?: RequestInit) {
    let response;
    try {
      response = await fetch(input, {
        ...init,
        headers: {
          ...init?.headers,
          "content-type": "application/json",
          cookie: `s=${this.accessory.context.config.userToken}`,
        },
      });
    } catch (error) {
      this.platform.log.error("failed to fetch");
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }

    if (!response.ok) {
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }

    if (response.status === 401) {
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.INSUFFICIENT_AUTHORIZATION,
      );
    }

    if (response.status !== 200) {
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }

    return response;
  }
}
