import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from "homebridge";

import { PLATFORM_NAME, PLUGIN_NAME } from "./settings";
import {
  AccessoryContext,
  EeroPresensePlatformAccessory,
} from "./platformAccessory";
import { Config } from "./config";

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class EeroPresenceHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory<AccessoryContext>[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug("Finished initializing platform:", this.config);

    if (!config.pollTime) {
      this.config.pollTime = 5000;
    }

    if (!config.userToken) {
      this.log.error("missing user token");
      return;
    }

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on("didFinishLaunching", () => {
      log.debug("Executed didFinishLaunching callback");
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory<AccessoryContext>) {
    this.log.info("Loading accessory from cache:", accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  async discoverDevices() {
    const config = this.config as unknown as Config;

    const {
      data: {
        networks: { data: networks },
      },
    } = await (
      await this.fetch("https://api-user.e2ro.com/2.2/account")
    ).json();

    const networkToUse = config.network
      ? networks.find(({ name }) => name === config.network)
      : networks[0];
    if (!networkToUse) {
      this.log.error(`network ${config.network} not found`);
    }
    this.log.info("using network", networkToUse.name);

    const { data: network } = await (
      await this.fetch(`https://api-user.e2ro.com${networkToUse.url}`)
    ).json();

    const { data: eeros } = await (
      await this.fetch(`https://api-user.e2ro.com${network.resources.eeros}`)
    ).json();
    eeros
      .filter((e) => e.provides_wifi)
      .map((eero) => {
        const uuid = this.api.hap.uuid.generate(eero.serial);

        // see if an accessory with the same uuid has already been registered and restored from
        // the cached devices we stored in the `configureAccessory` method above
        const existingAccessory = this.accessories.find(
          (accessory) => accessory.UUID === uuid,
        );
        if (existingAccessory) {
          // the accessory already exists
          this.log.info(
            "Restoring existing accessory from cache:",
            existingAccessory.displayName,
            eero.serial,
          );

          new EeroPresensePlatformAccessory(this, existingAccessory);
        } else {
          this.log.info("Adding new accessory", eero.location, eero.serial);

          // create a new accessory
          const accessory = new this.api.platformAccessory(
            [eero.location, eero.model].join(" "),
            uuid,
          ) as PlatformAccessory<AccessoryContext>;
          accessory.context.eero = eero;
          accessory.context.config = config;

          new EeroPresensePlatformAccessory(this, accessory);

          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
            accessory,
          ]);
          this.accessories.push(accessory);
        }
      });

    this.log.debug("starting polling");
    this.poll(network.resources.devices);
  }

  private poll(deviceEndpoint: string) {
    this.checkOccupancy(deviceEndpoint)
      .catch((err) => {
        this.log.error(err);
      })
      .then(() => {
        setTimeout(() => {
          this.poll(deviceEndpoint);
        }, this.config.pollTime);
      });
  }

  private async checkOccupancy(deviceEndpoint: string) {
    const { data: devices } = await (
      await fetch(`https://api-user.e2ro.com${deviceEndpoint}`, {
        method: "GET",
        headers: {
          "content-type": "application/json",
          cookie: `s=${this.config.userToken}`,
        },
      })
    ).json();

    const connectedDevices = devices
      .filter(
        (device) =>
          (this.config.deviceTypes || ["phone", "watch"]).includes(
            device.device_type,
          ) &&
          device.connection_type === "wireless" &&
          device.connected,
      )
      .filter(
        ({ connectivity: { score } }) => score > (this.config.minSignal || 0.7),
      );
    const connectedEeros = new Set(
      connectedDevices.map(({ source: { serial_number } }) =>
        this.api.hap.uuid.generate(serial_number),
      ),
    );
    this.log.debug(
      "connected devices:",
      connectedDevices
        .map(
          ({ display_name, source: { location } }) =>
            `${location}: ${display_name}`,
        )
        .join(", "),
    );
    this.accessories.forEach((accessory) => {
      accessory
        ?.getService(this.Service.OccupancySensor)
        ?.setCharacteristic(
          this.Characteristic.OccupancyDetected,
          connectedEeros.has(accessory.UUID)
            ? this.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
            : this.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED,
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
          cookie: `s=${this.config.userToken}`,
        },
      });
    } catch (error) {
      this.log.error("failed to fetch");
      throw new this.api.hap.HapStatusError(
        this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }

    if (!response.ok) {
      throw new this.api.hap.HapStatusError(
        this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }

    if (response.status === 401) {
      throw new this.api.hap.HapStatusError(
        this.api.hap.HAPStatus.INSUFFICIENT_AUTHORIZATION,
      );
    }

    if (response.status !== 200) {
      throw new this.api.hap.HapStatusError(
        this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }

    return response;
  }
}
