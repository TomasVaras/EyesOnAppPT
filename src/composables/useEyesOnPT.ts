import { numberToUUID } from "@capacitor-community/bluetooth-le";
import { ref } from "vue";
import { useModbus } from "./useModbus";
import { useBle } from "./useBle";
import { onMounted } from "vue";
import { alertController } from "@ionic/vue";
import { useAlerts } from "./useAlerts";


export function useEyesOnPT(DEVICE_ID: string, DEVICE_NAME: string) {

    type Register = {
        name: string,
        address: number,
        data: any,
    };

    const { writeToCharacteristicAndWaitForResponse, connect } = useBle();

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

    const editableRegisters = ref<Register[]>([]);

    const devEui = ref<string>('');

    const disconnectByUser = ref<boolean>(false);

    async function sendReadHoldingToEditableRegisters(): Promise<void> {

        const dataFrame = readHoldingDataFrame(DEVICE_NAME, toByteArray(REPORT_INTERVAL_ADDRESS), THREE_REGISTERS);

        const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

        const data = new Uint8Array(response.buffer).slice(6, 12);

        const registers: Register[] = [
            {
                data: _parseData(data.slice(0, 2)),
                address: REPORT_INTERVAL_ADDRESS,
                name: 'REPORT_INTERVAL',
            },
            {
                data: data.slice(2, 3)[0],
                address: LORAWAN_CANAL_ADDRESS,
                name: 'LORAWAN_CANAL_HIGH',
            },
            {
                data: data.slice(3, 4)[0],
                address: LORAWAN_CANAL_ADDRESS,
                name: 'LORAWAN_CANAL_LOW',
            },
            {
                data: _parseData(data.slice(4)),
                address: LORAWAN_DATA_RATE_ADDRESS,
                name: 'LORAWAN_DATA_RATE',
            }
        ];

        editableRegisters.value = [...registers];
    }

    async function sendReadHoldingToDevEui(): Promise<void> {

        const dataFrame = readHoldingDataFrame(DEVICE_NAME, toByteArray(DEV_EUI_INITIAL_ADDRESS), EIGHT_REGISTERS);

        const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

        const data = new Uint8Array(response.buffer).slice(6, 22);

        devEui.value = new TextDecoder().decode(data);
    }

    async function writeToLorawanCanal(alertData: any, alert: HTMLIonAlertElement, canal: string): Promise<any> {

        const HIGH_LIMIT = 63;

        const LOW_LIMIT = 0;

        const validate = (value: string) => {

            const number = parseInt(value);

            if (!isNaN(number) && number < HIGH_LIMIT && number >= LOW_LIMIT) {
                return number;
            }

            throw new Error('Valor invalido!');
        };

        const dataFrame: number[] = [];

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

    async function writeReportInterval(value: string): Promise<void> {
        try {

            const dataFrame = presetDataFrame(DEVICE_NAME, toByteArray(REPORT_INTERVAL_ADDRESS), toByteArray(parseInt(value)));

            await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

        } catch (error: any) {

            throw new Error(error.message);
        }
    }

    function _parseData(bytes: Uint8Array): number {
        return bytes[0] * 256 + bytes[1];
    }

    onMounted(async () => {

        try {

            await connect(DEVICE_ID);

            await sendReadHoldingToEditableRegisters();

            await sendReadHoldingToDevEui();

        } catch (error: any) {

            console.log('anashie');

            showError(error);

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