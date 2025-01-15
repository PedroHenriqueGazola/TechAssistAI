import { HttpClient } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { DiagnoseModalComponent } from 'src/app/core/components/diagnose-modal/diagnose-modal.component';
import { environment } from 'src/environments/environment.prod';
import { Equipment } from '../equipments/equipments.type';

@Component({
  selector: 'app-equipment-page',
  templateUrl: 'equipment.page.html',
  styleUrls: ['equipment.page.scss'],
  standalone: true,
  imports: [IonicModule, ReactiveFormsModule],
})
export class EquipmentPage {
  public isLoading = signal<boolean>(true);
  public isCreating = signal<boolean>(false);

  public equipment = signal<Equipment | undefined>(undefined);
  public equipmentForm: FormGroup;

  public constructor(
    private readonly navController: NavController,
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly formBuilder: FormBuilder,
    private readonly modalCtrl: ModalController
  ) {
    this.equipmentForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: [''],
      serialNumber: ['', Validators.required],
    });
  }

  public async ionViewDidEnter() {
    this.isLoading.set(true);
    const equipmentId = this.route.snapshot.paramMap.get('id');
    if (!equipmentId) {
      this.isLoading.set(false);

      return;
    }

    await this.loadEquipment(equipmentId);
    this.populateForm();

    this.isLoading.set(false);
  }

  public close(): void {
    this.navController.back();
  }

  public async createEquipment() {
    this.isCreating.set(true);

    try {
      const equipment = this.equipmentForm.value;

      await firstValueFrom(
        this.http.post(environment.API_URL + '/equipments', equipment)
      );

      this.navController.back();
    } catch (error) {
      console.error(error);
    } finally {
      this.isCreating.set(false);
    }
  }

  public async openDiagnoseModal() {
    const modal = await this.modalCtrl.create({
      component: DiagnoseModalComponent,
      cssClass: 'tech-diagnose-modal',
      componentProps: {
        equipmentId: this.equipment()?.id,
      },
    });
    modal.present();

    await modal.onWillDismiss();
  }

  private async loadEquipment(equipmentId: string) {
    const response = await firstValueFrom(
      this.http.get<{ equipment: Equipment } | undefined>(
        environment.API_URL + '/equipments/' + equipmentId
      )
    );

    this.equipment.set(response?.equipment);
  }

  private populateForm() {
    if (!this.equipment()) {
      return;
    }

    const nameControl = this.equipmentForm.get('name');
    const descriptionControl = this.equipmentForm.get('description');
    const serialNumberControl = this.equipmentForm.get('serialNumber');

    nameControl?.setValue(this.equipment()?.name);
    nameControl?.disable();

    descriptionControl?.setValue(this.equipment()?.description);
    descriptionControl?.disable();

    serialNumberControl?.setValue(this.equipment()?.serialNumber);
    serialNumberControl?.disable();
  }
}
