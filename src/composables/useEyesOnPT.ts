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

    const { writeToCharacteristic, writeToCharacteristicAndWaitForResponse } = useBle();

    const { toByteArray, readHoldingDataFrame, presetDataFrame } = useModbus();

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

    //visited registersg

    const devEui = ref<string>('');

    async function sendReadHoldingToEditableRegisters(): Promise<void> {
       
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
                handler: sendPresetToReportInterval
            },
            {
                data: data.slice(3, 4)[0],
                address: LORAWAN_CANAL_ADDRESS,
                name: 'LORAWAN_CANAL_LOW',
                handler: sendPresetToReportInterval
            },
            {
                data: _parseData(data.slice(4)),
                address: LORAWAN_DATA_RATE_ADDRESS,
                name: 'LORAWAN_DATA_RATE',
                handler: sendPresetToReportInterval
            }
        ];

        editableRegisters.value.push(...registers);
    }

    async function sendReadHoldingToDevEui(): Promise<void> {
       
        const dataFrame = readHoldingDataFrame(DEVICE_NAME, toByteArray(DEV_EUI_INITIAL_ADDRESS), EIGHT_REGISTERS);
        
        const response = await writeToCharacteristicAndWaitForResponse(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, NOTIFICATION_UUID_CHAR, dataFrame);

        const data = new Uint8Array(response.buffer).slice(6, 22);

        devEui.value = new TextDecoder().decode(data);
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
                }
            ],
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Ok',
                    handler: (alertData) => {
                        const dataFrame = presetDataFrame(DEVICE_NAME, toByteArray(REPORT_INTERVAL_ADDRESS), toByteArray(parseInt(alertData.value)));
                        writeToCharacteristic(DEVICE_ID, SERVICE_UUID_CHAR, WRITE_UUID_CHAR, dataFrame);
                    }
                }
            ],
        });

        await alert.present();
    }

    function _parseData(bytes: Uint8Array): number {
        return bytes[0] * 256 + bytes[1];
    }

    onMounted(() => {
        sendReadHoldingToEditableRegisters();
        sendReadHoldingToDevEui();
    });

    return {
        editableRegisters,
        devEui
    }
}