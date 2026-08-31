import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TranslocoService } from '@jsverse/transloco';
import { ChatMsg, Conversation, ChatDestinationCard } from '../data/models';

const STORAGE_KEY = 'vt_chat_conversations';
const AI_CHAT_API_URL = '/api/chat';

export interface ChatApiResponse {
  reply: string;
  suggestions: ChatDestinationCard[];
  quick_questions: string[];
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  conversations$ = this.conversationsSubject.asObservable();

  private activeConversationSubject = new BehaviorSubject<Conversation | null>(null);
  activeConversation$ = this.activeConversationSubject.asObservable();

  private isTypingSubject = new BehaviorSubject<boolean>(false);
  isTyping$ = this.isTypingSubject.asObservable();

  private userEmail: string | null = null;

  constructor(private http: HttpClient, private transloco: TranslocoService) {}

  get activeConversation(): Conversation | null {
    return this.activeConversationSubject.value;
  }

  get conversations(): Conversation[] {
    return this.conversationsSubject.value;
  }

  setUser(email: string | null): void {
    this.userEmail = email;
    if (email) {
      this.loadConversations();
    } else {
      this.conversationsSubject.next([]);
      this.activeConversationSubject.next(null);
    }
  }

  private storageKey(): string {
    return `${STORAGE_KEY}_${this.userEmail}`;
  }

  private loadConversations(): void {
    if (!this.userEmail) return;
    try {
      const raw = localStorage.getItem(this.storageKey());
      const list: Conversation[] = raw ? JSON.parse(raw) : [];
      list.forEach(c => (c.updatedAt = new Date(c.updatedAt)));
      this.conversationsSubject.next(list);
      if (list.length > 0) {
        this.activeConversationSubject.next(list[0]);
      } else {
        this.activeConversationSubject.next(null);
      }
    } catch {
      this.conversationsSubject.next([]);
      this.activeConversationSubject.next(null);
    }
  }

  private persist(): void {
    if (!this.userEmail) return;
    localStorage.setItem(this.storageKey(), JSON.stringify(this.conversations));
  }

  newConversation(): Conversation {
    const conv: Conversation = {
      id: 'conv_' + Date.now(),
      title: this.transloco.translate('chat.newConversation'),
      messages: [
        {
          id: Date.now(),
          role: 'bot',
          text: this.transloco.translate('chat.yasmineWelcome'),
          quickQuestions: [
            this.transloco.translate('chat.qqTunis'),
            this.transloco.translate('chat.qqDjerba'),
            this.transloco.translate('chat.qqDesert'),
            this.transloco.translate('chat.qqSousse'),
          ],
        },
      ],
      updatedAt: new Date(),
    };
    const list = [conv, ...this.conversations];
    this.conversationsSubject.next(list);
    this.activeConversationSubject.next(conv);
    this.persist();
    return conv;
  }

  switchConversation(id: string): void {
    const conv = this.conversations.find(c => c.id === id);
    if (conv) {
      this.activeConversationSubject.next(conv);
    }
  }

  deleteConversation(id: string): void {
    const list = this.conversations.filter(c => c.id !== id);
    this.conversationsSubject.next(list);
    if (this.activeConversation?.id === id) {
      this.activeConversationSubject.next(list.length > 0 ? list[0] : null);
    }
    this.persist();
  }

  sendMessage(text: string): void {
    const conv = this.activeConversation;
    if (!conv || !text.trim()) return;

    // 1. Append user message
    const userMsgText = text.trim();
    conv.messages.push({ id: Date.now(), role: 'user', text: userMsgText });
    this.autoTitle(conv, userMsgText);
    conv.updatedAt = new Date();
    this.sortAndUpdate();

    // 2. Format history for RAG Gemini API
    const historyPayload = conv.messages
      .filter(m => m.text && m.text !== userMsgText)
      .slice(-6)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.text,
      }));

    this.isTypingSubject.next(true);

    const payload = {
      message: userMsgText,
      history: historyPayload,
      language: this.transloco.getActiveLang(),
    };

    this.http
      .post<ChatApiResponse>(AI_CHAT_API_URL, payload)
      .pipe(
        catchError(err => {
          console.error('[ChatService] Error calling RAG Chatbot API:', err);
          return of<ChatApiResponse>({
            reply: this.transloco.translate('chat.errorReply'),
            suggestions: [],
            quick_questions: [
              this.transloco.translate('chat.qqTunis'),
              this.transloco.translate('chat.qqDjerbaTips'),
              this.transloco.translate('chat.qqCircuit3d'),
            ],
          });
        }),
        tap(res => {
          this.isTypingSubject.next(false);
          const botMsg: ChatMsg = {
            id: Date.now(),
            role: 'bot',
            text: res.reply,
            suggestions: res.suggestions || [],
            quickQuestions: res.quick_questions || [],
          };
          conv.messages.push(botMsg);
          conv.updatedAt = new Date();
          this.sortAndUpdate();
        })
      )
      .subscribe();
  }

  private autoTitle(conv: Conversation, firstUserMsg: string): void {
    if (conv.messages.filter(m => m.role === 'user').length === 1) {
      conv.title = firstUserMsg.length > 35 ? firstUserMsg.substring(0, 35) + '…' : firstUserMsg;
    }
  }

  private sortAndUpdate(): void {
    const list = [...this.conversations];
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    this.conversationsSubject.next(list);
    this.activeConversationSubject.next(
      list.find(c => c.id === this.activeConversation?.id) ?? null
    );
    this.persist();
  }
}
