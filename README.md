<p align="center">

<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

# Homebridge Eero Presence

Use your Eero routers as occupancy sensors. There's inherent delay for your devices to swap routers, but for general monitoring this works pretty well.

I use this to automatically open my blinds when we leave the bedroom and go to our main space in the morning.

## Config

To get a user token, run `npm run auth` and follow the prompts.

```
❯ npm run auth

> @apexskier/homebridge-eero-presence@1.0.1 auth
> node auth.js

login identifier (email or phone, amazon login not supported): hi@example.com
verification code: 123123
user token: 99999999|exampleexampleexampleexamp
```

The easiest way to do this is through the homebridge UI's terminal. After installing the plugin, visit `http://{{yourhomebridgeurl}}/platform-tools/terminal` and run `node node_modules/@apexskier/homebridge-eero-presence/auth.js`

![image001](https://github.com/user-attachments/assets/e3258cb1-2f8e-4b47-8113-b2f02269a9a3)
