import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardDataService } from '../../shared/services/dashboard-data.service';

interface AgentMessage {
  role: 'user' | 'assistant';
  text: string;
  products?: { id: string; title: string; price: number; currency: string }[];
}

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agents.component.html'
})
export class AgentsComponent {
  public country: 'CL' = 'CL';
  public mode: 'sales' | 'support' = 'sales';
  public message = '';
  public isSending = false;
  public error = '';
  public messages: AgentMessage[] = [];

  constructor(private dataService: DashboardDataService) {}

  public sendMessage(): void {
    const text = this.message.trim();
    if (!text || this.isSending) return;

    const history = this.messages.slice(-8).map(({ role, text: content }) => ({
      role,
      text: content
    }));
    this.messages = [...this.messages, { role: 'user', text }];
    this.message = '';
    this.error = '';
    this.isSending = true;

    this.dataService.sendAgentMessage(text, this.country, this.mode, history).subscribe({
      next: response => {
        this.messages = [...this.messages, {
          role: 'assistant',
          text: response.reply,
          products: response.products
        }];
        this.isSending = false;
      },
      error: error => {
        this.error = error.error?.error || 'No se pudo contactar al agente.';
        this.isSending = false;
      }
    });
  }
}
