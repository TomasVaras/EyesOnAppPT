<template>
    <ion-page>
        <ion-header :translucent="true">
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-menu-button color="primary"></ion-menu-button>
                </ion-buttons>
                <ion-title>Dispositivos conectados</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content :fullscreen="true">
            <ion-list>
                <ion-item v-for="device in connectedDevices" :key="device.deviceId">
                    <ion-label>{{ device.name }}</ion-label>
                    <ion-button slot="end" color="danger" @click="disconnect(device.deviceId)">
                        <ion-icon slot="icon-only" :icon="close"></ion-icon>
                    </ion-button>
                    <ion-button slot="end" :href="`/sensor/services/${device.deviceId}`">
                        <ion-icon slot="icon-only" :icon="open"></ion-icon>
                    </ion-button>
                </ion-item>
            </ion-list>
        </ion-content>
    </ion-page>
</template>

<script setup lang="ts">
import {
    IonPage,
    IonContent,
    IonIcon,
    IonButton,
    IonItem,
    IonLabel,
    IonList,
    IonHeader,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonToolbar,
} from '@ionic/vue';
import { useBle } from '@/composables/useBle';
import { onMounted } from 'vue';
import { close, open } from 'ionicons/icons';

const { connectedDevices, getConnectedDevices, disconnect } = useBle();

onMounted(() => getConnectedDevices());
</script>