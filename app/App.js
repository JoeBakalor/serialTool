import { extendObservable } from 'mobx'
import axios from 'axios'
import SerialPort from 'serialport'
import {
  commandPayload,
  ACTION_SET,
  LIGHT_POWER,
  LIGHT_LEVEL,
  DEVICE_ID,
  FIRMWARE_VERSION,
  API_VERSION,
  DEVICE_KEY,
  MQTT_ENDPOINT,
  CERT_MODE,
  MQTT_PEM_CERTIFICATE,
  MQTT_PRIVATE_KEY,
  WIFI_SSID,
  WIFI_PASSWORD,
  WIFI_USERNAME,
  WIFI_AUTH_TYPE,
  FAN_POWER,
  FAN_SPEED,
} from './uart'
import { resolve } from 'upath'

const USER_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiJSdHRjOHcyRXRpTHFSU0h2WSIsImNyZWF0ZWRBdCI6IjIwMTYtMDQtMDVUMTg6MzI6MjkuMDMzWiIsImVtYWlscyI6W3siYWRkcmVzcyI6ImNAYy5jb20iLCJ2ZXJpZmllZCI6dHJ1ZX1dLCJwcm9maWxlIjp7Im5hbWUiOiJEZW1vIn0sImxvY2F0aW9ucyI6WyJvSGRNZm1TOWdyelQ5YjdUcyIsImpmaHJ1RTQ5NjhGa2RpdDdFIiwiYmhMUURXSExZOTJQQWlSdzIiLCJmUk1iUnozb3doUEFNTDZSdCJdLCJpbnN0cnVjdGlvbnNTaG93biI6eyJhZGREZXZpY2UiOnRydWUsInN3aXRjaFJvb21zIjp0cnVlfSwiaXNPd25lciI6dHJ1ZSwiaXNFbmFibGVkIjp0cnVlLCJpYXQiOjE1MjI4OTMzNTUsImV4cCI6MTU1NDQ1MDk1NX0.lsYKxiAFkuh-aFZFFvQJBbUGbWPScddw9k33yzngNLg'
const API_HEADERS = {
  Authorization: 'Bearer ' + USER_TOKEN,
}
const BASE_URL = 'https://g1x6o66pdg.execute-api.us-east-1.amazonaws.com/dev'

const WEP_ENABLED = 0x0001
const TKIP_ENABLED = 0x0002
const AES_ENABLED = 0x0004
const SHARED_ENABLED = 0x00008000
const WPA_SECURITY = 0x00200000
const WPA2_SECURITY = 0x00400000
const ENTERPRISE_ENABLED = 0x02000000
const WPS_ENABLED = 0x10000000
const IBSS_ENABLED = 0x20000000

