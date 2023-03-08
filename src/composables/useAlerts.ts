import { alertController } from "@ionic/vue";
import { useRouter } from "vue-router";

export function useAlerts() {

    const router = useRouter(); 

    async function showError(message: string): Promise<void> {

        const alert = await alertController.create({
            header: 'ERROR',
            subHeader: 'Error al intentar acceder al sensor.',
            message: message,
            buttons: [{
                text: 'Ok',
                handler: () => router.replace('/')
            }]
        });

        await alert.present();
    }

    return {
        showError
    }
}