import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-pages',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div>
      <main>
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class PagesComponent {}