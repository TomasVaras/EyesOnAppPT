import {
    BleClient,
    ScanResult,
    numberToUUID,
    BleService,
    numbersToDataView,
    //BleDevice 
} from '@capacitor-community/bluetooth-le';
import { ref } from 'vue';

export function useBle() {

    const PT_SERVICE_TXRX_UUID = numberToUUID(0xffe0);

    const CONNECTION_STATE = {
        WAITING: 'WAITING',
        CONNECTED: 'CONNECTED',
        DISCONNECTED: 'DISCONNECTED'
    } as const;

    type ObjectValues<T> = T[keyof T];

    type ConnectionState = ObjectValues<typeof CONNECTION_STATE>;

    type DeviceConnectionState = Record<string, ConnectionState>;

    const results = ref<ScanResult[]>([]);

    //const connectedDevices = ref<BleDevice[]>([]);

    const services = ref<BleService[]>([]);

    const isScanning = ref(false);

    const connectionState = ref<ConnectionState>(CONNECTION_STATE.DISCONNECTED);

    const avaliableDevicesStates = ref<DeviceConnectionState>({});

    //podria hacer un hash map con el id de la carateristica y el valor de la caracteristica
    //const notificationValue = ref<NotificationValue>({});
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
                            //seteo el dispositivo con su estado de conexion
                            avaliableDevicesStates.value[result.device.deviceId] = 'DISCONNECTED';
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

    

    async function isConnected(deviceId: string): Promise<boolean> {
        await BleClient.initialize();
        return (await BleClient.getConnectedDevices([])).some(device => device.deviceId = deviceId);
    }

    function bytesToPSI(buffer: ArrayBuffer): number {
        const bytes = [...new Uint8Array(buffer.slice(0, 2))];
        const psi = bytes[0] * 256 + bytes[1];
        return psi;
    }

    function batteryCharge(buffer: ArrayBuffer): number {
        console.log(new Uint8Array(buffer));
        const bytes = [...new Uint8Array(buffer.slice(12))];
        console.log(bytes);
        const charge = (bytes[0] * 256 + bytes[1]) / 1000;
        return charge;
    }

    function _changeConnectionState(deviceId: string, state: ConnectionState): void {
        //connectionState.value = state;
        avaliableDevicesStates.value[deviceId] = state;
    }

    function connect(deviceId: string): void {
        _changeConnectionState(deviceId, 'WAITING');
        BleClient.connect(deviceId, () =>
            _changeConnectionState(deviceId, 'DISCONNECTED'))
            .then(() => _changeConnectionState(deviceId, 'CONNECTED'))
            .catch(() => _changeConnectionState(deviceId, 'DISCONNECTED'));
    }

    function disconnect(deviceId: string): void {
        BleClient.disconnect(deviceId).then(() => _changeConnectionState(deviceId, 'DISCONNECTED'));
        //connectedDevices.value = connectedDevices.value?.filter(device => device.deviceId != deviceId);
    }

    async function listServices(deviceId: string): Promise<void> {
        services.value = (await BleClient.getServices(deviceId)).filter(bleService => bleService.uuid == PT_SERVICE_TXRX_UUID);
    }

    async function readCharacteristic(deviceId: string, service: string, charateristic: string): Promise<DataView> {
        return await BleClient.read(deviceId, service, charateristic);
    }

    async function writeToCharacteristic(deviceId: string, service: string, characteristic: string, data: Array<number>): Promise<void> {
        const dataView = numbersToDataView(data);
        await BleClient.write(deviceId, service, characteristic, dataView);
    }

    async function listenToNotifications(deviceId: string, service: string, characteristic: string, callback: (value: DataView) => void) {
        await BleClient.startNotifications(deviceId, service, characteristic, callback);
    }

    async function writeToCharacteristicAndWaitForResponse(deviceId: string, service: string, writableChar: string, notiChar: string, data: Array<number>): Promise<DataView> {
        try {
            const responsePromise = new Promise<DataView>(resolve => {
                listenToNotifications(deviceId, service, notiChar, value => {
                    resolve(value);
                });
            });

            const writePromise = writeToCharacteristic(deviceId, service, writableChar, data);

            const timeoutPromise = new Promise<DataView>((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Timeout after ${5000}ms`));
                }, 5000);
            });

            await Promise.race([writePromise, timeoutPromise]);

            const response = await Promise.race([responsePromise, timeoutPromise]);

            if (response instanceof DataView) {
                await BleClient.stopNotifications(deviceId, service, notiChar);
                return response;
            } else {
                throw response; // Rethrow the timeout error
            }
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    return {
        writeToCharacteristicAndWaitForResponse,
        //getConnectedDevices,
        batteryCharge,
        listenToNotifications,
        isConnected,
        writeToCharacteristic,
        readCharacteristic,
        listServices,
        disconnect,
        connect,
        bytesToPSI,
        scan,
        avaliableDevicesStates,
        //connectedDevices,
        services,
        connectionState,
        isScanning,
        results
    }
}