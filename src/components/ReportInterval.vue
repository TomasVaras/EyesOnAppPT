<template>
    <ion-content class="ion-padding">
        <ion-modal :is-open="showModal" @willDismiss="onWillDismiss">
            <ion-header>
                <ion-toolbar>
                    <ion-buttons slot="start">
                        <ion-button @click="closeModal">Cancel</ion-button>
                    </ion-buttons>
                    <ion-title>{{ input }}</ion-title>
                    <ion-buttons slot="end">
                        <ion-button :strong="true" @click="writeReportInterval(input)">Confirm</ion-button>
                    </ion-buttons>
                </ion-toolbar>
            </ion-header>
            <ion-content class="ion-padding">
                <ion-item>
                    <ion-label position="stacked">Enter your name</ion-label>
                    <ion-input v-model="input" type="text" placeholder="Your name"></ion-input>
                </ion-item>
            </ion-content>
        </ion-modal>
    </ion-content>
</template>


<script setup lang="ts">
import { ref, defineExpose } from 'vue';
import {
    IonButtons,
    IonButton,
    IonModal,
    IonHeader,
    IonContent,
    IonToolbar,
    IonTitle,
    IonItem,
    IonLabel,
    IonInput
} from '@ionic/vue';
import { useEyesOnPT } from '@/composables/useEyesOnPT';

const props = defineProps<{
    deviceId: string,
    deviceName: string,
    onWillDismiss: () => void
}>()

const { writeReportInterval } = useEyesOnPT(props.deviceId, props.deviceName);

const input = ref<string>('');

const showModal = ref<boolean>(false);

function closeModal() {
    showModal.value = false;
}

defineExpose({
    showModal
});
</script>