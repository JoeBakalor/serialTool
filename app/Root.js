import React, { Component } from 'react'
import { observer } from 'mobx-react'
import app, { WIFI_SECURITY_TYPES } from './App'

class Root extends Component {
  componentDidMount() {
    app.loadThings()
    app.loadSerialPorts()
    if (app.port && app.port.isOpen) {
      app.port.close()
    }
  }

  render() {
    return (
      <div
        style={{
          display: 'flex',
          flex: 1,
          height: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 10,
            width: 470,
            marginRight: 20,
          }}
        >
          <div style={{ marginBottom: 20 }}>
            Select serial port: <Ports />
            <button onClick={() => app.loadSerialPorts()}>Refresh Ports</button>
          </div>
          <div className="thing-buttons" style={{ marginBottom: 20 }}>
            <button
              disabled={app.creatingDevice}
              onClick={() => app.createThing()}
              style={{ marginRight: 10 }}
            >
              Create Device
            </button>
            <button
              disabled={!app.isPortOpen}
              onClick={() => app.setLightPower(true)}
            >
              Light On
            </button>
            <button
              disabled={!app.isPortOpen}
              onClick={() => app.setLightPower(false)}
            >
              Light Off
            </button>
            <button
              disabled={!app.isPortOpen}
              onClick={() => app.scanWifiSsids()}
            >
              Scan WiFi SSIDs
            </button>
          </div>
          <div className="thing-buttons" style={{ marginBottom: 10 }}>
            <input
              disabled={!app.isPortOpen}
              type="number"
              placeholder="light level 0-100"
              style={{ width: 60 }}
              value={app.desiredLightLevel}
              onChange={(e) => (app.desiredLightLevel = Number(e.target.value))}
            />
            <button
              disabled={!app.isPortOpen}
              onClick={() => app.sendLightLevel()}
            >
              Send Light Level
            </button>
          </div>
          <div className="thing-buttons" style={{ marginBottom: 10 }}>
            <button
              disabled={!app.isPortOpen}
              onClick={() => app.setFanPower(true)}
            >
              Fan On
            </button>
            <button
              disabled={!app.isPortOpen}
              onClick={() => app.setFanPower(false)}
            >
              Fan Off
            </button>
          </div>
          <div style={{ marginBottom: 10 }}>
            {Array(7)
              .fill(0)
              .map((n, i) => {
                return (
                  <button
                    key={i}
                    disabled={!app.isPortOpen}
                    onClick={() => app.setFanSpeed(i + 1)}
                  >
                    Speed {i + 1}
                  </button>
                )
              })}
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ marginRight: 20 }}>
              SSID:{' '}
              <input
                value={app.wifiSsid}
                onChange={(e) => (app.wifiSsid = e.target.value)}
              />
            </div>
            <div style={{ marginRight: 20 }}>
              Wifi Auth Type:{' '}
              <select
                value={app.wifiAuthType}
                onChange={(e) => (app.wifiAuthType = e.target.value)}
              >
                <option>Select</option>
                {Object.entries(WIFI_SECURITY_TYPES).map(([name, value]) => {
                  return (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  )
                })}
              </select>
            </div>
            {app.isWifiEnterprise ? (
              <div style={{ marginRight: 20 }}>
                Wifi Username (optional):{' '}
                <input
                  value={app.wifiUsername}
                  onChange={(e) => (app.wifiUsername = e.target.value)}
                />
              </div>
            ) : null}
            {app.isWifiRequirePassword ? (
              <div>
                Wifi Password:{' '}
                <input
                  value={app.wifiPassword}
                  onChange={(e) => (app.wifiPassword = e.target.value)}
                />
              </div>
            ) : null}
          </div>
          <div>
            <button
              onClick={() => app.connectWiFi()}
              disabled={!app.canConnectWifi || !app.port}
            >
              Connect To WiFi
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Things />
          </div>
        </div>
        <div
          style={{
            flex: 1,
          }}
        >
          <Logs />
        </div>
      </div>
    )
  }
}

const Logs = observer(function Logs() {
  const { rows } = app
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {rows.length ? (
        <div style={{ padding: '10px 0' }}>
          <button onClick={() => app.rows.clear()}>Clear</button>
        </div>
      ) : null}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0 10px 10px 0',
          fontFamily: 'Courier New',
        }}
      >
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              color: row.dir === 'out' ? 'green' : null,
              fontWeight: row.dir === 'out' ? 'bold' : 'normal',
              wordWrap: 'break-word',
              wordBreak: 'break-all',
            }}
          >
            {row.msg
              .replace(/\r\n/g, '⏎')
              .replace(/\r/g, '⏎')
              .replace(/\n/g, '⏎')}
          </div>
        ))}
        <div
          ref={(ref) => {
            app.logListBottom = ref
          }}
        />
      </div>
    </div>
  )
})

const Things = observer(function Things(props) {
  if (!app.things.length) {
    return null
  }
  return (
    <table style={{ margin: '20px 0' }}>
      <thead>
        <tr>
          <th>Device Id</th>
          <th>Welcome Code</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {app.things.map((thing) => {
          return (
            <tr key={thing._id}>
              <td>{thing.deviceId}</td>
              <td>{thing.generated.welcomeCode}</td>
              <td className="thing-buttons">
                <button
                  disabled={!app.isPortOpen}
                  onClick={() => app.configureThing(thing)}
                >
                  Configure
                </button>
                <button
                  disabled={thing.deleting}
                  onClick={() => app.deleteThing(thing)}
                >
                  Delete
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
})

const Ports = observer(function Ports(props) {
  return (
    <select
      onChange={(e) => app.changePort(e.target.value)}
      value={app.selectedPort}
    >
      <option />
      {app.ports.map((port) => (
        <option key={port.comName} value={port.comName}>
          {port.comName}
        </option>
      ))}
    </select>
  )
})

export default observer(Root)