export const WIFI_SECURITY_TYPES = {
  WICED_SECURITY_OPEN: 0, //< Open security
  WICED_SECURITY_WEP_PSK: WEP_ENABLED, //< WEP PSK Security with open authentication
  WICED_SECURITY_WEP_SHARED: WEP_ENABLED | SHARED_ENABLED, //< WEP PSK Security with shared authentication
  WICED_SECURITY_WPA_TKIP_PSK: WPA_SECURITY | TKIP_ENABLED, //< WPA PSK Security with TKIP
  WICED_SECURITY_WPA_AES_PSK: WPA_SECURITY | AES_ENABLED, //< WPA PSK Security with AES
  WICED_SECURITY_WPA_MIXED_PSK: WPA_SECURITY | AES_ENABLED | TKIP_ENABLED, //< WPA PSK Security with AES & TKIP
  WICED_SECURITY_WPA2_AES_PSK: WPA2_SECURITY | AES_ENABLED, //< WPA2 PSK Security with AES
  WICED_SECURITY_WPA2_TKIP_PSK: WPA2_SECURITY | TKIP_ENABLED, //< WPA2 PSK Security with TKIP
  WICED_SECURITY_WPA2_MIXED_PSK: WPA2_SECURITY | AES_ENABLED | TKIP_ENABLED, //< WPA2 PSK Security with AES & TKIP
  WICED_SECURITY_WPA_TKIP_ENT: ENTERPRISE_ENABLED | WPA_SECURITY | TKIP_ENABLED, //< WPA Enterprise Security with TKIP
  WICED_SECURITY_WPA_AES_ENT: ENTERPRISE_ENABLED | WPA_SECURITY | AES_ENABLED, //< WPA Enterprise Security with AES
  WICED_SECURITY_WPA_MIXED_ENT:
    ENTERPRISE_ENABLED | WPA_SECURITY | AES_ENABLED | TKIP_ENABLED, //< WPA Enterprise Security with AES & TKIP
  WICED_SECURITY_WPA2_TKIP_ENT:
    ENTERPRISE_ENABLED | WPA2_SECURITY | TKIP_ENABLED, //< WPA2 Enterprise Security with TKIP
  WICED_SECURITY_WPA2_AES_ENT: ENTERPRISE_ENABLED | WPA2_SECURITY | AES_ENABLED, //< WPA2 Enterprise Security with AES
  WICED_SECURITY_WPA2_MIXED_ENT:
    ENTERPRISE_ENABLED | WPA2_SECURITY | AES_ENABLED | TKIP_ENABLED, //< WPA2 Enterprise Security with AES & TKIP
  WICED_SECURITY_IBSS_OPEN: IBSS_ENABLED, //< Open security on IBSS ad-hoc network
  WICED_SECURITY_WPS_OPEN: WPS_ENABLED, //< WPS with open security
  WICED_SECURITY_WPS_SECURE: WPS_ENABLED | AES_ENABLED, //< WPS with AES security
  WICED_SECURITY_UNKNOWN: -1, //< May be returned by scan function if security is unknown. Do not pass this to the join function!
  WICED_SECURITY_FORCE_32_BIT: 0x7fffffff,
}
console.log('WIFI_SECURITY_TYPES', WIFI_SECURITY_TYPES)

class App {
  constructor() {
    extendObservable(this, {
      creatingDevice: false,
      isPortOpen: false,
      selectedPort: '',
      things: [],
      ports: [],
      rows: [],
      desiredLightLevel: 50,
      wifiSsid: '',
      wifiAuthType: null,
      wifiUsername: '',
      wifiPassword: '',
      wifiAuthType: '',
      get isWifiEnterprise() {
        return /ENT$/.test(this.wifiAuthType)
      },
      get isWifiRequirePassword() {
        return this.wifiAuthType && !/OPEN$/.test(this.wifiAuthType)
      },
      get canConnectWifi() {
        if (!this.wifiAuthType || !this.wifiSsid.trim()) {
          return false
        }
        if (!this.isWifiRequirePassword) {
          return true
        }
        if (
          this.isWifiEnterprise &&
          (!this.wifiUsername.trim() || !this.wifiPassword.trim())
        ) {
          return false
        }
        if (this.isWifiRequirePassword && !this.wifiPassword.trim()) {
          return false
        }
        return true
      },
    })
    this.uartChar = ''
    this.port = null
    this.blastingAws = false
  }

  async createThing() {
    try {
      if (this.creatingDevice) {
        return
      }
      this.creatingDevice = true
      const response = await axios.post(
        `${BASE_URL}/create-device`,
        {
          type: 'ceiling-fan',
        },
        {
          headers: API_HEADERS,
        }
      )
      await this.loadThings()
    } catch (e) {
      console.log('createThing.e', e)
      alert('Something went wrong creating the device data')
    } finally {
      this.creatingDevice = false
    }
  }

  async loadThings() {
    try {
      const response = await axios.get(`${BASE_URL}/things/serial`, {
        headers: API_HEADERS,
      })
      console.log('devices', response.data)
      this.things.replace(response.data)
    } catch (e) {
      console.log('loadThings.e', e)
    }
  }

