<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button color="primary"></ion-menu-button>
        </ion-buttons>
        <ion-title>{{ /*$route.params.id*/ getSensorNameFilter() }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-list>
        <ion-item v-for="res in results" :key="res.device.deviceId">
          <ion-label>
            <h1>{{ res.device.name }}</h1>
            <p>presión: {{ bytesToPSI(res.manufacturerData!['0'].buffer) + ' psi'/*mepa que es asi*/ }}</p>
            <p>carga de bateria: {{ batteryCharge(res.manufacturerData!['0'].buffer) }} volts</p>
          </ion-label>
          <ion-button slot="end" v-if="avaliableDevicesStates[res.device.deviceId] == 'DISCONNECTED'" @click="connect(res.device.deviceId)">
            <ion-icon slot="icon-only" :icon="bluetooth"></ion-icon>
          </ion-button>
          <template v-else-if="avaliableDevicesStates[res.device.deviceId] == 'CONNECTED'">
            <ion-button slot="end" color="danger" @click="disconnect(res.device.deviceId)">
              <ion-icon slot="icon-only" :icon="close"></ion-icon>
            </ion-button>
            <ion-button slot="end" :href="`/sensor/registers/${res.device.name}/${res.device.deviceId}`">
              <ion-icon slot="icon-only" :icon="open"></ion-icon>
            </ion-button>
          </template>
          <ion-spinner slot="end" v-else name="crescent"></ion-spinner>
        </ion-item>
      </ion-list>
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="primary" @click="scan(getSensorNameFilter())">
          <ion-icon v-if="!isScanning" :icon="search"></ion-icon>
          <ion-spinner v-else name="crescent"></ion-spinner>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonSpinner,
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonFab,
  IonFabButton
} from '@ionic/vue';
import { useBle } from '@/composables/useBle';
import { bluetooth, open, close, search } from 'ionicons/icons';
import { useRoute } from 'vue-router';
const route = useRoute();

const {
  scan,
  connect,
  bytesToPSI,
  batteryCharge,
  disconnect,
  avaliableDevicesStates,
  results,
  isScanning,
} = useBle();

function getSensorNameFilter(): string {
  const { filter } = route.params;
  return filter as string;
}
</script>

<style scoped>
#container {
  text-align: center;
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

#container strong {
  font-size: 20px;
  line-height: 26px;
}

#container p {
  font-size: 16px;
  line-height: 22px;
  color: #8c8c8c;
  margin: 0;
}

#container a {
  text-decoration: none;
}
</style>
