'use strict';
const {format} = require('util');
const EventEmmiter = require('events');
const log4js = require('log4js');
const HID = require('node-hid');

const logger = log4js.getLogger();


const USBIO20_VENDORID = 0x1352;
const USBIO20_PRODUCTID_ORIG = 0x0120;  // ORIGINAL
const USBIO20_PRODUCTID_AKI  = 0x0121;  // AKIZUKI COMPATIBLE
const USBIO20_RW_CMD = [
  // WRITE-READ COMMAND
  0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
];


class UsbIO2 extends EventEmmiter {
  constructor(interval=100) {
    super();

    this.inspect_interval = interval;  // unit: ms
    this.device = null;
    this._prev_data = null;
  }

  detect() {
    if(this.device != null) {
      return;
    }

    const devices = HID.devices();
    const detected = devices.filter(d => {
      return (d.vendorId === USBIO20_VENDORID &&
              (d.productId === USBIO20_PRODUCTID_ORIG ||
               d.productId === USBIO20_PRODUCTID_AKI))
    });
    if(detected.length > 0) {
      logger.info("USB-IO2.0 detected.");
      this.setup(detected[0].path);
    } else {
      logger.debug("Waiting for to connect USB-IO2.0.");
      setTimeout(this.detect.bind(this), 100);
    }
  }

  setup(path = null) {
    if(path != null) {
      this.device = new HID.HID(path);
    } else {
      // USB-IO2.0 = VendorID: 0x1352, ProductID:0x0120
      this.device = new HID.HID(USBIO20_VENDORID, USBIO20_PRODUCTID);
    }
    this.device.on('data', this._on_data.bind(this));
    this._inspect();
  }

  close() {
    this.device.close();
  }

  _on_data(data) {
    // USB-IO2側の回路がプルアップしており、
    // ON、OFFが読み取ったデータ上0, 1となっているため、
    // 反転して、補正する。
    let now_data = (~((data[2] << 8) + data[1])) & 0x7f;
    logger.trace("raw_data:" + data[0].toString(16) + " " + data[1].toString(16) + " " + data[2].toString(16));
    logger.trace("now_data: " + now_data.toString(16));

    if(now_data !== this._prev_data) {
      // ビットが 0 -> 1 になったところを検出
      // (prev_data XOR now_data) AND now_data
      const onbits = (this._prev_data ^ now_data) & now_data;
      // ビットが 1 -> 0 になったところを検出
      // (prev_data XOR now_data) AND (NOT now_data)
      const offbits = (this._prev_data ^ now_data) & ~now_data;

      this.emit('changed', now_data, onbits, offbits);

      this._prev_data = now_data;
    }
  }

  _inspect() {
    try {
      this.device.write(USBIO20_RW_CMD);
    } catch(e) {
      logger.warn(`Ignore exception: ${e}`)
    }
    setTimeout(this._inspect.bind(this), this.inspect_interval);
  }
}

module.exports = UsbIO2;