  async deleteThing(device) {
    try {
      if (device.deleting) {
        return
      }
      device.deleting = true
      axios.delete(`${BASE_URL}/devices/${device._id}`, {
        headers: API_HEADERS,
      })
      // No idea why we have to do this, but we do
      await new Promise((r) => setTimeout(r, 500))
      await this.loadThings()
    } catch (e) {
      alert('Error deleting thing')
      console.log('deleteThing.e', e)
    }
  }

  async loadSerialPorts() {
    try {
      if (this.port && this.port.isOpen) {
        await new Promise((r) => this.port.close(r))
      }
      this.selectedPort = ''
      const ports = await SerialPort.list()
      console.log('ports', ports)
      this.ports.replace(ports)
    } catch (e) {
      alert('Something went wrong fetching the serial ports')
      console.log('loadSerialPorts.e', e)
    }
  }

  async changePort(selectedPort) {
    this.selectedPort = selectedPort
    if (this.port && this.port.isOpen) {
      await new Promise((r) => this.port.close(r))
    }
    if (selectedPort) {
      this.port = new SerialPort(selectedPort, {
        baudRate: 115200,
      })
      this.port.on('open', () => {
        console.log(`${selectedPort} opened`)
        this.isPortOpen = true
      })
      this.port.on('close', () => {
        console.log(`${selectedPort} closed`)
        this.isPortOpen = false
      })
      this.port.on('error', (e) => {
        console.log(`${selectedPort} error: ${e}`)
        this.isPortOpen = false
      })
      this.port.on('data', (data) => {
        for (const byte of data) {
          const str = String.fromCharCode(byte)
          this.uartChar += str
          if (str === '\r') {
            this.rows.push({ dir: 'in', msg: this.uartChar })
            this.uartChar = ''
            this.logListBottom && this.logListBottom.scrollIntoView()
          }
        }
      })
      console.log(`opened ${selectedPort}`)
    }
  }

  async configureThing(thing) {
    if (!this.port || !this.port.isOpen) {
      return
    }

    console.log('writing device id')
    await this.write(
      commandPayload({
        action: ACTION_SET,
        property: DEVICE_ID,
        value: thing.deviceId,
        doNotHexValue: true,
      }) + '\r'
    )
    await new Promise((r) => setTimeout(r, 1000))

    console.log('writing ble private key')
    await this.write(
      commandPayload({
        action: ACTION_SET,
        property: DEVICE_KEY,
        value: thing.privateKey,
      }) + '\r'
    )
    await new Promise((r) => setTimeout(r, 1000))

    console.log('writing mqtt endpoint')
    await this.write(
      commandPayload({
        action: ACTION_SET,
        property: MQTT_ENDPOINT,
        value: 'ayzmgqkrp6tu7.iot.us-east-1.amazonaws.com',
        doNotHexValue: true,
      }) + `\r`
    )
    await new Promise((r) => setTimeout(r, 1000))

    console.log('writing certificate private key')
    await this.write(
      commandPayload({
        action: ACTION_SET,
        property: CERT_MODE,
        value: 0xff,
      }) + '\r'
    )
    await new Promise((r) => setTimeout(r, 1000))
    await this.write(
      commandPayload({
        action: ACTION_SET,
        property: MQTT_PRIVATE_KEY,
        value: thing.generated.certificate.keyPair.PrivateKey,
        doNotHexValue: true,
      }) + '\r\r'
    )
    await new Promise((r) => setTimeout(r, 1000))

    console.log('writing certificate')
    await this.write(
      commandPayload({
        action: ACTION_SET,
        property: CERT_MODE,
        value: 0xff,
      }) + '\r'
    )
    await new Promise((r) => setTimeout(r, 1000))
    await this.write(
      commandPayload({
        action: ACTION_SET,
        property: MQTT_PEM_CERTIFICATE,
        value: thing.generated.certificate.certificatePem,
        doNotHexValue: true,
      }) + '\r\r'
    )
  }

