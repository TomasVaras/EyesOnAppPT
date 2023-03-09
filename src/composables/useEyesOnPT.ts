import { numberToUUID } from "@capacitor-community/bluetooth-le";
import { ref } from "vue";
import { useModbus } from "./useModbus";
import { useBle } from "./useBle";
import { onMounted } from "vue";
import { alertController } from "@ionic/vue";
import router from "@/router";
import { Toast } from '@capacitor/toast';

export function useEyesOnPT(DEVICE_ID: string, DEVICE_NAME: string) {

    type Register = {
        name: string,
        address: number,
        data: any,
    };

    const { writeToCharacteristicAndWaitForResponse, isConnected } = useBle();

    const { toByteArray, readHoldingDataFrame, presetDataFrame } = useModbus();

    const { showError } = useAlerts();

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

    const LOW_LIMIT = 0;

    const REPORT_INTERVAL_LIMIT = 65535;

    const LORAWAN_CANAL_LIMIT = 63;

    const DATA_RATE_LIMIT = 5;

    const editableRegisters = ref<Register[]>([]);

    const devEui = ref<string>('');

    async function sendReadHoldingToEditableRegisters(): Promise<Register[]> {

        try {

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

        } catch (error: any) {

            throw new Error(error.message);

        }

    }

    function validateWriteValue(lowLimit: number, highLimit: number, value: string): boolean {

        const parsedValue = parseInt(value);

        if (!isNaN(parsedValue) && parsedValue <= highLimit && parsedValue >= lowLimit) {
            return true;
        }

        return false;
    }

    async function sendReadHoldingToDevEui(): Promise<void> {

        const dataFrame = readHoldingDataFrame(DEVICE_NAME, toByteArray(DEV_EUI_INITIAL_ADDRESS), EIGHT_REGISTERS);

        const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

        const data = new Uint8Array(response.buffer).slice(6, 22);

        devEui.value = new TextDecoder().decode(data);
    }

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
                        try {

                            if (await isConnected(DEVICE_ID)) {

                                if (validateWriteValue(LOW_LIMIT, LORAWAN_CANAL_LIMIT, alertData.value)) {

                                    const lowCanal = editableRegisters.value.find(r => r.name == 'LORAWAN_CANAL_LOW') as Register;

                                    const highCanal = editableRegisters.value.find(r => r.name == 'LORAWAN_CANAL_HIGH') as Register;

                                    const dataFrame = presetDataFrame(DEVICE_NAME, toByteArray(LORAWAN_CANAL_ADDRESS), [parseInt(alertData.value), lowCanal?.data]);

                                    const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

                                    const data = new Uint8Array(response.buffer).slice(7, 9);

                                    highCanal.data = data[0]; //high

                                    lowCanal.data = data[1]; //low

                                } else {

                                    alert.message = 'Valor invalido!';

                                    return false;

                                }


                            } else {

                                alert.dismiss();

                                await Toast.show({
                                    text: 'Se perdio la conexión con el dispositivo.',
                                    position: 'bottom'
                                });

                                router.replace('/');

                            }
                        } catch (error: any) {

                            alert.dismiss();

                            await Toast.show({
                                text: error.message,
                                position: 'bottom'
                            });

                            router.replace('/');

                        }
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

                        try {

                            if (await isConnected(DEVICE_ID)) {

                                if (validateWriteValue(LOW_LIMIT, LORAWAN_CANAL_LIMIT, alertData.value)) {

                                    const lowCanal = editableRegisters.value.find(r => r.name == 'LORAWAN_CANAL_LOW') as Register;

                                    const highCanal = editableRegisters.value.find(r => r.name == 'LORAWAN_CANAL_HIGH') as Register;

                                    const dataFrame = presetDataFrame(DEVICE_NAME, toByteArray(LORAWAN_CANAL_ADDRESS), [highCanal.data, parseInt(alertData.value)]);

                                    const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

                                    const data = new Uint8Array(response.buffer).slice(7, 9);

                                    highCanal.data = data[0]; //high

                                    lowCanal.data = data[1]; //low

                                } else {

                                    alert.message = 'Valor invalido!';
                                    return false;
                                }


                            } else {

                                alert.dismiss();

                                await Toast.show({
                                    text: 'Se perdio la conexión con el dispositivo',
                                    position: 'bottom'
                                });

                                router.replace('/');

                            }
                        } catch (error: any) {

                            alert.dismiss();

                            await Toast.show({
                                text: error.message,
                                position: 'bottom'
                            });

                            router.replace('/');

                        }
                    }
                }
            ],
        });

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

                        try {

                            if (await isConnected(DEVICE_ID)) {

                                const automaticValue = 255;

                                const dataFrame = presetDataFrame(DEVICE_NAME, toByteArray(LORAWAN_DATA_RATE_ADDRESS), toByteArray(automaticValue));

                                const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

                                const data = new Uint8Array(response.buffer).slice(7, 9);

                                const register = editableRegisters.value.find(r => r.name == 'LORAWAN_DATA_RATE') as Register;

                                register.data = _parseData(data);

                            } else {

                                alert.dismiss();

                                await Toast.show({
                                    text: 'Se perdio la conexión con el dispositivo',
                                    position: 'bottom'
                                });

                                router.replace('/');

                            }
                        } catch (error: any) {

                            alert.dismiss();

                            await Toast.show({
                                text: error.message,
                                position: 'bottom'
                            });

                            router.replace('/');

                        }

                    }
                },
                {
                    text: 'Ok',
                    handler: async (alertData) => {

                        try {

                            if (await isConnected(DEVICE_ID)) {

                                if (validateWriteValue(LOW_LIMIT, DATA_RATE_LIMIT, alertData.value)) {

                                    const dataFrame = presetDataFrame(DEVICE_NAME, toByteArray(LORAWAN_DATA_RATE_ADDRESS), toByteArray(parseInt(alertData.value)));

                                    const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

                                    const data = new Uint8Array(response.buffer).slice(7, 9);

                                    const register = editableRegisters.value.find(r => r.name == 'LORAWAN_DATA_RATE') as Register;

                                    register.data = _parseData(data);

                                } else {

                                    alert.message = 'Valor invalido!';
                                    return false;

                                }

                            } else {

                                alert.dismiss();

                                await Toast.show({
                                    text: 'Se perdio la conexión con el dispositivo',
                                    position: 'bottom'
                                });

                                router.replace('/');
                            }

                        } catch (error: any) {

                            alert.dismiss();

                            await Toast.show({
                                text: error.message,
                                position: 'bottom'
                            });

                            router.replace('/');

                        }

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

                        try {

                            if (await isConnected(DEVICE_ID)) {

                                if (validateWriteValue(LOW_LIMIT, REPORT_INTERVAL_LIMIT, alertData.value)) {

                                    const dataFrame = presetDataFrame(DEVICE_NAME, toByteArray(REPORT_INTERVAL_ADDRESS), toByteArray(parseInt(alertData.value)));

                                    const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

                                    const data = new Uint8Array(response.buffer).slice(7, 9);

                                    const register = editableRegisters.value.find(r => r.name == 'REPORT_INTERVAL') as Register;

                                    register.data = _parseData(data);
                                
                                } else {

                                    alert.message = 'Valor invalido!';
                                    return false;

                                } 

                            } else {

                                alert.dismiss();

                                await Toast.show({
                                    text: 'Se perdio la conexión con el dispositivo.',
                                    position: 'bottom'
                                });

                                router.replace('/');

                            }

                        } catch (error: any) {

                            alert.dismiss();

                            await Toast.show({
                                text: error.message,
                                position: 'bottom'
                            });

                            router.replace('/');

                        }

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

        try {

            const registers = await sendReadHoldingToEditableRegisters();

            const devEuiValue = await sendReadHoldingToDevEui();

            editableRegisters.value.push(...registers);

            devEui.value = devEuiValue;

        } catch (error: any) {

            await Toast.show({
                text: 'Error al leer registros.',
                position: 'bottom'
            });

            router.replace('/');

        }

    });

    return {
        writeReportInterval,
        sendReadHoldingToEditableRegisters,
        DEFAULT_REGISTERS,
        disconnectByUser,
        editableRegisters,
        devEui
    }
}