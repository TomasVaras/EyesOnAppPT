import {
    BleClient, BleService,
    numbersToDataView, ScanResult
} from '@capacitor-community/bluetooth-le';
import { ref } from 'vue';
import { ConnectionError } from '@/errors/connectionErrors';

export function useBle() {

    const results = ref<ScanResult[]>([]);

    const services = ref<BleService[]>([]);

    const isScanning = ref(false);

    const disconnectByUser = ref<boolean>(false);

    async function scan(filter: string): Promise<void> {
        try {
            if (!isScanning.value) {
                results.value = [];
                isScanning.value = true;
                await BleClient.initialize();
                await BleClient.requestLEScan(
                    {
                        services: []
                    },
                    (result) => {
                        if (result.device.name?.includes(filter)) {
                            results.value = [result, ...results.value];
                        }
                    }
                );
                setTimeout(async () => {
                    isScanning.value = false;
                    await BleClient.stopLEScan();
                    console.log('stopped scanning');
                }, 15 * 1000);
            }
        } catch (error) {
            console.log(error);
        }
    }

    //6 a 8 para bateria

    function bytesToPSI(buffer: ArrayBuffer): number {
        const bytes = [...new Uint8Array(buffer.slice(0, 2))];
        const psi = bytes[0] * 256 + bytes[1];
        return psi;
    }

    async function isConnected(deviceId: string) {
        return (await BleClient.getConnectedDevices([])).find(device => device.deviceId == deviceId);
    }

    async function connect(deviceId: string, onDisconnect?: ((deviceId: string) => any)): Promise<void> {
        try {

            await BleClient.connect(deviceId, onDisconnect);

        } catch (error: any) {

            throw new ConnectionError(error.message);

        }
    }

    function disconnect(deviceId: string): void {
        BleClient.disconnect(deviceId);
    }

    async function writeToCharacteristicAndWaitForResponse(deviceId: string, service: string, writableChar: string, notiChar: string, data: Array<number>): Promise<DataView> {

        const responsePromise = new Promise<DataView>(resolve => {
            BleClient.startNotifications(deviceId, service, notiChar, value => {
                resolve(value);
            });
        });

        const dataView = numbersToDataView(data);

        await BleClient.write(deviceId, service, writableChar, dataView);

        const response = await responsePromise;

        await BleClient.stopNotifications(deviceId, service, notiChar);

        return response;
    }

    return {
        writeToCharacteristicAndWaitForResponse,
        disconnect,
        isConnected,
        connect,
        bytesToPSI,
        scan,
        disconnectByUser,
        services,
        isScanning,
        results
    }
}