  setLightPower(lightPower) {
    // @TODO: Use `commandPayload`
    this.write(
      commandPayload({
        action: ACTION_SET,
        property: LIGHT_POWER,
        value: Number(lightPower),
      }) + '\r'
    )
    // this.write(
    //   lightPower
    //     ? 'ffffff01030181018307090909090909090909\r'
    //     : 'ffffff02030181008206090909090909090909\r'
    // )
  }

  scanWifiSsids() {
    // @TODO: Use `commandPayload`
    this.write(`ffffff0102020d0f11090909090909090909\r`)
  }

  sendLightLevel() {
    if (!this.port || !this.port.isOpen) {
      return
    }
    this.write(
      commandPayload({
        action: ACTION_SET,
        property: LIGHT_LEVEL,
        value: this.desiredLightLevel,
      }) + '\r'
    )
  }

  setFanPower(fanPower) {
    this.write(
      commandPayload({
        action: ACTION_SET,
        property: FAN_POWER,
        value: Number(fanPower),
      }) + '\r'
    )
  }

  setFanSpeed(fanSpeed) {
    this.write(
      commandPayload({
        action: ACTION_SET,
        property: FAN_SPEED,
        value: fanSpeed,
      }) + '\r'
    )
  }

  async connectWiFi() {
    console.log('wifi auth type')
    await this.write(
      commandPayload({
        action: ACTION_SET,
        property: WIFI_AUTH_TYPE,
        // @UNTESTED: Not sure if this works, check console via `npm run dev`
        // to see if the right hex value is sent for this command
        value: WIFI_SECURITY_TYPES[this.wifiAuthType],
      }) + '\r'
    )
    await sleep()

    if (this.isWifiRequirePassword) {
      console.log('wifi password')
      const passwordLength = this.wifiPassword.length
        .toString(16)
        .padStart(4, '0')
      const passwordLengthSwitched =
        passwordLength.slice(2) + passwordLength.slice(0, 2)
      await this.write(
        `ffffff${passwordLengthSwitched}010c${this.wifiPassword}` + '\r'
      )
      await sleep()
    }
    if (this.isWifiEnterprise) {
      console.log('wifi username')
      await this.write(
        commandPayload({
          action: ACTION_SET,
          property: WIFI_USERNAME,
          value: this.wifiUsername,
        }) + '\r'
      )
      await sleep()
    }

    console.log('wifi ssid (needs to come last)')
    const ssidLength = this.wifiSsid.length.toString(16).padStart(4, '0')
    const ssidLengthSwitched = ssidLength.slice(2) + ssidLength.slice(0, 2)
    await this.write(`ffffff${ssidLengthSwitched}0109${this.wifiSsid}` + '\r')
  }

  async startAwsBlast() {
    if (this.blastingAws) {
      return
    }
    this.blastingAws = true
    let toggle = false
    while (true) {
      if (!this.blastingAws) {
        break
      }
      await new Promise((r) => setTimeout(r, 500))
      toggle = !toggle
      // @TODO: Use `commandPayload`
      await this.write(
        'ffffff00020182' +
          parseInt(((toggle ? 98 : 99) / 100) * 255)
            .toString('16')
            .padStart(2, '0') +
          '\r'
      )
    }
  }

  write(data) {
    if (!this.port || !this.port.isOpen) {
      return
    }
    console.log(data)
    this.rows.push({ dir: 'out', msg: data })
    this.logListBottom && this.logListBottom.scrollIntoView()
    return new Promise((resolve, reject) => {
      this.port.write(data)
      this.port.drain(resolve)
    })
  }

  stopAwsBlast() {
    this.blastingAws = false
  }
}

function sleep(ms = 1000) {
  return new Promise((r) => setTimeout(r, ms))
}

export default new App()
