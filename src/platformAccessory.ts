import { Service, PlatformAccessory } from "homebridge";

import { PrusalinkHomebridgePlatform } from "./platform";
import { Info, StatusPrinter } from "./api";
import { Config } from "./config";

export class PrusalinkPlatformAccessory {
  private tempService: Service;

  constructor(
    private readonly platform: PrusalinkHomebridgePlatform,
    private readonly accessory: PlatformAccessory<{
      config: Config;
      info: Info;
    }>,
  ) {
    // set accessory information
    const accessoryCharacteristics = this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.Manufacturer,
        "Prusa Research",
      )
      .setCharacteristic(this.platform.Characteristic.Model, "Prusa MK4");
    const serialNumber = (accessory.context.info as Info).serial;
    if (serialNumber) {
      accessoryCharacteristics.setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        serialNumber,
      );
    }

    // you can create multiple services for each accessory
    this.tempService =
      this.accessory.getService(this.platform.Service.TemperatureSensor) ||
      this.accessory.addService(this.platform.Service.TemperatureSensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.tempService.setCharacteristic(
      this.platform.Characteristic.Name,
      "Temperature Sensor",
    );
    // this.nozzleTempService.getCharacteristic(this.platform.Characteristic.StatusActive, false);
    this.tempService
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(async () => {
        this.platform.log.debug("Fetching nozzle temp");
        const response = await fetch(
          new URL(
            "/api/v1/status",
            `http://${this.accessory.context.config.ip}`,
          ).toString(),
          { headers: { "X-Api-Key": this.accessory.context.config.password } },
        );

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

        const status = (await response.json()) as { printer: StatusPrinter };

        if (!status.printer.temp_nozzle || !status.printer.temp_bed) {
          throw new this.platform.api.hap.HapStatusError(
            this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
          );
        }

        if (status.printer.target_nozzle || status.printer.target_bed) {
          throw new this.platform.api.hap.HapStatusError(
            this.platform.api.hap.HAPStatus.RESOURCE_BUSY,
          );
        }

        this.tempService
          .getCharacteristic(this.platform.Characteristic.StatusActive)
          .setValue(
            // inactive if attempting to reach a specific temp (preheating or actively printing)
            !(status.printer.target_bed || status.printer.target_nozzle) &&
              // inactive if "cooling down" (temps are way different than each other)
              Math.abs(status.printer.temp_nozzle - status.printer.temp_bed) <
                this.accessory.context.config.maxDelta,
          );

        // use average temp as the actual value, it's kind of annoying to deal with two sensors
        return (status.printer.temp_nozzle + status.printer.temp_bed) / 2;
      });
  }
}
