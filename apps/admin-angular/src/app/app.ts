

// apps/admin-angular/src/app/app.ts
import { Component } from '@angular/core'; // Para el error TS2552
import { RouterOutlet } from '@angular/router'; // Para el error TS2304
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html'
})
export class AppComponent { // <--- ASEGÚRATE DE QUE DIGA "export class"
  title = 'admin-angular';
}