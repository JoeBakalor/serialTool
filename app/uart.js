import { Buffer } from 'buffer'
import fletcher from 'fletcher'
import isString from 'lodash/isString'
import chunk from 'lodash/chunk'
import isUndefined from 'lodash/isUndefined'

// State types
export const DEVICE_ID = 0x01
export const FIRMWARE_VERSION = 0x02
export const API_VERSION = 0x03
export const DEVICE_KEY = 0x04
export const MQTT_ENDPOINT = 0x05
export const MQTT_PEM_CERTIFICATE = 0x06
export const MQTT_PUBLIC = 0x07
export const MQTT_PRIVATE_KEY = 0x08
export const CERT_MODE = 0xff

export const WIFI_STATUS = 0x80
export const LIGHT_POWER = 0x81
export const LIGHT_LEVEL = 0x82
export const FAN_POWER = 0x83
export const FAN_SPEED = 0x84
export const FAN_DIRECTION = 0x85
export const DEVICE_TYPE = 0x14
export const WIFI_SSIDS = 0x0d
export const WIFI_SSID = 0x09
export const WIFI_AUTH_TYPE = 0x0a
export const WIFI_USERNAME = 0x0b
export const WIFI_PASSWORD = 0x0c
export const HAS_FAN = 0x0e
export const FAN_SPEEDS = 0x0f
export const IS_FAN_REVERSIBLE = 0x10
export const LIGHT_MINIMUM_DIM_LEVEL = 0x11
export const LIGHT_TRANSITION_TIME = 0x12
export const IS_LIGHT_DIMMABLE = 0x14

// Action types
export const ACTION_DEFAULT = 0x00
export const ACTION_SET = 0x01
export const ACTION_GET = 0x02

// Status
export const STATUS_SUCCESS = 0x00
export const STATUS_FAIL = 0x01

// Determines whether we should be parsing strings
// into ascii value (10) or hex (16)
const INT_BASE = 10

// How many bytes we can BLE write at a time
const BLOCK_SIZE = 16

// Maps constant state/property values into strings
export const CONST_TO_STATE_TYPE = {
  [WIFI_STATUS]: 'wifiStatus',
  [LIGHT_POWER]: 'lightPower',
  [LIGHT_LEVEL]: 'lightLevel',
  [FAN_POWER]: 'fanPower',
  [FAN_SPEED]: 'fanSpeed',
  [FAN_DIRECTION]: 'fanDirection',
  [HAS_FAN]: 'hasFan',
  [FAN_SPEEDS]: 'fanSpeeds',
  [IS_FAN_REVERSIBLE]: 'isFanReversible',
  [LIGHT_MINIMUM_DIM_LEVEL]: 'lightMinimumDimLevel',
  [LIGHT_TRANSITION_TIME]: 'lightTransitionTime',
  [IS_LIGHT_DIMMABLE]: 'isLightDimmable',
  [WIFI_SSIDS]: 'wifiSsids',
  [WIFI_SSID]: 'wifiSsid',
  [WIFI_AUTH_TYPE]: 'wifiAuthType',
  [WIFI_USERNAME]: 'wifiUsername',
  [WIFI_PASSWORD]: 'wifiPassword',
}

// Maps string state to number constant
export const STATE_TYPE_TO_CONST = {
  wifiStatus: WIFI_STATUS,
  lightPower: LIGHT_POWER,
  lightLevel: LIGHT_LEVEL,
  fanPower: FAN_POWER,
  fanSpeed: FAN_SPEED,
  fanDirection: FAN_DIRECTION,
  hasFan: HAS_FAN,
  fanSpeeds: FAN_SPEEDS,
  isFanReversible: IS_FAN_REVERSIBLE,
  lightMinimumDimLevel: LIGHT_MINIMUM_DIM_LEVEL,
  lightTransitionTime: LIGHT_TRANSITION_TIME,
  isLightDimmable: IS_LIGHT_DIMMABLE,
  wifiSsids: WIFI_SSIDS,
}

// Constructs message payload
/*
| Segment           | Length   | Possible Value                              | Note                                           |
| ----------------- | -------- | ------------------------------------------- | ---------------------------------------------- |
| Length            | 1 byte   |                                             | Length of Action, Property/State ID, and Value |
| Action            | 1 byte   | `0x00` Set to Default
                                 `0x01` Set                                  |                                                |
                                 `0x02` Get                                  |                                                |
| Property/State ID | 1 byte   |                                             | See 2.1 Properties and 2.2 States              |
| Value             | Variable |                                             | See 2.1 Properties and 2.2 States              |
*/
export function commandPayload({ action, property, value, doNotHexValue }) {
  const message = []

  let length = 0
  // Length (adds 2 for action and property)
  if (isString(value)) {
    length = value.length + 2
  }
  // Single byte value (adds 2 for action and property)
  else if (!isUndefined(value)) {
    length = 3
  }
  // Only happens if there is no value because
  // we're probably doing a Get request, which sends no Value
  else {
    length = 2
  }
  message.push(length & 0xff, length >> 8)

  // Action
  message.push(action)

  // Property/State Id
  message.push(property)

  // Value
  if (isString(value)) {
    if (doNotHexValue) {
      message.push(...value.split(''))
    } else {
      message.push(
        ...value.split('').map((v) => parseInt(v.charCodeAt(0), INT_BASE))
      )
    }
  }
  // A number or a boolean
  else if (!isUndefined(value)) {
    message.push(parseInt(value, INT_BASE))
  }

  // Ensure message is padded to 16 bytes
  let fullMessage = ''
  if (doNotHexValue) {
    fullMessage =
      Buffer.from([255, 255, 255, ...message.slice(0, 4)]).toString('hex') +
      message.slice(4).join('')
  } else {
    fullMessage = Buffer.from([255, 255, 255, ...message]).toString('hex')
  }
  return fullMessage
}
