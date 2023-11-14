<p align="center">

<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

<span align="center">

# Homebridge Prusalink

</span>

Use your Prusa 3D printer as a temperature sensor.

### Watch For Changes and Build Automatically

If you want to have your code compile automatically as you make changes, and restart Homebridge automatically between changes, you first need to add your plugin as a platform in `~/.homebridge/config.json`:

```
{
...
    "platforms": [
        {
            "name": "Config",
            "port": 8581,
            "platform": "config"
        },
        {
            "name": "<PLUGIN_NAME>",
            //... any other options, as listed in config.schema.json ...
            "platform": "<PLATFORM_NAME>"
        }
    ]
}
```

and then you can run:

```shell
$ npm run watch
```

This will launch an instance of Homebridge in debug mode which will restart every time you make a change to the source code. It will load the config stored in the default location under `~/.homebridge`. You may need to stop other running instances of Homebridge while using this command to prevent conflicts. You can adjust the Homebridge startup command in the [`nodemon.json`](./nodemon.json) file.

### Publish Package

When you are ready to publish your plugin to [npm](https://www.npmjs.com/), make sure you have removed the `private` attribute from the [`package.json`](./package.json) file then run:

```shell
$ npm publish
```

If you are publishing a scoped plugin, i.e. `@username/homebridge-xxx` you will need to add `--access=public` to command the first time you publish.

#### Publishing Beta Versions

You can publish _beta_ versions of your plugin for other users to test before you release it to everyone.

```shell
# create a new pre-release version (eg. 2.1.0-beta.1)
$ npm version prepatch --preid beta

# publish to @beta
$ npm publish --tag=beta
```

Users can then install the _beta_ version by appending `@beta` to the install command, for example:

```shell
$ sudo npm install -g homebridge-example-plugin@beta
```

### Best Practices

Consider creating your plugin with the [Homebridge Verified](https://github.com/homebridge/verified) criteria in mind. This will help you to create a plugin that is easy to use and works well with Homebridge.
You can then submit your plugin to the Homebridge Verified list for review.
The most up-to-date criteria can be found [here](https://github.com/homebridge/verified#requirements).
For reference, the current criteria are:

- The plugin must successfully install.
- The plugin must implement the [Homebridge Plugin Settings GUI](https://github.com/oznu/homebridge-config-ui-x/wiki/Developers:-Plugin-Settings-GUI).
- The plugin must not start unless it is configured.
- The plugin must not execute post-install scripts that modify the users' system in any way.
- The plugin must not contain any analytics or calls that enable you to track the user.
- The plugin must not throw unhandled exceptions, the plugin must catch and log its own errors.
- The plugin must be published to npm and the source code available on GitHub.
  - A GitHub release - with patch notes - should be created for every new version of your plugin.
- The plugin must run on all [supported LTS versions of Node.js](https://github.com/homebridge/homebridge/wiki/How-To-Update-Node.js), at the time of writing this is Node.js v16 and v18.
- The plugin must not require the user to run Homebridge in a TTY or with non-standard startup parameters, even for initial configuration.
- If the plugin needs to write files to disk (cache, keys, etc.), it must store them inside the Homebridge storage directory.
