export function useModbus() {

  //voy a escribir otro composable para leer los registros especificos del sensor eyesonpt

  //modbus functions
  const READ_HOLDING_FN = 0x03;
  const PRESET_FN = 0x06;

  //convierto numero al formato [0x00, 0x00]
  function toByteArray(num: number): Array<number> {
    // Convert the number to a 16-bit binary string
    const binaryString = num.toString(2).padStart(16, '0');

    // Split the binary string into two 8-bit segments
    const byte1 = parseInt(binaryString.substring(0, 8), 2);
    const byte2 = parseInt(binaryString.substring(8), 2);

    // Return the two bytes in an array
    return [byte1, byte2];
  }

  function calculateCRC(data: Array<number>): Array<number> {
    let crc = 0xffff;

    for (let i = 0; i < data.length; i++) {
      crc = crc ^ data[i];
      for (let j = 0; j < 8; j++) {
        const lsb = crc & 1;
        crc = crc >> 1;
        if (lsb) {
          crc = crc ^ 0xa001;
        }
      }
    }

    console.log(crc);

    const lowByte = crc & 0xff;
    const highByte = (crc >> 8) & 0xff;

    // Return the CRC as an array of two bytes
    return [lowByte, highByte];
  }

  function _getDeviceId(deviceName: string): Array<number> {
    const decimalId = parseInt(deviceName.split('-')[1]);
    const byteArray = toByteArray(decimalId);
    //[mascara, 24?, id en dos bytes]
    return [0xff, 0x18, ...byteArray];
  }
  /**
   * Devuele la trama acomodada en la especificacion de modbus de tecss
   * [slaveId, fn, starting address, data or quantity of registers, crc checksum]
   * @param slaveId - id del dispositivo conectado
   * @param fn - el codigo de la funcion modbus 0x06 para preset (escribir), 0x03 para read holding (leer)
   * @param address - dirección inicial para comenzar e leer
   * @param data - datos a enviar o cantidad de registros a leer
   * @returns - una trama formateada en la especificación de tecss
   */
  function _formatModbusDataFrame(deviceName: string, fn: number, address: Array<number>, data: Array<number>): Array<number> {
    const noCRCFrame = [..._getDeviceId(deviceName), fn, ...address, ...data];
    const crc = calculateCRC(noCRCFrame);
    const dataFrame = noCRCFrame.concat(crc);
    return dataFrame;
  }

  function readHoldingDataFrame(deviceName: string, address: Array<number>, dataregisterQuantity: Array<number>): Array<number> /*Promise<void>*/ {
    return _formatModbusDataFrame(deviceName, READ_HOLDING_FN, address, dataregisterQuantity);
  }

  /**
   *  Una función para formatear una trama modbus con la funcion de preset (0x06) y los datos a escribir 
   * @param slaveId - id del dispositivo conectado
   * @param address - direccion a enviar los datos 
   * @param data - datos a enviar 
   * @returns devuelve una trama formateada con la funcion preset 
   */
  function presetDataFrame(deviceName: string, address: Array<number>, data: Array<number>): Array<number> /*Promise<void>*/ {
    /*
      0x06 es un write,
      la tama se puede armar como (ej)
      [0x1, 0x06, 0x0f, 0xa0, 0x00, 0x00,0x4b, 0x3c]
    */
    return _formatModbusDataFrame(deviceName, PRESET_FN, address, data);
  }

  function cutDataFromDataFrame(buffer: ArrayBuffer): Uint8Array {
    return  new Uint8Array(buffer.slice(6, 8));
    //return data[0] * 256 + data[1];
  }


  return {
    cutDataFromDataFrame,
    readHoldingDataFrame,
    presetDataFrame,
    toByteArray,
    calculateCRC
  }
}