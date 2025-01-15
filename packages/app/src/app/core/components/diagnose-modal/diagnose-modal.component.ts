import { Component, Input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { environment } from 'src/environments/environment.prod';
import { AuthenticationService } from '../../services/authentication/authentication.service';

@Component({
  selector: 'app-diagnose-modal-component',
  templateUrl: 'diagnose-modal.component.html',
  styleUrls: ['diagnose-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, ReactiveFormsModule],
})
export class DiagnoseModalComponent {
  @Input() equipmentId!: string;

  public diagnoseControl = new FormControl();
  public diagnose = signal<string | null>(null);

  public constructor(private modalController: ModalController, private readonly authenticationService: AuthenticationService) {}

  public async onDiagnose() {
    this.diagnose.set(null);

    const authenticatedUser = await this.authenticationService.getAuthenticatedUser();
    const url = `${environment.API_URL}/tech-assist/diagnose`;

    const body = {
      description: this.diagnoseControl.value,
      equipmentId: this.equipmentId,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authenticatedUser.token}`,
      },
      body: JSON.stringify(body),
    });

    if (response.ok && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const readStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const text = new TextDecoder().decode(value);
          for (const char of text) {
            this.diagnose.update((current) => (current || '') + char);

            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        }
      };

      readStream().catch((error) => {
        console.error('Failed to read stream:', error);
      });
    } else {
      console.error('Failed to start diagnosis:', response.statusText);
    }
  }

  public cancel() {
    return this.modalController.dismiss(null, 'cancel');
  }

  public confirm() {
    return this.modalController.dismiss(null, 'confirm');
  }
}
