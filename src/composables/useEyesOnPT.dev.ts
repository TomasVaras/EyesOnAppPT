import { numberToUUID } from "@capacitor-community/bluetooth-le";
import { ref } from "vue";
import { useBle } from "./useBle";
import { useModbus } from "./useModbus";

export function useEyesOnPT(DEVICE_ID: string, DEVICE_NAME: string) {

    // composables

    const { writeToCharacteristicAndWaitForResponse, isConnected } = useBle();

    const { toByteArray, readHoldingDataFrame, presetDataFrame } = useModbus();

    // types

    type Register = { name: string; value?: number | string; handler?: () => Promise<void> };

    const REGISTERS: Register[] = [ 
        { name: 'REPORT_INTERVAL' }, 
        { name: 'LORAWAN_CANAL_HIGH' }, 
        { name: 'LORAWAN_CANAL_LOW' }, 
        { name: 'LORAWAN_DATA_RATE' },
        { name: 'APP_EUI', value: '753778214125442A' },
        { name: 'APP_KEY', value: 'ACB46E292A52432381A8AF5B14E5E3AE' } 
    ];

    // addresses

    const DEV_EUI_INITIAL_ADDRESS = 3010;

    const REPORT_INTERVAL_ADDRESS = 4004;

    const LORAWAN_CANAL_ADDRESS = 4005;

    const LORAWAN_DATA_RATE_ADDRESS = 4006;

    // services

    const SERVICE_UUID_CHAR = numberToUUID(0xffe0);

    // characteristics

    const WRITE_UUID_CHAR = numberToUUID(0xffe9)

    const NOTIFICATION_UUID_CHAR = numberToUUID(0xffe4);

    // input limits

    const LOW_LIMIT = 0;

    const REPORT_INTERVAL_LIMIT = 65535;

    const LORAWAN_CANAL_LIMIT = 63;

    const DATA_RATE_LIMIT = 5;

    // default registers

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

    // registers (refs, because i have to show them to the view)
    
    const EDITABLE_REGISTERS = ref<Register[]>();

    const DEV_EUI = ref<string>();


}