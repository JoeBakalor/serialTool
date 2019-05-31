# SkyPlug Serial Tool

## Installation

```
$ npm install
```

## Running

```
$ npm run start
```

## Usage

1. Select serial port
2. Press "Light On" or "Light Off" to send UART commands to turn the light on/off
3. Enter light level number 0-255 and press "Send Light Level" to send UART command to set light level
4. The green bold text is the serial command that you send and everything else is what comes in
5. The table below is a list of devices that were created on the AWS IoT system
6. Press Configure for whichever device in order to set the device id, BLE private key, MQTT certificates/private key and MQTT endpoint (this currently doesn't work because the device restarts)
7. Feel free to create new IoT devices using the "Create Device" button

### Note

1. UART commands don't work until device boot up is complete and reaches the end of the SSID scanning procedure

## Development

```
$ npm run dev
```

### Note

If you end up making a change, it is possible you'll have to Ctrl + C and re `npm run dev` to make the app not be in a stale state
