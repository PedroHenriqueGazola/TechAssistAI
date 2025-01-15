import { HttpClient } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { CardEquipmentComponent } from './components/card-equipment/card-equipment.component';
import { Equipment } from './equipments.type';

@Component({
  selector: 'app-equipments-page',
  templateUrl: 'equipments.page.html',
  styleUrls: ['equipments.page.scss'],
  standalone: true,
  imports: [IonicModule, CardEquipmentComponent, RouterLink],
})
export class EquipmentsPage {
  public isLoading = signal(true);

  public equipments = signal<Equipment[]>([]);

  public constructor(
    private readonly http: HttpClient,
    private readonly navController: NavController
  ) {}

  public async ionViewDidEnter() {
    this.isLoading.set(true);

    await this.loadEquipments();

    this.isLoading.set(false);
  }

  private async loadEquipments() {
    const response = await firstValueFrom(
      this.http.get<{ equipments: Equipment[] } | undefined>(
        environment.API_URL + '/equipments'
      )
    );

    this.equipments.set(response?.equipments || []);
  }

  public close(): void {
    this.navController.back();
  }
}
