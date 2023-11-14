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
import { PrusalinkPlatformAccessory } from "./platformAccessory";
import { Config } from "./config";
import { Info } from "./api";

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class PrusalinkHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory<{
    config: Config;
    info: Info;
  }>[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug("Finished initializing platform:", this.config);

    const userConfig = this.config as unknown as Config;
    if (!userConfig.ip) {
      this.log.error("No IP address configured");
      return;
    }
    if (!userConfig.model) {
      this.log.error("No model configured");
      return;
    }
    if (!userConfig.password) {
      this.log.error("No password configured");
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
  configureAccessory(
    accessory: PlatformAccessory<{ config: Config; info: Info }>,
  ) {
    this.log.info("Loading accessory from cache:", accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  async discoverDevices() {
    const config = this.config as unknown as Config;

    const response = await fetch(
      new URL("/api/v1/info", `http://${config.ip}`).toString(),
      { headers: { "X-Api-Key": config.password } },
    );

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

    const info = (await response.json()) as Info;
    if (!info.serial) {
      throw new Error("no serial number");
    }

    this.log.info("successfully found printer", info.serial);

    const uuid = this.api.hap.uuid.generate(info.serial);

    // see if an accessory with the same uuid has already been registered and restored from
    // the cached devices we stored in the `configureAccessory` method above
    let existingAccessory = this.accessories.find(
      (accessory) => accessory.UUID === uuid,
    );
    if (
      existingAccessory &&
      existingAccessory.context.info.serial !== info.serial
    ) {
      this.log.warn("serial number mismatch, unregistering old accessory");
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
        existingAccessory,
      ]);
      existingAccessory = undefined;
    }

    if (existingAccessory) {
      // the accessory already exists
      this.log.info(
        "Restoring existing accessory from cache:",
        existingAccessory.displayName,
        existingAccessory.context.info.serial,
      );

      existingAccessory.context.info = info;
      existingAccessory.context.config = config;
      this.api.updatePlatformAccessories([existingAccessory]);

      new PrusalinkPlatformAccessory(this, existingAccessory);
    } else {
      this.log.info("Adding new accessory");

      // create a new accessory
      const accessory = new this.api.platformAccessory(
        config.model || info.name || info.hostname || "PrusaLink",
        uuid,
      ) as PlatformAccessory<{ config: Config; info: Info }>;
      accessory.context.info = info;
      accessory.context.config = config;

      new PrusalinkPlatformAccessory(this, accessory);

      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
        accessory,
      ]);
    }
  }
}
