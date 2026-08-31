import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  OnInit,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthUser, Conversation, ChatDestinationCard } from '../../data/models';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { NavigationService } from '../../services/navigation.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  templateUrl: './chat-widget.component.html',
})
export class ChatWidgetComponent implements OnInit, OnDestroy, OnChanges, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  @Input() user: AuthUser | null = null;
  @Input() openHistory = false;
  @Output() authClick = new EventEmitter<void>();

  isOpen = false;
  input = '';
  typing = false;
  msgCount = 0;
  suggestedChips: string[] = [];
  showHistory = false;

  conversations: Conversation[] = [];
  activeConv: Conversation | null = null;
  private subs: Subscription[] = [];
  private lastUserEmail: string | null = null;
  private shouldScroll = false;

  constructor(
    private chatService: ChatService,
    private auth: AuthService,
    private router: Router,
    public nav: NavigationService,
    private transloco: TranslocoService,
    private langService: LanguageService,
  ) {
    this.refreshSuggestedChips();
  }

  private refreshSuggestedChips(): void {
    const raw = this.transloco.translate('chat.suggestedChips');
    this.suggestedChips = Array.isArray(raw) ? (raw as string[]) : [];
  }

  ngOnInit(): void {
    this.subs.push(
      this.chatService.conversations$.subscribe(list => (this.conversations = list)),
      this.chatService.activeConversation$.subscribe(c => {
        this.activeConv = c;
        this.shouldScroll = true;
      }),
      this.chatService.isTyping$.subscribe(isTyping => {
        this.typing = isTyping;
        if (isTyping) this.shouldScroll = true;
      }),
      this.auth.user$.subscribe(user => {
        const email = user?.email ?? null;
        if (email !== this.lastUserEmail) {
          this.lastUserEmail = email;
          if (email) {
            this.chatService.setUser(email);
            this.showHistory = false;
            if (!this.activeConv) {
              this.chatService.newConversation();
            }
          } else {
            this.chatService.setUser(null);
            this.showHistory = false;
            if (!this.activeConv) {
              this.chatService.newConversation();
            }
          }
        }
      })
    );

    // If no active conversation yet, initialize a fresh one
    if (!this.activeConv) {
      this.chatService.newConversation();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['openHistory'] && this.openHistory) {
      this.isOpen = true;
      this.showHistory = true;
    }
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.shouldScroll = true;
    }
  }

  startNewConversation(): void {
    this.chatService.newConversation();
    this.showHistory = false;
    this.shouldScroll = true;
  }

  openConversation(id: string): void {
    this.chatService.switchConversation(id);
    this.showHistory = false;
    this.shouldScroll = true;
  }

  deleteConversation(id: string, event: Event): void {
    event.stopPropagation();
    this.chatService.deleteConversation(id);
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
  }

  send(text?: string): void {
    const msg = (text ?? this.input).trim();
    if (!msg) return;

    if (!this.activeConv) {
      this.chatService.newConversation();
    }

    if (!this.user && this.msgCount >= 10) return;

    this.chatService.sendMessage(msg);
    this.input = '';
    this.msgCount++;
    this.shouldScroll = true;
  }

  get currentMessages() {
    return this.activeConv?.messages ?? [];
  }

  goToDestination(card: ChatDestinationCard): void {
    if (card.id) {
      this.isOpen = false;
      this.router.navigate(['/detail', card.id]);
    }
  }

  formatMessage(text: string): string {
    if (!text) return '';
    // Simple safe markdown formatting
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^-\s+(.*)$/gm, '• $1')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
    return formatted;
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }

  categoryLabel(cat?: string): string {
    return this.langService.getCategoryLabel(cat);
  }

  typeLabel(type?: string): string {
    return this.langService.getTypeLabel(type);
  }
}
