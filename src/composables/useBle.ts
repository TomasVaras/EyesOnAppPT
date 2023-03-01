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

    /*async function getConnectedDevices() {
        await BleClient.initialize();
        connectedDevices.value.push(... await BleClient.getConnectedDevices([]));
    }*/

    function bytesToPSI(buffer: ArrayBuffer): number {
        const bytes = [...new Uint8Array(buffer.slice(0, 2))];
        const psi = bytes[0] * 256 + bytes[1];
        return psi;
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

        const responsePromise = new Promise<DataView>(resolve => {
            listenToNotifications(deviceId, service, notiChar, value => {
                resolve(value);
            });
        });

        await writeToCharacteristic(deviceId, service, writableChar, data);

        const response = await responsePromise;

        return response;
    }

    return {
        writeToCharacteristicAndWaitForResponse,
        //getConnectedDevices,
        listenToNotifications,
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