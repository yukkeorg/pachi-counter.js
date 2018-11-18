'use strict'

const EventEmmiter = require('events')
const HID = require('node-hid')


class UsbIO2 extends EventEmmiter {
    constructor(interval=100) {
        super()

        this.inspect_interval = interval  // unit: ms
        this.RW_CMD = [0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]

        this.device = new HID.HID(0x1352, 0x120)
        this.device.on('data', this._on_data.bind(this))
        this._prev_data = null

        this._inspect()
    }

    close() {
        this.device.close()
    }

    _on_data(data) {
        // USB-IO2側の回路はプルアップされており、ON=0, OFF=1と
        // なるため、取得したデータが反転していることを考慮する。
        let now_data = (~((data[2] << 8) + data[1])) & 0x7f
        if(now_data !== this._prev_data) {
            // ビットが 0 -> 1 になったところを検出
            // (prev_data XOR now_data) AND now_data
            const onbits = (this._prev_data ^ now_data) & now_data
            // ビットが 1 -> 0 になったところを検出
            // (prev_data XOR now_data) AND (NOT now_data)
            const offbits = (this._prev_data ^ now_data) & ~now_data
            this.emit('changed', now_data, onbits, offbits)
            this._prev_data = now_data
        }
    }

    _inspect() {
        try {
            this.device.write(this.RW_CMD)
        } catch(e) {
            console.log(`Ignore exception: ${e}`)
        }
        setTimeout(this._inspect.bind(this), this.inspect_interval)
    }
}

module.exports = UsbIO2