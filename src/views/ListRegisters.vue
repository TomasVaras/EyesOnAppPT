<template>
    <ion-page>
        <ion-header :translucent="true">
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-back-button defaultHref="/sensor/EyesOnPT"></ion-back-button>
                </ion-buttons>
                <ion-title>registros</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content :fullscreen="true">
            <ion-list>
                <ion-list-header>
                    <ion-label>
                        <h1>{{ route.params.name }}</h1>
                    </ion-label>
                </ion-list-header>
                <template v-if="editableRegisters.length != 0">
                    <ion-item v-for="(reg, index) in editableRegisters" button :key="index" @click="reg.handler">
                        <ion-label>
                            <h1>{{ reg.name }}</h1>
                            <p>valor: {{ reg.data }}</p>
                        </ion-label>
                    </ion-item>
                </template>
                <template v-else>
                    <ion-item v-for="(_, index) in Array(4)" :key="index">
                        <ion-label>
                            <ion-skeleton-text :animated="true" style="width: 70%;"></ion-skeleton-text>
                            <ion-skeleton-text :animated="true" style="width: 50%;"></ion-skeleton-text>
                        </ion-label>
                    </ion-item>
                </template>
                <ion-item v-if="devEui != ''">
                    <ion-label>
                        <h1>DEV_EUI</h1>
                        <p>{{ devEui }}</p>
                    </ion-label>
                </ion-item>
                <ion-item v-else>
                    <ion-label>
                        <ion-skeleton-text :animated="true" style="width: 70%;"></ion-skeleton-text>
                        <ion-skeleton-text :animated="true" style="width: 50%;"></ion-skeleton-text>
                    </ion-label>
                </ion-item>
                <ion-item v-for="reg in DEFAULT_REGISTERS" :key="reg.name">
                    <ion-label>
                        <h1>{{ reg.name }}</h1>
                        <p>{{ reg.value }}</p>
                    </ion-label>
                </ion-item>
            </ion-list>
            <ion-fab vertical="bottom" horizontal="end" slot="fixed">
                <ion-fab-button @click="copyConfigToClipboard">
                    <ion-icon  :icon="copy"></ion-icon>
                </ion-fab-button>
            </ion-fab>
        </ion-content>
    </ion-page>
</template>

<script setup lang="ts">
import { useEyesOnPT } from '@/composables/useEyesOnPT';
import { useRoute } from 'vue-router';
import {
    IonFab,
    IonFabButton,
    IonIcon,
    IonListHeader,
    IonSkeletonText,
    IonList,
    IonLabel,
    IonItem,
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
} from '@ionic/vue';
import { copy } from 'ionicons/icons';
import { onUnmounted } from 'vue';
import { useBle } from '@/composables/useBle';
import { Clipboard } from '@capacitor/clipboard';
import { Share } from '@capacitor/share';

const route = useRoute();

const deviceId = route.params.id as string;

const { disconnect } = useBle();

const { editableRegisters, devEui, DEFAULT_REGISTERS } = useEyesOnPT(route.params.id as string, route.params.name as string);

async function copyConfigToClipboard() {

    const onlyRegsData = editableRegisters.value.map(reg => ({ name: reg.name, value: reg.data })).concat(DEFAULT_REGISTERS);

    onlyRegsData.push({ name: 'DEV_EUI', value: devEui.value });

    const configInfo = {
        sensorName: route.params.name,
        info: onlyRegsData
    }; 

    const configs = JSON.stringify(configInfo);

    await Clipboard.write({ string: configs });

    const { value } = await Clipboard.read();

    await Share.share({
        title: 'Compartir',
        text: value,
        dialogTitle: 'Compartir configuración'
    });
}

onUnmounted(() => disconnect(deviceId))
</script>