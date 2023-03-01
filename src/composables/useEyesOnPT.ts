import { useBle } from "./useBle";
import { numberToUUID } from "@capacitor-community/bluetooth-le";
import { ref } from "vue";
import { useModbus } from "./useModbus";
import { onMounted } from "vue";
import { alertController } from "@ionic/vue";

export function useEyesOnPT(DEVICE_ID: string, DEVICE_NAME: string) {

    type Register = {
        name: string,
        address: number,
        data: any,
        handler: () => Promise<void>
    };

    const { writeToCharacteristicAndWaitForResponse } = useBle();

    const { toByteArray, readHoldingDataFrame, presetDataFrame } = useModbus();

    const DEFAULT_REGISTERS = [
        {
            name: 'APP_EUI',
            value: '753778214125442A'
        },
        {
            name: 'APP_KEY',
            value: 'ACB46E292A52432381A8AF5B14E5E3AE'
        }
    ];

    const DEV_EUI_INITIAL_ADDRESS = 3010;

    const REPORT_INTERVAL_ADDRESS = 4004;

    const LORAWAN_CANAL_ADDRESS = 4005;

    const LORAWAN_DATA_RATE_ADDRESS = 4006;

    const THREE_REGISTERS = [0x00, 0x03];

    const EIGHT_REGISTERS = [0x00, 0x08];

    const SERVICE_UUID_CHAR = numberToUUID(0xffe0);

    const WRITE_UUID_CHAR = numberToUUID(0xffe9)

    const NOTIFICATION_UUID_CHAR = numberToUUID(0xffe4);

    const editableRegisters = ref<Register[]>([]);

    const devEui = ref<string>('');

    async function sendReadHoldingToEditableRegisters(): Promise<Register[]> {

        const dataFrame = readHoldingDataFrame(DEVICE_NAME, toByteArray(REPORT_INTERVAL_ADDRESS), THREE_REGISTERS);

        const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

        const data = new Uint8Array(response.buffer).slice(6, 12);

        const registers: Register[] = [
            {
                data: _parseData(data.slice(0, 2)),
                address: REPORT_INTERVAL_ADDRESS,
                name: 'REPORT_INTERVAL',
                handler: sendPresetToReportInterval
            },
            {
                data: data.slice(2, 3)[0],
                address: LORAWAN_CANAL_ADDRESS,
                name: 'LORAWAN_CANAL_HIGH',
                handler: sendPresetToLorawanHighCanal
            },
            {
                data: data.slice(3, 4)[0],
                address: LORAWAN_CANAL_ADDRESS,
                name: 'LORAWAN_CANAL_LOW',
                handler: sendPresetToLorawanLowCanal
            },
            {
                data: _parseData(data.slice(4)),
                address: LORAWAN_DATA_RATE_ADDRESS,
                name: 'LORAWAN_DATA_RATE',
                handler: sendPresetToDataRate
            }
        ];

        return registers;
    }

    async function sendReadHoldingToDevEui(): Promise<string> {

        const dataFrame = readHoldingDataFrame(DEVICE_NAME, toByteArray(DEV_EUI_INITIAL_ADDRESS), EIGHT_REGISTERS);

        const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

        const data = new Uint8Array(response.buffer).slice(6, 22);

        return new TextDecoder().decode(data);
    }
    /*
        CANAL INICIAL <CANAL INICIAL LORAWAN>
            DIRECCION = 4005 <PARTE ALTA DEL REGISTRO>
            TIPO DE DATO = ENTERO 8 BITS
            RANGO = 0 - 63  
  
        CANAL FINAL <CANAL FINAL LORAWAN>
            DIRECCION = 4005 <PARTE BAJA DEL REGISTRO>
            TIPO DE DATO = ENTERO 8 BITS
            RANGO = 0 - 63
    */
    async function sendPresetToLorawanHighCanal(): Promise<void> {
        const alert = await alertController.create({
            header: 'LORAWAN CANAL ALTO',
            subHeader: 'modificar canal alto',
            message: 'rango de 0 - 63',
            inputs: [
                {
                    name: 'value',
                    placeholder: editableRegisters.value.find(r => r.name == 'LORAWAN_CANAL_HIGH')?.data,
                    label: 'nuevo valor',
                    type: "number"
                }
            ],
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Ok',
                    handler: async (alertData) => {

                        const lowCanal = editableRegisters.value.find(r => r.name == 'LORAWAN_CANAL_LOW') as Register;

                        const highCanal = editableRegisters.value.find(r => r.name == 'LORAWAN_CANAL_HIGH') as Register;

                        const dataFrame = presetDataFrame(DEVICE_NAME, toByteArray(LORAWAN_CANAL_ADDRESS), [parseInt(alertData.value), lowCanal?.data]);

                        const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

                        const data = new Uint8Array(response.buffer).slice(7, 9);

                        highCanal.data = data[0]; //high

                        lowCanal.data = data[1]; //low

                    }
                }
            ],
        });

        await alert.present();
    }

    async function sendPresetToLorawanLowCanal(): Promise<void> {
        const alert = await alertController.create({
            header: 'LORAWAN CANAL BAJO',
            subHeader: 'modificar canal BAJO',
            message: 'rango de 0 - 63',
            inputs: [
                {
                    name: 'value',
                    placeholder: editableRegisters.value.find(r => r.name == 'LORAWAN_CANAL_BAJO')?.data,
                    label: 'nuevo valor',
                    type: 'number'
                }
            ],
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Ok',
                    handler: async (alertData) => {

                        const lowCanal = editableRegisters.value.find(r => r.name == 'LORAWAN_CANAL_LOW') as Register;

                        const highCanal = editableRegisters.value.find(r => r.name == 'LORAWAN_CANAL_HIGH') as Register;

                        const dataFrame = presetDataFrame(DEVICE_NAME, toByteArray(LORAWAN_CANAL_ADDRESS), [highCanal.data, parseInt(alertData.value)]);

                        const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

                        const data = new Uint8Array(response.buffer).slice(7, 9);

                        highCanal.data = data[0]; //high

                        lowCanal.data = data[1]; //low

                    }
                }
            ],
        });

        await alert.present();
    }

    async function sendPresetToDataRate(): Promise<void> {
        const alert = await alertController.create({
            header: 'DATA_RATE',
            subHeader: 'modificar frecuencia de datos',
            message: 'rango de 0 - 5',
            inputs: [
                {
                    name: 'value',
                    placeholder: editableRegisters.value.find(r => r.name == 'LORAWAN_DATA_RATE')?.data,
                    label: 'nuevo valor',
                    type: 'number'
                },
            ],
            buttons: [

                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Automatico',
                    handler: async () => {

                        const automaticValue = 255;

                        const dataFrame = presetDataFrame(DEVICE_NAME, toByteArray(LORAWAN_DATA_RATE_ADDRESS), toByteArray(automaticValue));

                        const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

                        const data = new Uint8Array(response.buffer).slice(7, 9);

                        const register = editableRegisters.value.find(r => r.name == 'LORAWAN_DATA_RATE') as Register;

                        register.data = _parseData(data);
                    }
                },
                {
                    text: 'Ok',
                    handler: async (alertData) => {

                        const dataFrame = presetDataFrame(DEVICE_NAME, toByteArray(LORAWAN_DATA_RATE_ADDRESS), toByteArray(parseInt(alertData.value)));

                        const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

                        const data = new Uint8Array(response.buffer).slice(7, 9);

                        const register = editableRegisters.value.find(r => r.name == 'LORAWAN_DATA_RATE') as Register;

                        register.data = _parseData(data);
                    }
                }
            ],
        });

        await alert.present();
    }

    async function sendPresetToReportInterval(): Promise<void> {
        const alert = await alertController.create({
            header: 'REPORT_INTERVAL',
            subHeader: 'modificar intervalo de reportes',
            message: 'rango 0 - 65535 SEGUNDOS',
            inputs: [
                {
                    name: 'value',
                    placeholder: editableRegisters.value.find(r => r.name == 'REPORT_INTERVAL')?.data,
                    label: 'nuevo valor',
                    type: 'number'
                }
            ],
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Ok',
                    handler: async (alertData) => {
                        const dataFrame = presetDataFrame(DEVICE_NAME, toByteArray(REPORT_INTERVAL_ADDRESS), toByteArray(parseInt(alertData.value)));

                        const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

                        const data = new Uint8Array(response.buffer).slice(7, 9);

                        const register = editableRegisters.value.find(r => r.name == 'REPORT_INTERVAL') as Register;

                        register.data = _parseData(data);
                    }
                }
            ],
        });

        await alert.present();
    }

    function _parseData(bytes: Uint8Array): number {
        return bytes[0] * 256 + bytes[1];
    }

    onMounted(async () => {

        const registers = await sendReadHoldingToEditableRegisters();

        const devEuiValue = await sendReadHoldingToDevEui();

        editableRegisters.value.push(...registers);

        devEui.value = devEuiValue;

    });

    return {
        DEFAULT_REGISTERS,
        editableRegisters,
        devEui
    }
}